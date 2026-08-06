"use server";

import Papa from "papaparse";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { slugify } from "@/lib/slugify";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";

const BATCH_SIZE = 500; // ghi theo từng đợt 500 dòng — tránh 1 request quá lớn/quá lâu
const MAX_ROWS = 15000; // chặn sớm nếu file quá khổ, tránh treo cả trang trong lúc xử lý

function parseVariants(text) {
  return String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Mỗi thông số cách nhau bằng dấu ";", tên và giá trị cách nhau bằng dấu ":"
// VD cột "specs" trong CSV: "Bảo hành:6 tháng;Dung lượng:4500mAh"
function parseSpecs(text) {
  return String(text || "")
    .split(";")
    .map((part) => {
      const idx = part.indexOf(":");
      if (idx === -1) return null;
      const label = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      return label && value ? [label, value] : null;
    })
    .filter(Boolean);
}

// next.config.mjs chỉ khai báo cho next/image tối ưu ảnh từ ĐÚNG domain Supabase Storage của
// shop (xem next.config.mjs) — 1 dòng CSV lỡ dán link ảnh từ domain khác (Google, imgur...) sẽ
// khiến next/image ném lỗi "hostname not configured" NGAY LÚC RENDER, sập luôn cả trang chủ/
// danh mục chứa sản phẩm đó chứ không chỉ ảnh vỡ. Phải lọc bỏ link ngoài domain cho phép ngay ở
// bước đọc CSV này, không đợi tới lúc hiển thị mới phát hiện.
const ALLOWED_IMAGE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

function isAllowedImageUrl(url) {
  if (!ALLOWED_IMAGE_HOST) return false;
  try {
    return new URL(url).hostname === ALLOWED_IMAGE_HOST;
  } catch {
    return false;
  }
}

function parseImages(text) {
  const candidates = String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"));
  const images = candidates.filter(isAllowedImageUrl);
  return { images, droppedCount: candidates.length - images.length };
}

function toNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

// Đọc 1 giá trị theo nhiều tên cột có thể có (khớp cả tiêu đề tiếng Việt lẫn tiếng Anh),
// để người nhập không phải nhớ chính xác tên cột tiếng Anh.
function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
  }
  return "";
}

// Bước 1: chỉ ĐỌC và KIỂM TRA file CSV, KHÔNG ghi gì vào database — trả về danh sách đã phân
// tích để admin xem lại (tên/giá/danh mục/ảnh) trước khi thực sự lưu, tránh nhập nhầm hàng loạt
// mà không hay (vd giá sai đơn vị, ảnh sai link...).
export async function parseProductsCsv(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const file = formData.get("csvFile");
  if (!file || typeof file.text !== "function" || file.size === 0) {
    return { success: false, error: "Vui lòng chọn 1 file CSV để tải lên." };
  }

  let csvText;
  try {
    csvText = await file.text();
  } catch (e) {
    return { success: false, error: "Không đọc được nội dung file — hãy chắc chắn đây là file .csv." };
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows = parsed.data || [];
  if (rows.length === 0) {
    return { success: false, error: "File không có dữ liệu (hoặc thiếu dòng tiêu đề)." };
  }
  if (rows.length > MAX_ROWS) {
    return {
      success: false,
      error: `File có ${rows.length} dòng — vượt quá giới hạn ${MAX_ROWS.toLocaleString(
        "vi-VN"
      )} dòng/lần. Hãy chia nhỏ file rồi nhập thành nhiều lần.`,
    };
  }

  // Lấy trước danh sách slug danh mục hợp lệ — chặn sản phẩm gán vào danh mục không tồn tại.
  // Chỉ tính danh mục ĐANG thuộc 1 nhóm lớn (group_slug khác null) là hợp lệ — danh mục đã bị
  // gỡ khỏi menu (xem /admin/categories) không cho nhập sản phẩm mới vào nữa, tránh sản phẩm
  // vừa nhập xong đã "mất tích" khỏi trang chủ/mega menu.
  const { data: categories, error: catError } = await supabaseAdmin
    .from("categories")
    .select("slug, group_slug");
  if (catError) {
    return { success: false, error: `Lỗi tải danh mục để kiểm tra: ${catError.message}` };
  }
  const validCategorySlugs = new Set((categories || []).filter((c) => c.group_slug).map((c) => c.slug));

  const validRows = [];
  const rowErrors = [];

  rows.forEach((row, i) => {
    const lineNumber = i + 2; // dòng 1 là tiêu đề, dữ liệu tính từ dòng 2 cho khớp số dòng trong Excel

    const name = String(pick(row, ["name", "tên", "ten", "tên sản phẩm"])).trim();
    const code = String(pick(row, ["code", "mã", "ma", "mã sản phẩm"])).trim();
    const category = String(pick(row, ["category", "danh_muc", "danh muc", "danh mục"])).trim();
    const priceRaw = pick(row, ["price", "giá", "gia", "giá bán"]);

    if (!name) {
      rowErrors.push(`Dòng ${lineNumber}: thiếu tên sản phẩm — đã bỏ qua.`);
      return;
    }
    if (!code) {
      rowErrors.push(`Dòng ${lineNumber}: thiếu mã sản phẩm (code) — đã bỏ qua.`);
      return;
    }
    if (!category) {
      rowErrors.push(`Dòng ${lineNumber}: thiếu danh mục (category) — đã bỏ qua.`);
      return;
    }
    if (!validCategorySlugs.has(category)) {
      rowErrors.push(
        `Dòng ${lineNumber}: danh mục "${category}" không tồn tại (kiểm tra lại đúng slug trong /admin/categories) — đã bỏ qua.`
      );
      return;
    }

    const price = toNumber(priceRaw, NaN);
    if (!Number.isFinite(price) || price <= 0) {
      rowErrors.push(`Dòng ${lineNumber}: giá bán không hợp lệ ("${priceRaw}") — đã bỏ qua.`);
      return;
    }

    const rawSlug = String(pick(row, ["slug"])).trim();
    const slug = slugify(rawSlug || name);
    if (!slug) {
      rowErrors.push(`Dòng ${lineNumber}: không tạo được mã đường dẫn (slug) từ tên sản phẩm — đã bỏ qua.`);
      return;
    }

    const variants = parseVariants(pick(row, ["variants", "dòng máy", "dong may"]));
    const { images, droppedCount } = parseImages(pick(row, ["images", "ảnh", "anh", "hình ảnh"]));
    if (droppedCount > 0) {
      rowErrors.push(
        `Dòng ${lineNumber}: bỏ qua ${droppedCount} ảnh không phải link từ Supabase Storage của shop (ảnh domain khác sẽ làm lỗi hiển thị) — sản phẩm vẫn được nhập, chỉ thiếu ảnh đó.`
      );
    }
    const defaultVariantRaw = String(pick(row, ["default_variant", "dòng máy mặc định"])).trim();

    validRows.push({
      slug,
      code,
      name,
      price,
      old_price: toNumber(pick(row, ["old_price", "giá gốc"]), null),
      // Shop hiếm khi hết hàng nên không quản lý tồn kho theo từng dòng CSV — đặt cố định
      // 1 số lớn (giữ nguyên cơ chế chống bán vượt tồn kho trong place_order() phòng khi cần dùng lại).
      stock: 9999,
      category,
      brand: String(pick(row, ["brand", "hãng", "hang"])).trim() || null,
      variants,
      default_variant: defaultVariantRaw || variants[0] || null,
      specs: parseSpecs(pick(row, ["specs", "thông số", "thong so"])),
      images,
      image_url: images[0] || null,
    });
  });

  if (validRows.length === 0) {
    return {
      success: false,
      error: "Không có dòng nào hợp lệ để nhập — xem chi tiết lỗi bên dưới.",
      rowErrors: rowErrors.slice(0, 80),
      totalRows: rows.length,
    };
  }

  // Loại trùng slug NGAY TRONG FILE (dòng sau đè dòng trước) — tránh lỗi trùng khoá khi 2 dòng
  // trong cùng file lỡ trùng slug (VD: 2 sản phẩm cùng tên chưa đặt slug riêng).
  const bySlug = new Map();
  validRows.forEach((r) => bySlug.set(r.slug, r));
  const dedupedRows = Array.from(bySlug.values());

  return {
    success: true,
    rows: dedupedRows,
    totalRows: rows.length,
    skippedCount: rowErrors.length,
    rowErrors: rowErrors.slice(0, 80),
  };
}

// Bước 2: admin đã xem lại danh sách ở bước 1 (sửa được vài dòng nếu cần) và bấm xác nhận —
// giờ mới thực sự ghi vào database.
export async function commitProductsCsv(rows) {
  const authError = requireAdmin();
  if (authError) return authError;

  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: "Không có dữ liệu để lưu." };
  }

  let insertedCount = 0;
  const batchErrors = [];

  // upsert (không phải insert thường): nếu slug đã tồn tại thì CẬP NHẬT thay vì báo lỗi trùng —
  // nhờ vậy có thể chạy nhập lại nhiều lần (bổ sung/sửa dần dữ liệu) mà không sợ lỗi.
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin.from("products").upsert(batch, { onConflict: "slug" });

    if (error) {
      batchErrors.push(`Lô dòng ${i + 1}–${i + batch.length}: ${error.message}`);
    } else {
      insertedCount += batch.length;
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/");

  return {
    success: batchErrors.length === 0,
    insertedCount,
    batchErrors,
  };
}
