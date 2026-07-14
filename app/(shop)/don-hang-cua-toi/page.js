import Link from "next/link";
import { getCustomerUser } from "@/lib/customerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CustomerOrderCard from "@/components/CustomerOrderCard";

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
    .select(
      "id, order_code, customer_name, phone_number, address, note, total_price, shipping_fee, cart_items, status, created_at"
    )
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

  // Gộp lấy ảnh đại diện của các sản phẩm đã đặt trong TẤT CẢ đơn bằng 1 query duy nhất
  // (không query lặp lại theo từng đơn/từng dòng) — sản phẩm có thể đã bị xoá khỏi catalog
  // sau khi đặt hàng nên map này có thể thiếu vài slug, component tự xử lý phần đó.
  const allSlugs = Array.from(
    new Set((orders || []).flatMap((o) => (o.cart_items || []).map((i) => i.slug).filter(Boolean)))
  );
  let productImages = {};
  if (allSlugs.length > 0) {
    const { data: productRows } = await supabaseAdmin
      .from("products")
      .select("slug, images, image_url")
      .in("slug", allSlugs);
    productImages = Object.fromEntries(
      (productRows || []).map((p) => [
        p.slug,
        (Array.isArray(p.images) && p.images[0]) || p.image_url || null,
      ])
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
            <CustomerOrderCard key={order.id} order={order} productImages={productImages} />
          ))}
        </div>
      )}
    </main>
  );
}
