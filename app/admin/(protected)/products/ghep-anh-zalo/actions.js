"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { ocrImageText } from "@/lib/ocr";
import { slugify } from "@/lib/slugify";

const MATCH_LIMIT = 5;

// Các dòng chữ kiểu giao diện Zalo (giờ đăng, nút Thích/Bình luận/Chia sẻ...) hay lẫn vào kết
// quả OCR — loại trước để không làm nhiễu bước tìm dòng tên sản phẩm.
const NOISE_LINE = /^(thích|bình luận|chia sẻ|xem thêm|trả lời|phút trước|giờ trước|ngày trước|tuần trước|\d+\s*(phút|giờ|ngày|tuần))/i;

// Từ toàn bộ chữ OCR đọc được trong 1 ảnh chụp màn hình (lẫn cả tên người đăng, giờ đăng, chữ
// nút bấm...), đoán dòng nào nhiều khả năng là TÊN sản phẩm nhất: bỏ các dòng rác đã biết, dòng
// quá ngắn, rồi lấy dòng DÀI NHẤT trong vài dòng đầu — caption tên sản phẩm thường dài hơn hẳn
// chữ giao diện xung quanh.
function pickNameCandidate(text) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && !NOISE_LINE.test(l));

  if (lines.length === 0) return "";
  return lines.slice(0, 6).sort((a, b) => b.length - a.length)[0];
}

// Bóc số + "k" ra khỏi chuỗi giá kiểu Zalo: "Sỉ 23k" -> 23000, "125.000đ" -> 125000.
// Giống hệt logic parsePrice() trong NhapZaloForm.js — cố tình KHÔNG import chung 1 file để
// không phải sửa file đã hoạt động ổn định, chỉ thêm mới.
function parsePrice(raw) {
  const s = String(raw || "").trim().toLowerCase();
  const hasK = /k\b/.test(s) || s.endsWith("k");
  const numMatch = s.replace(/[đdvnđ]/g, "").match(/[\d.,]+/);
  if (!numMatch) return null;
  let numStr = numMatch[0];
  numStr = hasK ? numStr.replace(/,/g, ".") : numStr.replace(/[.,]/g, "");
  const n = parseFloat(numStr);
  if (!Number.isFinite(n)) return null;
  return Math.round(hasK ? n * 1000 : n);
}

// Từ chữ OCR đọc được, tìm dòng ghi giá kiểu "Sỉ 23k" / "Giá 125.000đ" — nếu không thấy dòng rõ
// ràng thì quét cả khối tìm số+k đầu tiên (dự phòng, giống NhapZaloForm.js).
function pickPriceCandidate(text) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const priceMatch =
      line.match(/s[ỉi]\s*:?\s*([\d.,]+\s*k?)/iu) || line.match(/gi[áa]\s*:?\s*([\d.,]+\s*k?)/iu);
    if (priceMatch) {
      const price = parsePrice(priceMatch[1]);
      if (price !== null) return price;
    }
  }

  const fallback = String(text || "").match(/([\d.,]+\s*k)\b/iu);
  return fallback ? parsePrice(fallback[1]) : null;
}

// Đọc chữ (OCR) trong 1 ảnh chụp màn hình bài đăng Zalo, đoán tên + giá sản phẩm, rồi tìm các
// sản phẩm gần đúng nhất đã có sẵn trong database (so khớp mờ theo pg_trgm, xem migration_015).
export async function matchScreenshotText(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const file = formData.get("image");
  if (!file || typeof file === "string" || file.size === 0) {
    return { success: false, error: "Thiếu ảnh chụp màn hình." };
  }

  let text = "";
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await ocrImageText(buffer);
  } catch (err) {
    return { success: false, error: `Lỗi đọc chữ trong ảnh: ${err?.message || "không rõ nguyên nhân"}` };
  }

  const nameCandidate = pickNameCandidate(text);
  const ocrPrice = pickPriceCandidate(text);
  if (!nameCandidate) {
    return { success: true, text, nameCandidate: "", ocrPrice, candidates: [] };
  }

  const { data, error } = await supabaseAdmin.rpc("match_products_by_text", {
    search_text: nameCandidate,
    match_limit: MATCH_LIMIT,
  });

  if (error) {
    return { success: false, error: error.message, text, nameCandidate, ocrPrice };
  }

  return { success: true, text, nameCandidate, ocrPrice, candidates: data || [] };
}

async function uploadOneImage(file, slugForPath) {
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `${slugForPath}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("product-images")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });

  if (error) {
    console.error("Lỗi tải ảnh lên:", error.message);
    return null;
  }

  const { data } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
  return data?.publicUrl || null;
}

// Gắn NHIỀU ảnh (nhiều góc chụp cùng 1 sản phẩm) vào 1 sản phẩm ĐÃ CÓ SẴN trong 1 lần —
// thêm vào cuối mảng ảnh hiện có, không xoá ảnh cũ (giống nguyên tắc của "Gán ảnh hàng loạt").
// Nếu có kèm "price" hợp lệ (đọc được từ caption Zalo, khác giá hiện tại) thì cập nhật luôn giá.
export async function attachPhotosToProduct(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const slug = formData.get("slug")?.trim();
  const files = formData.getAll("images").filter((f) => typeof f === "object" && f.size > 0);
  const priceRaw = formData.get("price");
  if (!slug || files.length === 0) {
    return { success: false, error: "Thiếu sản phẩm hoặc ảnh." };
  }

  const { data: product, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("images, image_url")
    .eq("slug", slug)
    .maybeSingle();

  if (fetchError || !product) {
    return { success: false, error: fetchError?.message || "Không tìm thấy sản phẩm." };
  }

  const uploadedUrls = [];
  for (const file of files) {
    const url = await uploadOneImage(file, slug);
    if (url) uploadedUrls.push(url);
  }

  if (uploadedUrls.length === 0) {
    return { success: false, error: "Tải ảnh lên thất bại, thử lại." };
  }

  const currentImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.image_url
    ? [product.image_url]
    : [];
  const newImages = [...currentImages, ...uploadedUrls];

  const updatePayload = { images: newImages, image_url: newImages[0] };
  const newPrice = Number(priceRaw);
  if (priceRaw !== null && priceRaw !== "" && Number.isFinite(newPrice) && newPrice > 0) {
    updatePayload.price = newPrice;
  }

  const { error: updateError } = await supabaseAdmin
    .from("products")
    .update(updatePayload)
    .eq("slug", slug);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath(`/san-pham/${slug}`);
  return { success: true, uploadedCount: uploadedUrls.length };
}

// Tạo sản phẩm MỚI (không khớp sản phẩm nào có sẵn) kèm luôn (các) ảnh gốc đã ghép nhóm —
// dùng khi OCR + so khớp mờ không tìm ra sản phẩm đã có nào đủ tin cậy.
export async function createProductWithPhotos(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const name = formData.get("name")?.trim();
  const priceRaw = formData.get("price");
  const category = formData.get("category")?.trim();
  const categoryCode = formData.get("categoryCode")?.trim() || "SP";
  const files = formData.getAll("images").filter((f) => typeof f === "object" && f.size > 0);

  const price = Number(priceRaw);
  if (!name || !Number.isFinite(price) || price <= 0 || !category) {
    return { success: false, error: "Thiếu tên, giá bán hợp lệ, hoặc danh mục." };
  }

  let slug = slugify(name);
  if (!slug) {
    return { success: false, error: "Không tạo được mã đường dẫn từ tên sản phẩm." };
  }

  const { data: existing } = await supabaseAdmin.from("products").select("slug").eq("slug", slug).maybeSingle();
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const code = `${categoryCode}-${Date.now().toString(36).toUpperCase()}`;

  const images = [];
  for (const file of files) {
    const url = await uploadOneImage(file, slug);
    if (url) images.push(url);
  }

  const { error } = await supabaseAdmin.from("products").insert({
    slug,
    code,
    name,
    price,
    old_price: null,
    stock: 9999,
    category,
    brand: null,
    variants: [],
    default_variant: null,
    specs: [],
    images,
    image_url: images[0] || null,
  });

  if (error) {
    console.error("Lỗi tạo sản phẩm mới:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true, slug };
}
