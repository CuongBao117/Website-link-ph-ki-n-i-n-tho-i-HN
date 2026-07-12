"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/adminAuth";

// Tìm sản phẩm gần đúng theo tên — dùng cho ô tìm kiếm khi ghép ảnh Zalo với sản phẩm
// đã có sẵn trong database (giá/mã hàng đã đúng từ trước, chỉ cần gắn thêm ảnh).
export async function searchProducts(query) {
  const authError = requireAdmin();
  if (authError) return { success: false, error: authError.error, results: [] };

  const q = (query || "").trim();
  if (!q) return { success: true, results: [] };

  const escaped = q.replace(/[%,]/g, "");
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("slug, name, price, code, images, image_url")
    .ilike("name", `%${escaped}%`)
    .order("name")
    .limit(8);

  if (error) {
    console.error("Lỗi tìm sản phẩm:", error.message);
    return { success: false, error: error.message, results: [] };
  }

  return { success: true, results: data || [] };
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

// Gắn 1 ảnh vào 1 sản phẩm ĐÃ CÓ SẴN (thêm vào cuối mảng ảnh hiện có, không xoá ảnh cũ).
export async function attachImageToProduct(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const slug = formData.get("slug")?.trim();
  const file = formData.get("image");
  if (!slug || !file || typeof file !== "object" || file.size === 0) {
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

  const url = await uploadOneImage(file, slug);
  if (!url) {
    return { success: false, error: "Tải ảnh lên thất bại, thử lại." };
  }

  const currentImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.image_url
    ? [product.image_url]
    : [];
  const newImages = [...currentImages, url];

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
  return { success: true, url };
}

// Tạo sản phẩm MỚI (chưa từng có trong database, chỉ mới thấy trên bài đăng Zalo) kèm luôn
// ảnh đầu tiên — dùng khi ô tìm kiếm không ra kết quả nào khớp trong lúc ghép ảnh hàng loạt.
export async function createProductWithImage(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const name = formData.get("name")?.trim();
  const priceRaw = formData.get("price");
  const category = formData.get("category")?.trim();
  const categoryCode = formData.get("categoryCode")?.trim() || "SP";
  const file = formData.get("image");

  const price = Number(priceRaw);
  if (!name || !Number.isFinite(price) || price <= 0 || !category) {
    return { success: false, error: "Thiếu tên, giá bán hợp lệ, hoặc danh mục." };
  }

  let slug = slugify(name);
  if (!slug) {
    return { success: false, error: "Không tạo được mã đường dẫn từ tên sản phẩm." };
  }

  // Nếu trùng slug với sản phẩm đã có (trùng tên) -> thêm hậu tố ngẫu nhiên để tránh lỗi trùng khoá.
  const { data: existing } = await supabaseAdmin.from("products").select("slug").eq("slug", slug).maybeSingle();
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const code = `${categoryCode}-${Date.now().toString(36).toUpperCase()}`;

  let images = [];
  if (file && typeof file === "object" && file.size > 0) {
    const url = await uploadOneImage(file, slug);
    if (url) images = [url];
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
