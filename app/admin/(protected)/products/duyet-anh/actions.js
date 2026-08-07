"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";

// Xoá TOÀN BỘ ảnh hiện tại của 1 sản phẩm — dùng khi phát hiện ảnh bị gán nhầm (thường do khớp
// sai tên lúc "Nhập từ bài đăng Zalo") mà không muốn xoá cả sản phẩm (tên/giá/danh mục vẫn đúng,
// chỉ ảnh sai). Sản phẩm về trạng thái "chưa có ảnh" — gắn lại ảnh đúng sau qua "Gán ảnh hàng
// loạt" hoặc sửa trực tiếp.
export async function clearProductImages(slug) {
  const authError = requireAdmin();
  if (authError) return authError;

  if (!slug) {
    return { success: false, error: "Thiếu sản phẩm." };
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update({ images: [], image_url: null })
    .eq("slug", slug);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/products/duyet-anh");
  revalidatePath("/");
  revalidatePath(`/san-pham/${slug}`);
  return { success: true };
}
