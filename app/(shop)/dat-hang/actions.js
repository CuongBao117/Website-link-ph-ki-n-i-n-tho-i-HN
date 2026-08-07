"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCustomerUser } from "@/lib/customerAuth";
import { isValidVNPhone } from "@/lib/phone";

// Đặt hàng — chạy hoàn toàn ở server, dùng service_role key.
// Chỉ nhận slug + variant + qty từ client; GIÁ được tính lại trong database (xem hàm
// place_order() ở supabase/migration_006_secure_checkout.sql), nên khách không thể tự sửa giá
// qua localStorage/DevTools như cách làm cũ (insert thẳng từ client bằng anon key).
export async function placeOrder({ items, customerName, phoneNumber, address, note }) {
  // Trang /dat-hang đã chặn khách chưa đăng nhập, nhưng Server Action gọi thẳng được (bỏ qua
  // trang) nên phải tự kiểm tra lại ở đây — không tin tưởng hoàn toàn vào lớp chặn phía trang.
  const user = await getCustomerUser();
  if (!user) {
    return { success: false, error: "Cần đăng nhập để đặt hàng." };
  }

  const cleanItems = (items || [])
    .filter((i) => i && i.slug && i.qty > 0)
    .map((i) => ({
      slug: i.slug,
      variant: i.variant || null,
      priceOption: i.priceOption || null,
      qty: Math.max(1, Number(i.qty) || 1),
    }));

  if (cleanItems.length === 0) {
    return { success: false, error: "Giỏ hàng đang trống." };
  }

  // Validate định dạng SĐT ở SERVER — form đã validate nhưng Server Action có thể bị gọi thẳng,
  // bỏ qua UI (giống lý do phải check lại đăng nhập ở trên). SĐT sai khiến đơn COD không giao được.
  if (!isValidVNPhone(phoneNumber)) {
    return { success: false, error: "Số điện thoại không hợp lệ — vui lòng nhập đúng định dạng (VD: 0912345678)." };
  }

  const { data, error } = await supabaseAdmin.rpc("place_order", {
    p_items: cleanItems,
    p_customer_name: customerName,
    p_phone_number: phoneNumber,
    p_address: address,
    p_note: note || null,
    p_user_id: user.id,
  });

  if (error) {
    // Hàm place_order() raise exception với message ngắn (OUT_OF_STOCK, PRODUCT_NOT_FOUND...)
    // và chi tiết dạng JSON trong "details" — đọc lại đây để hiện thông báo dễ hiểu cho khách.
    const msg = error.message || "";
    if (msg.includes("OUT_OF_STOCK")) {
      try {
        const info = JSON.parse(error.details);
        return {
          success: false,
          error: `"${info.name}" chỉ còn ${info.stock} sản phẩm trong kho — vui lòng giảm số lượng.`,
        };
      } catch {
        return { success: false, error: "Một sản phẩm trong giỏ hàng không đủ số lượng tồn kho." };
      }
    }
    if (msg.includes("PRODUCT_NOT_FOUND")) {
      return { success: false, error: "Một sản phẩm trong giỏ hàng không còn tồn tại — vui lòng làm mới giỏ hàng." };
    }
    if (msg.includes("PRODUCT_HIDDEN")) {
      try {
        const info = JSON.parse(error.details);
        return {
          success: false,
          error: `"${info.name}" hiện đang tạm ngừng bán — vui lòng bỏ khỏi giỏ hàng.`,
        };
      } catch {
        return { success: false, error: "Một sản phẩm trong giỏ hàng hiện đang tạm ngừng bán — vui lòng bỏ khỏi giỏ hàng." };
      }
    }
    if (msg.includes("MISSING_CUSTOMER_INFO")) {
      return { success: false, error: "Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ." };
    }
    console.error("Lỗi đặt hàng:", error);
    return { success: false, error: "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    orderCode: row?.out_order_code,
    subtotal: row?.out_subtotal,
    shippingFee: row?.out_shipping_fee,
    totalPrice: row?.out_total_price,
  };
}
