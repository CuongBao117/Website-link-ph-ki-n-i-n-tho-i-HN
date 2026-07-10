"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/adminAuth";

// Dùng để polling từ trang admin (xem AdminLiveOrders.js): trả về số đơn đang "Chờ xác nhận"
// và id của vài đơn mới nhất, để nhận biết khi nào CÓ đơn mới xuất hiện kể từ lần kiểm tra trước.
// Có kiểm tra đăng nhập admin ngay trong action vì Server Action có thể bị gọi trực tiếp từ client.
export async function getPendingOrdersSnapshot() {
  if (!isAdminAuthed()) {
    return { count: 0, latestIds: [] };
  }

  const [{ count }, { data: latest }] = await Promise.all([
    supabaseAdmin.from("orders").select("*", { count: "exact", head: true }).eq("status", "Chờ xác nhận"),
    supabaseAdmin
      .from("orders")
      .select("id, order_code, customer_name")
      .eq("status", "Chờ xác nhận")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return {
    count: count ?? 0,
    latestIds: (latest || []).map((o) => o.id),
    latestOrders: latest || [],
  };
}

export async function updateOrderStatus(orderId, newStatus) {
  if (!isAdminAuthed()) {
    return { success: false, error: "Không có quyền truy cập" };
  }

  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) {
    console.error("Lỗi cập nhật trạng thái đơn hàng:", error);
    return { success: false };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/history");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

function parseItemsJson(text) {
  try {
    const parsed = JSON.parse(text || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Sửa thông tin khách hàng + danh sách sản phẩm trong 1 đơn hàng (dùng ở trang chi tiết đơn).
// Tổng tiền luôn được TÍNH LẠI từ đơn giá x số lượng phía server, không tin số liệu client gửi lên.
export async function updateOrderDetails(orderId, formData) {
  if (!isAdminAuthed()) {
    redirect(`/admin/orders/${orderId}?error=${encodeURIComponent("Không có quyền truy cập")}`);
  }

  const items = parseItemsJson(formData.get("itemsJson"))
    .filter((it) => it && it.name && typeof it.price === "number")
    .map((it) => ({ ...it, qty: Math.max(1, Number(it.qty) || 1) }));

  if (items.length === 0) {
    redirect(
      `/admin/orders/${orderId}?error=${encodeURIComponent(
        "Đơn hàng phải còn ít nhất 1 sản phẩm — nếu muốn huỷ cả đơn, hãy đổi trạng thái thành 'Đã huỷ' thay vì xoá hết sản phẩm."
      )}`
    );
  }

  const totalPrice = items.reduce((sum, it) => sum + it.qty * it.price, 0);

  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      customer_name: formData.get("customerName")?.trim(),
      phone_number: formData.get("phoneNumber")?.trim(),
      address: formData.get("address")?.trim(),
      note: formData.get("note")?.trim() || null,
      cart_items: items,
      total_price: totalPrice,
    })
    .eq("id", orderId);

  if (error) {
    console.error("Lỗi cập nhật đơn hàng:", error.message);
    redirect(`/admin/orders/${orderId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/history");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}?saved=1`);
}
