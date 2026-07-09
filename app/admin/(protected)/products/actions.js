"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Chuẩn hoá slug: bỏ dấu tiếng Việt, viết thường, khoảng trắng/ký tự lạ -> gạch ngang.
// Cần thiết vì slug được dùng làm đường dẫn ảnh trên Supabase Storage (không chấp nhận dấu/khoảng trắng)
// và làm đường dẫn URL sản phẩm (/san-pham/[slug]) — nên luôn chuẩn hoá bất kể người dùng gõ gì vào ô này.
function slugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu (â -> a, ư -> u...)
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-") // khoảng trắng và ký tự lạ -> gạch ngang
    .replace(/^-+|-+$/g, ""); // bỏ gạch ngang thừa ở đầu/cuối
}

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

  const uploads = await Promise.all(
    validFiles.map(async (file, i) => {
      const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
      const path = `${slug}-${Date.now()}-${i}.${ext}`;

      const { error } = await supabaseAdmin.storage
        .from("product-images")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });

      if (error) {
        console.error("Lỗi tải ảnh sản phẩm lên:", error.message);
        return null;
      }

      const { data } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
      return data?.publicUrl || null;
    })
  );

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

  return {
    code: formData.get("code")?.trim(),
    name: formData.get("name")?.trim(),
    price: Number(formData.get("price")) || 0,
    old_price: oldPriceRaw ? Number(oldPriceRaw) : null,
    stock: Number(formData.get("stock")) || 0,
    category: formData.get("category"),
    brand: formData.get("brand")?.trim() || null,
    variants,
    default_variant: formData.get("defaultVariant")?.trim() || variants[0] || null,
    specs: parseSpecs(formData.get("specs")),
    images,
    image_url: images[0] || null, // ảnh đại diện — vẫn giữ cột này để tương thích các chỗ code cũ
  };
}

export async function createProduct(formData) {
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
  const payload = await buildProductPayload(formData, slug);

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
  const { error } = await supabaseAdmin.from("products").delete().eq("slug", slug);

  if (error) {
    console.error("Lỗi xoá sản phẩm:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true };
}
