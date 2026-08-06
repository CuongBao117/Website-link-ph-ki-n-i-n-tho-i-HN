import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

// Dùng chung cho MỌI nơi tải ảnh sản phẩm lên (form thêm/sửa, Nhập nhanh, Nhập từ bài đăng Zalo,
// Gắn ảnh) — chỉ nhận file ảnh THẬT (đuôi file LẪN MIME type đều phải khớp), chặn việc lỡ tải
// nhầm file khác (HTML/SVG chứa script...) lên bucket lưu trữ CÔNG KHAI "product-images".
export function isAllowedImageFile(file) {
  if (!file || typeof file !== "object" || !file.size) return false;
  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) && typeof file.type === "string" && file.type.startsWith("image/");
}

// Tải 1 ảnh lên Supabase Storage (bucket "product-images"), trả về URL công khai — hoặc null nếu
// lỗi hoặc file không phải ảnh hợp lệ (xem isAllowedImageFile).
export async function uploadProductImage(file, keyHint, i = 0) {
  if (!isAllowedImageFile(file)) {
    if (file) console.error("Bỏ qua file không phải ảnh hợp lệ:", file.name);
    return null;
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${keyHint}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("product-images")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error("Lỗi tải ảnh lên:", error.message);
    return null;
  }

  const { data } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
  return data?.publicUrl || null;
}
