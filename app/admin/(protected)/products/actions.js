"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/slugify";
import { isAdminAuthed, requireAdmin } from "@/lib/adminAuth";
import { parsePriceOptionsText } from "@/lib/priceOptions";
import { uploadProductImage } from "@/lib/imageUpload";


function parseVariants(text) {
  return (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSpecs(text) {
  return (text || "")
    .split("\n")
    .map((line) => line.split("|").map((s) => s.trim()))
    .filter((pair) => pair.length === 2 && pair[0] && pair[1]);
}

// Tải NHIỀU ảnh sản phẩm lên Supabase Storage (bucket "product-images"), trả về mảng URL công khai.
// Ảnh nào lỗi sẽ bị bỏ qua (log lại), không chặn việc lưu sản phẩm.
async function uploadProductImages(files, slug) {
  const validFiles = (files || []).filter((f) => f && typeof f === "object" && f.size > 0);
  if (validFiles.length === 0) return [];

  const uploads = await Promise.all(validFiles.map((file, i) => uploadProductImage(file, slug, i)));
  return uploads.filter(Boolean);
}

function parseKeepImages(text) {
  try {
    const parsed = JSON.parse(text || "[]");
    return Array.isArray(parsed) ? parsed.filter((u) => typeof u === "string" && u) : [];
  } catch {
    return [];
  }
}

async function buildProductPayload(formData, slug) {
  const variants = parseVariants(formData.get("variants"));
  const oldPriceRaw = formData.get("oldPrice");

  // Ảnh giữ lại (từ ảnh cũ, người dùng có thể đã xoá bớt) + ảnh mới tải lên, theo đúng thứ tự hiển thị.
  const keepImages = parseKeepImages(formData.get("keepImages"));
  const newImageFiles = formData.getAll("newImages");
  const uploadedUrls = await uploadProductImages(newImageFiles, slug);
  const images = [...keepImages, ...uploadedUrls];

  // Shop hiếm khi hết hàng nên không quản lý tồn kho theo từng sản phẩm nữa — đặt cố định
  // 1 số lớn để logic đặt hàng (place_order()) không bao giờ chặn nhầm vì "hết hàng", mà vẫn
  // giữ được cơ chế chống bán vượt tồn kho trong database phòng trường hợp cần dùng lại sau này.
  const STOCK_PLACEHOLDER = 9999;

  return {
    code: formData.get("code")?.trim(),
    name: formData.get("name")?.trim(),
    price: Number(formData.get("price")) || 0,
    old_price: oldPriceRaw ? Number(oldPriceRaw) : null,
    stock: STOCK_PLACEHOLDER,
    category: formData.get("category"),
    brand: formData.get("brand")?.trim() || null,
    variants,
    default_variant: formData.get("defaultVariant")?.trim() || variants[0] || null,
    specs: parseSpecs(formData.get("specs")),
    price_options: parsePriceOptionsText(formData.get("priceOptions")),
    images,
    image_url: images[0] || null, // ảnh đại diện — vẫn giữ cột này để tương thích các chỗ code cũ
  };
}

export async function createProduct(formData) {
  // Server Action gọi được trực tiếp từ trình duyệt (bỏ qua layout admin) nên phải tự kiểm tra
  // đăng nhập ngay tại đây — xem giải thích chi tiết trong lib/adminAuth.js (requireAdmin).
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }

  const rawSlug = formData.get("slug")?.trim();
  const slug = slugify(rawSlug);

  if (!slug) {
    redirect(
      `/admin/products/new?error=${encodeURIComponent(
        "Mã sản phẩm (slug) không hợp lệ — vui lòng nhập ít nhất 1 chữ hoặc số."
      )}`
    );
  }

  const payload = { slug, ...(await buildProductPayload(formData, slug)) };

  if (!payload.price || payload.price <= 0) {
    redirect(`/admin/products/new?error=${encodeURIComponent("Giá bán phải lớn hơn 0đ.")}`);
  }

  const { error } = await supabaseAdmin.from("products").insert(payload);

  if (error) {
    console.error("Lỗi thêm sản phẩm:", error.message);
    const message =
      error.code === "23505"
        ? `Mã sản phẩm "${slug}" đã tồn tại — hãy đổi tên sản phẩm hoặc tự đặt slug khác rồi thử lại.`
        : error.message;
    redirect(`/admin/products/new?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function updateProduct(slug, formData) {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }

  const payload = await buildProductPayload(formData, slug);

  if (!payload.price || payload.price <= 0) {
    redirect(`/admin/products/${slug}/edit?error=${encodeURIComponent("Giá bán phải lớn hơn 0đ.")}`);
  }

  const { error } = await supabaseAdmin.from("products").update(payload).eq("slug", slug);

  if (error) {
    console.error("Lỗi cập nhật sản phẩm:", error.message);
    redirect(`/admin/products/${slug}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath(`/san-pham/${slug}`);
  redirect("/admin/products");
}

export async function deleteProduct(slug) {
  const authError = requireAdmin();
  if (authError) return authError;

  const { error } = await supabaseAdmin.from("products").delete().eq("slug", slug);

  if (error) {
    console.error("Lỗi xoá sản phẩm:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true };
}
