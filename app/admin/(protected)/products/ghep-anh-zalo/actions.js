"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { ocrImageText } from "@/lib/ocr";

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

// Đọc chữ (OCR) trong 1 ảnh chụp màn hình bài đăng Zalo, đoán tên sản phẩm, rồi tìm các sản
// phẩm gần đúng nhất đã có sẵn trong database (so khớp mờ theo pg_trgm, xem migration_015).
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
  if (!nameCandidate) {
    return { success: true, text, nameCandidate: "", candidates: [] };
  }

  const { data, error } = await supabaseAdmin.rpc("match_products_by_text", {
    search_text: nameCandidate,
    match_limit: MATCH_LIMIT,
  });

  if (error) {
    return { success: false, error: error.message, text, nameCandidate };
  }

  return { success: true, text, nameCandidate, candidates: data || [] };
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
export async function attachPhotosToProduct(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const slug = formData.get("slug")?.trim();
  const files = formData.getAll("images").filter((f) => typeof f === "object" && f.size > 0);
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

  const { error: updateError } = await supabaseAdmin
    .from("products")
    .update({ images: newImages, image_url: newImages[0] })
    .eq("slug", slug);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath(`/san-pham/${slug}`);
  return { success: true, uploadedCount: uploadedUrls.length };
}
