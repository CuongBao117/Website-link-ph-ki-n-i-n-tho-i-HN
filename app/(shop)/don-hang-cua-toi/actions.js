"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCustomerUser } from "@/lib/customerAuth";

// Khách chỉ được tự huỷ đơn khi đơn CÒN "Chờ xác nhận" — 1 khi admin đã chuyển sang "Đang
// giao"/"Đã giao"/"Đã huỷ" thì không cho tự huỷ nữa (hàng có thể đã xuất kho/giao rồi).
// Điều kiện chủ sở hữu (user_id) VÀ trạng thái được kiểm tra ngay trong câu UPDATE (không phải
// đọc rồi mới ghi riêng) để tránh race condition: nếu admin vừa đổi trạng thái đúng lúc khách
// bấm huỷ, update sẽ không khớp điều kiện .eq("status", ...) nữa và trả về 0 dòng thay vì huỷ
// nhầm 1 đơn admin đã xử lý.
export async function cancelMyOrder(orderId) {
  const user = await getCustomerUser();
  if (!user) {
    return { success: false, error: "Cần đăng nhập để thực hiện thao tác này." };
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "Đã huỷ" })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("status", "Chờ xác nhận")
    .select("id");

  if (error) {
    console.error("Lỗi huỷ đơn hàng:", error.message);
    return { success: false, error: "Có lỗi xảy ra, vui lòng thử lại." };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: "Không thể huỷ đơn này — có thể đơn đã được xác nhận/xử lý hoặc không còn tồn tại.",
    };
  }

  revalidatePath("/don-hang-cua-toi");
  return { success: true };
}
