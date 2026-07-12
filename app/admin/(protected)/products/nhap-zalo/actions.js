"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/adminAuth";

// Bước chuẩn bị: nhận danh sách sản phẩm đã tách từ bài đăng Zalo (tên/giá/dòng máy — xem
// NhapZaloForm.js), tự tạo slug + mã sản phẩm, và QUAN TRỌNG: kiểm tra trùng slug với sản phẩm
// ĐÃ CÓ SẴN trong database trước khi commit.
//
// Lý do cần bước riêng này: hàm commitProductsCsv() (dùng chung với chức năng nhập CSV) ghi dữ
// liệu bằng upsert(onConflict: "slug") — nếu 1 sản phẩm mới vô tình trùng slug với sản phẩm cũ
// (trùng tên -> cùng 1 slug), nó sẽ ÂM THẦM GHI ĐÈ sản phẩm cũ thay vì tạo sản phẩm mới. Bước
// này né rủi ro đó bằng cách luôn hậu tố thêm ký tự ngẫu nhiên khi phát hiện trùng.
//
// Ngoài né ghi đè, còn CẢNH BÁO trùng để admin tự quyết định (có thể admin đang lỡ dán lại 1
// bài đã nhập trước đó, hoặc 2 bài dán trong cùng lô có tên giống nhau) — trả kèm mảng
// "duplicates" liệt kê tên/giá sản phẩm đã có sẵn khớp tên, để hiển thị cảnh báo ở bước xác
// nhận cuối, admin xem rồi mới bấm tạo (không tự động chặn, chỉ tự động chặn GHI ĐÈ).
export async function prepareZaloRows({ category, categoryCode, items }) {
  const authError = requireAdmin();
  if (authError) return authError;

  if (!category) return { success: false, error: "Thiếu danh mục." };
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Danh sách sản phẩm đang trống." };
  }

  const { data: existingProducts, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("slug, name, price");
  if (fetchError) {
    return { success: false, error: `Lỗi kiểm tra sản phẩm hiện có: ${fetchError.message}` };
  }
  const existingBySlug = new Map((existingProducts || []).map((p) => [p.slug, p]));
  const takenSlugs = new Set(existingBySlug.keys());
  const seenInBatch = new Map(); // baseSlug -> tên item xuất hiện trước trong CÙNG lô đang dán

  const rows = [];
  const duplicates = [];

  items.forEach((item, i) => {
    const baseSlug = slugify(item.name) || `sp-${Date.now()}-${i}`;
    const existingMatch = existingBySlug.get(baseSlug) || null;
    const batchMatchName = seenInBatch.get(baseSlug) || null;
    seenInBatch.set(baseSlug, item.name);

    let slug = baseSlug;
    if (takenSlugs.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    takenSlugs.add(slug);

    const variants = Array.isArray(item.variants) ? item.variants.filter(Boolean) : [];
    const code = `${categoryCode}-${Date.now().toString(36).toUpperCase()}${i}`;

    rows.push({
      slug,
      code,
      name: item.name,
      price: item.price,
      old_price: null,
      // Giống nhap-nhanh và import CSV: shop không quản lý tồn kho theo từng lượt nhập.
      stock: 9999,
      category,
      brand: null,
      variants,
      default_variant: variants[0] || null,
      specs: [],
      // Chưa gắn ảnh ở bước này — dùng "Gán ảnh hàng loạt" (đã có sẵn) ngay sau khi tạo xong.
      images: [],
      image_url: null,
    });

    if (existingMatch || batchMatchName) {
      duplicates.push({
        index: i,
        name: item.name,
        existingName: existingMatch?.name || null,
        existingPrice: existingMatch?.price ?? null,
        duplicateInSameBatch: batchMatchName,
      });
    }
  });

  return { success: true, rows, duplicates };
}
