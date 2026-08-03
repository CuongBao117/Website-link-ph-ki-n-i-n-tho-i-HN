"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { slugify } from "@/lib/slugify";

const MATCH_LIMIT = 5;

// OCR chạy THẲNG trong trình duyệt (xem components/GhepAnhZaloBatch.js), không qua Server Action
// nữa — chạy trên serverless function từng làm nó rất chậm/hay đứng, vì mỗi lần gọi phải khởi tạo
// lại engine Tesseract (tải lại dữ liệu ngôn ngữ) từ đầu, lặp lại cho từng ảnh một cách tuần tự.
// Server chỉ còn lo so khớp/lưu dữ liệu — phần đọc chữ CPU-nặng để trình duyệt người dùng tự làm,
// dùng lại 1 worker cho cả lô ảnh.

// So khớp mờ (fuzzy, pg_trgm — xem migration_015) 1 tên sản phẩm với các sản phẩm ĐÃ CÓ SẴN.
export async function matchProductByName(name) {
  const authError = requireAdmin();
  if (authError) return authError;

  const text = (name || "").trim();
  if (!text) return { success: true, candidates: [] };

  const { data, error } = await supabaseAdmin.rpc("match_products_by_text", {
    search_text: text,
    match_limit: MATCH_LIMIT,
  });

  if (error) return { success: false, error: error.message, candidates: [] };
  return { success: true, candidates: data || [] };
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

// Gắn NHIỀU ảnh (nhiều góc chụp cùng 1 sản phẩm) vào 1 sản phẩm ĐÃ CÓ SẴN trong 1 lần — thêm vào
// cuối mảng ảnh hiện có, không xoá ảnh cũ (giống nguyên tắc của "Gán ảnh hàng loạt"). Nếu có kèm
// "price" hợp lệ (khác giá đang lưu — admin đã tự xác nhận ở bước xem trước vì giá đọc từ caption
// khác giá cũ) thì cập nhật giá luôn trong cùng 1 lần lưu.
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
    .select("images, image_url, price")
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

  const update = { images: newImages, image_url: newImages[0] };
  const price = Number(priceRaw);
  if (priceRaw !== null && Number.isFinite(price) && price > 0 && price !== product.price) {
    update.price = price;
  }

  const { error: updateError } = await supabaseAdmin.from("products").update(update).eq("slug", slug);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath(`/san-pham/${slug}`);
  return { success: true, uploadedCount: uploadedUrls.length };
}

// Không có sản phẩm nào khớp đủ tốt trong database -> TỰ ĐỘNG TẠO MỚI kèm luôn (các) ảnh chụp màn
// hình cùng nhóm (cùng 1 caption = cùng 1 sản phẩm), khỏi phải tạo xong rồi qua "Gán ảnh hàng loạt" riêng.
export async function createProductWithPhotos(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const name = formData.get("name")?.trim();
  const price = Number(formData.get("price"));
  const category = formData.get("category")?.trim();
  const categoryCode = formData.get("categoryCode")?.trim() || "SP";
  const files = formData.getAll("images").filter((f) => typeof f === "object" && f.size > 0);

  if (!name) return { success: false, error: "Thiếu tên sản phẩm." };
  if (!Number.isFinite(price) || price <= 0) return { success: false, error: "Giá bán không hợp lệ." };
  if (!category) return { success: false, error: "Thiếu danh mục." };
  if (files.length === 0) return { success: false, error: "Thiếu ảnh." };

  const baseSlug = slugify(name) || `sp-${Date.now()}`;
  const { data: clash } = await supabaseAdmin.from("products").select("slug").eq("slug", baseSlug).maybeSingle();
  const slug = clash ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug;
  const code = `${categoryCode}-${Date.now().toString(36).toUpperCase()}`;

  const uploadedUrls = [];
  for (const file of files) {
    const url = await uploadOneImage(file, slug);
    if (url) uploadedUrls.push(url);
  }
  if (uploadedUrls.length === 0) {
    return { success: false, error: "Tải ảnh lên thất bại, thử lại." };
  }

  const { error } = await supabaseAdmin.from("products").insert({
    slug,
    code,
    name,
    price,
    old_price: null,
    // Giống nhap-zalo và import CSV: shop không quản lý tồn kho theo từng lượt nhập.
    stock: 9999,
    category,
    brand: null,
    variants: [],
    default_variant: null,
    specs: [],
    images: uploadedUrls,
    image_url: uploadedUrls[0],
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true, slug, uploadedCount: uploadedUrls.length };
}
