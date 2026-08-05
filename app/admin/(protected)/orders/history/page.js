import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPrice } from "@/data/products";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const HISTORY_STATUSES = ["Đã giao", "Đã huỷ"];

function buildPageHref({ q, status, from, to, page }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status && status !== "all") params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", String(page));
  return `/admin/orders/history?${params.toString()}`;
}

export default async function OrdersHistoryPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  const statusFilter = searchParams?.status || "Đã giao";
  const fromDate = searchParams?.from || "";
  const toDate = searchParams?.to || "";
  const page = Math.max(1, Number(searchParams?.page) || 1);

  let query = supabaseAdmin.from("orders").select("*", { count: "exact" });

  if (statusFilter === "all") {
    query = query.in("status", HISTORY_STATUSES);
  } else {
    query = query.eq("status", statusFilter);
  }

  if (q) {
    const escaped = q.replace(/[%,]/g, "");
    query = query.or(
      `order_code.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,phone_number.ilike.%${escaped}%`
    );
  }
  if (fromDate) {
    query = query.gte("created_at", `${fromDate}T00:00:00`);
  }
  if (toDate) {
    query = query.lte("created_at", `${toDate}T23:59:59`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: orders, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <main>
        <div className="empty-state">Lỗi tải lịch sử đơn hàng: {error.message}</div>
      </main>
    );
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Tổng doanh thu của TOÀN BỘ kết quả đang lọc (không chỉ trang hiện tại)
  let revenueQuery = supabaseAdmin.from("orders").select("total_price");
  if (statusFilter === "all") {
    revenueQuery = revenueQuery.in("status", HISTORY_STATUSES);
  } else {
    revenueQuery = revenueQuery.eq("status", statusFilter);
  }
  if (q) {
    const escaped = q.replace(/[%,]/g, "");
    revenueQuery = revenueQuery.or(
      `order_code.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,phone_number.ilike.%${escaped}%`
    );
  }
  if (fromDate) revenueQuery = revenueQuery.gte("created_at", `${fromDate}T00:00:00`);
  if (toDate) revenueQuery = revenueQuery.lte("created_at", `${toDate}T23:59:59`);

  const { data: revenueRows } = await revenueQuery;
  const totalRevenue = (revenueRows || []).reduce((sum, o) => sum + (o.total_price || 0), 0);

  return (
    <main>
      <div className="section-head">
        <h2>Lịch sử — Đơn đã hoàn thành</h2>
        <span className="idx">{totalCount} ĐƠN</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Link href="/admin/orders" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          ← Quay lại đơn hàng cần xử lý
        </Link>
      </div>

      <div className="dash-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: 24 }}>
        <div className="dash-card" style={{ cursor: "default" }}>
          <span className="dash-label">Số đơn trong bộ lọc</span>
          <span className="dash-value">{totalCount}</span>
        </div>
        <div className="dash-card" style={{ cursor: "default" }}>
          <span className="dash-label">Tổng doanh thu trong bộ lọc</span>
          <span className="dash-value" style={{ color: "var(--copper-dark)" }}>
            {formatPrice(totalRevenue)}
          </span>
        </div>
      </div>

      <form method="GET" className="admin-filter-bar">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Tìm theo mã đơn, tên khách hoặc số điện thoại..."
          className="admin-filter-input"
        />
        <select name="status" defaultValue={statusFilter} className="sort-select">
          <option value="Đã giao">Đã giao</option>
          <option value="Đã huỷ">Đã huỷ</option>
          <option value="all">Đã giao + Đã huỷ</option>
        </select>
        <label style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6 }}>
          Từ ngày
          <input type="date" name="from" defaultValue={fromDate} className="admin-filter-input" style={{ minWidth: 150 }} />
        </label>
        <label style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6 }}>
          Đến ngày
          <input type="date" name="to" defaultValue={toDate} className="admin-filter-input" style={{ minWidth: 150 }} />
        </label>
        <button type="submit" className="btn-primary">
          Lọc
        </button>
        <Link
          href="/admin/orders/history"
          className="cart-remove"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          Xoá bộ lọc
        </Link>
      </form>

      {orders.length === 0 ? (
        <div className="empty-state">Không có đơn hàng nào phù hợp trong khoảng thời gian này.</div>
      ) : (
        <>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Tổng tiền</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="prod-code">
                    <Link href={`/admin/orders/${order.id}`} style={{ color: "var(--teal)", fontWeight: 700 }}>
                      {order.order_code}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                    <div className="prod-code">{order.phone_number}</div>
                  </td>
                  <td>
                    {(order.cart_items || []).map((item, i) => (
                      <div key={i} style={{ fontSize: 12.5, marginBottom: 4 }}>
                        {item.name}
                        {[item.priceOption, item.variant].filter(Boolean).length > 0
                          ? ` (${[item.priceOption, item.variant].filter(Boolean).join(" · ")})`
                          : ""}{" "}
                        × {item.qty}
                      </div>
                    ))}
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--copper-dark)", whiteSpace: "nowrap" }}>
                    {formatPrice(order.total_price)}
                  </td>
                  <td className="prod-code" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                    {new Date(order.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 600,
                        color: order.status === "Đã huỷ" ? "#9AA6A0" : "#2f6f62",
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <Link
                href={buildPageHref({ q, status: statusFilter, from: fromDate, to: toDate, page: Math.max(1, page - 1) })}
                className={`cart-remove ${page <= 1 ? "disabled-link" : ""}`}
                style={{ textDecoration: "none" }}
              >
                ← Trước
              </Link>
              <span className="prod-code">
                Trang {page} / {totalPages}
              </span>
              <Link
                href={buildPageHref({ q, status: statusFilter, from: fromDate, to: toDate, page: Math.min(totalPages, page + 1) })}
                className={`cart-remove ${page >= totalPages ? "disabled-link" : ""}`}
                style={{ textDecoration: "none" }}
              >
                Sau →
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
