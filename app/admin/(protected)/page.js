import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPrice } from "@/data/products";

export const dynamic = "force-dynamic";

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function AdminDashboardPage() {
  const [
    { data: orders, error: ordersError },
    { data: products, error: productsError },
    { count: categoryCount },
  ] = await Promise.all([
    supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("products").select("*"),
    supabaseAdmin.from("categories").select("*", { count: "exact", head: true }),
  ]);

  if (ordersError || productsError) {
    return (
      <main>
        <div className="empty-state">
          Lỗi tải dữ liệu tổng quan: {ordersError?.message || productsError?.message}
        </div>
      </main>
    );
  }

  const todayISO = startOfTodayISO();
  const monthISO = startOfMonthISO();

  const pendingCount = orders.filter((o) => o.status === "Chờ xác nhận").length;
  const deliveringCount = orders.filter((o) => o.status === "Đang giao").length;
  const completedCount = orders.filter((o) => o.status === "Đã giao").length;

  const revenueToday = orders
    .filter((o) => o.status !== "Đã huỷ" && o.created_at >= todayISO)
    .reduce((sum, o) => sum + (o.total_price || 0), 0);

  const revenueMonth = orders
    .filter((o) => o.status !== "Đã huỷ" && o.created_at >= monthISO)
    .reduce((sum, o) => sum + (o.total_price || 0), 0);

  const outOfStock = products.filter((p) => (p.stock ?? 0) <= 0);
  const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5);

  const recentOrders = orders.slice(0, 5);

  const cards = [
    { label: "Chờ xác nhận", value: pendingCount, href: "/admin/orders", accent: "var(--copper-dark)" },
    { label: "Đang giao", value: deliveringCount, href: "/admin/orders", accent: "var(--teal)" },
    { label: "Đã giao", value: completedCount, href: "/admin/orders", accent: "#2f6f62" },
    { label: "Tổng sản phẩm", value: products.length, href: "/admin/products", accent: "var(--ink)" },
    { label: "Doanh thu hôm nay", value: formatPrice(revenueToday), href: "/admin/orders", accent: "var(--copper-dark)" },
    { label: "Doanh thu tháng này", value: formatPrice(revenueMonth), href: "/admin/orders", accent: "var(--copper-dark)" },
    { label: "Sắp hết hàng (≤5)", value: lowStock.length, href: "/admin/products?stock=low", accent: "#B0503A" },
    { label: "Hết hàng", value: outOfStock.length, href: "/admin/products?stock=out", accent: "#B0503A" },
  ];

  return (
    <main>
      <div className="section-head">
        <h2>Tổng quan</h2>
        <span className="idx">{categoryCount ?? 0} DANH MỤC</span>
      </div>

      <div className="dash-grid">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="dash-card">
            <span className="dash-label">{c.label}</span>
            <span className="dash-value" style={{ color: c.accent }}>
              {c.value}
            </span>
          </Link>
        ))}
      </div>

      <div className="section-head" style={{ marginTop: 40 }}>
        <h2>Đơn hàng gần đây</h2>
        <span className="idx">
          <Link href="/admin/orders" style={{ color: "inherit", textDecoration: "none" }}>
            XEM TẤT CẢ →
          </Link>
        </span>
      </div>

      {recentOrders.length === 0 ? (
        <div className="empty-state">Chưa có đơn hàng nào.</div>
      ) : (
        <table className="cart-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Tổng tiền</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <td className="prod-code">{order.order_code}</td>
                <td>{order.customer_name}</td>
                <td style={{ fontWeight: 700, color: "var(--copper-dark)", whiteSpace: "nowrap" }}>
                  {formatPrice(order.total_price)}
                </td>
                <td className="prod-code" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                  {new Date(order.created_at).toLocaleString("vi-VN")}
                </td>
                <td>{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
