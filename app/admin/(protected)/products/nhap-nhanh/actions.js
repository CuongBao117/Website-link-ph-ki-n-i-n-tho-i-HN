"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/adminAuth";

async function uploadSharedImage(file, keyHint, i) {
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `${keyHint}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

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

// Tạo hàng loạt sản phẩm cùng 1 mặt hàng nhưng khác dòng máy/giá (vd "Cáp sạc WEIBI iPhone 11",
// "Cáp sạc WEIBI iPhone 11 Pro"...) — mỗi dòng máy là 1 sản phẩm riêng, dùng chung 1 bộ ảnh đại
// diện (thường cả lô chỉ chụp vài tấm chung — bảng giá, hàng thật... — không có ảnh riêng từng
// dòng máy).
export async function createProductBatch(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const category = formData.get("category")?.trim();
  const categoryCode = formData.get("categoryCode")?.trim() || "SP";
  const itemsRaw = formData.get("items");
  const sharedImageFiles = formData.getAll("sharedImages");

  if (!category || !itemsRaw) {
    return { success: false, error: "Thiếu danh mục hoặc danh sách sản phẩm." };
  }

  let items;
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { success: false, error: "Dữ liệu danh sách sản phẩm không hợp lệ." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Danh sách sản phẩm đang trống." };
  }

  const validImageFiles = sharedImageFiles.filter((f) => f && typeof f === "object" && f.size > 0);
  const sharedImageUrls = (
    await Promise.all(validImageFiles.map((file, i) => uploadSharedImage(file, slugify(category), i)))
  ).filter(Boolean);

  const { data: existingSlugs } = await supabaseAdmin.from("products").select("slug");
  const takenSlugs = new Set((existingSlugs || []).map((r) => r.slug));

  const rows = items.map((item, i) => {
    let slug = slugify(item.name);
    if (!slug) slug = `sp-${Date.now()}-${i}`;
    if (takenSlugs.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    takenSlugs.add(slug);

    const code = `${categoryCode}-${Date.now().toString(36).toUpperCase()}${i}`;
    const images = sharedImageUrls;

    return {
      slug,
      code,
      name: item.name,
      price: item.price,
      old_price: null,
      stock: 9999,
      category,
      brand: null,
      variants: [],
      default_variant: null,
      specs: [],
      images,
      image_url: images[0] || null,
    };
  });

  // upsert (không phải insert thường): nếu bấm "Xác nhận tạo" 2 lần liên tiếp (VD tưởng nút
  // không phản hồi nên bấm lại), 2 request có thể cùng kiểm tra "slug đã tồn tại chưa" ở cùng
  // 1 thời điểm (chưa thấy request kia vừa tạo xong) rồi cùng cố insert 1 slug giống nhau ->
  // insert thường sẽ báo lỗi "duplicate key value violates unique constraint products_pkey".
  // Dùng upsert để lần bấm lặp lại chỉ CẬP NHẬT thay vì báo lỗi, giống cách nhap-zalo/import CSV
  // đã làm.
  const { error } = await supabaseAdmin.from("products").upsert(rows, { onConflict: "slug" });

  if (error) {
    console.error("Lỗi tạo hàng loạt sản phẩm:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true, count: rows.length };
}
