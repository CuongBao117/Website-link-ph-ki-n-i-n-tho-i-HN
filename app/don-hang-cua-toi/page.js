import Link from "next/link";
import { getCustomerUser } from "@/lib/customerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPrice } from "@/data/products";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const user = await getCustomerUser();

  if (!user) {
    return (
      <main>
        <div className="section-head">
          <h2>Đơn hàng của tôi</h2>
        </div>
        <div className="empty-state">
          Cần đăng nhập để xem đơn hàng.{" "}
          <Link href="/dang-nhap?next=/don-hang-cua-toi" style={{ color: "var(--teal)", fontWeight: 600 }}>
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  // Lọc theo đúng user_id của tài khoản đang đăng nhập — khách chỉ thấy đơn của chính mình,
  // không như cách tra theo SĐT cũ (đã gỡ bỏ vì có thể bị dò để xem đơn của người khác).
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_code, customer_name, address, total_price, shipping_fee, cart_items, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main>
        <div className="section-head">
          <h2>Đơn hàng của tôi</h2>
        </div>
        <div className="empty-state">Có lỗi khi tải đơn hàng — vui lòng thử lại sau.</div>
      </main>
    );
  }

  return (
    <main>
      <div className="section-head">
        <h2>Đơn hàng của tôi</h2>
        <span className="idx">{orders.length} ĐƠN HÀNG</span>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          Bạn chưa có đơn hàng nào.{" "}
          <Link href="/" style={{ color: "var(--teal)", fontWeight: 600 }}>
            Bắt đầu mua sắm
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map((order) => (
            <div key={order.id} className="checkout-summary">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>{order.order_code}</strong>
                <span className="prod-code">{order.status}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
                {new Date(order.created_at).toLocaleString("vi-VN")} · Giao tới: {order.address}
              </div>

              {(order.cart_items || []).map((item, i) => (
                <div key={i} className="checkout-item">
                  <span>
                    {item.name} ({item.variant}) x{item.qty}
                  </span>
                  <span>{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}

              <div className="checkout-line">
                <span>Phí vận chuyển</span>
                <span>{order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : "Miễn phí"}</span>
              </div>
              <div className="checkout-total">
                <span>Tổng thu (COD)</span>
                <strong>{formatPrice(order.total_price)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
