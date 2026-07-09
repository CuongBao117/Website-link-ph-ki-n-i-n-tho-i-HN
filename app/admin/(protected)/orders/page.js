import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPrice } from "@/data/products";
import OrderStatusSelect from "@/components/OrderStatusSelect";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUSES = ["Chờ xác nhận", "Đang giao", "Đã giao", "Đã huỷ"];

function buildPageHref({ q, status, page }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status && status !== "all") params.set("status", status);
  params.set("page", String(page));
  return `/admin/orders?${params.toString()}`;
}

export default async function AdminOrdersPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  const statusFilter = searchParams?.status || "all";
  const page = Math.max(1, Number(searchParams?.page) || 1);

  let query = supabaseAdmin.from("orders").select("*", { count: "exact" });

  if (q) {
    const escaped = q.replace(/[%,]/g, "");
    query = query.or(
      `order_code.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,phone_number.ilike.%${escaped}%`
    );
  }
  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: orders, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <main>
        <div className="empty-state">
          Lỗi tải danh sách đơn hàng: {error.message}
          <br />
          <span style={{ fontSize: 12 }}>
            Kiểm tra lại SUPABASE_SERVICE_ROLE_KEY trong file .env.local.
          </span>
        </div>
      </main>
    );
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = Boolean(q) || statusFilter !== "all";

  // Đếm nhanh số đơn đang chờ xác nhận trong trang hiện tại, để nhấn mạnh việc cần xử lý
  const pendingCount = (orders || []).filter((o) => o.status === "Chờ xác nhận").length;

  return (
    <main>
      <div className="section-head">
        <h2>Quản trị — Đơn hàng</h2>
        <span className="idx">
          {totalCount} ĐƠN{pendingCount > 0 ? ` · ${pendingCount} CHỜ XÁC NHẬN (TRANG NÀY)` : ""}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Link href="/admin/orders/history" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          Xem lịch sử đơn đã hoàn thành →
        </Link>
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
          <option value="all">Tất cả trạng thái</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Lọc
        </button>
        {hasFilters && (
          <Link
            href="/admin/orders"
            className="cart-remove"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Xoá bộ lọc
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <div className="empty-state">Không tìm thấy đơn hàng nào phù hợp.</div>
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
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4, maxWidth: 220 }}>
                      {order.address}
                    </div>
                    {order.note && (
                      <div style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic", marginTop: 2 }}>
                        Ghi chú: {order.note}
                      </div>
                    )}
                  </td>
                  <td>
                    {(order.cart_items || []).map((item, i) => (
                      <div key={i} style={{ fontSize: 12.5, marginBottom: 4 }}>
                        {item.name} ({item.variant}) × {item.qty}
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
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <Link
                href={buildPageHref({ q, status: statusFilter, page: Math.max(1, page - 1) })}
                className={`cart-remove ${page <= 1 ? "disabled-link" : ""}`}
                style={{ textDecoration: "none" }}
              >
                ← Trước
              </Link>
              <span className="prod-code">
                Trang {page} / {totalPages}
              </span>
              <Link
                href={buildPageHref({ q, status: statusFilter, page: Math.min(totalPages, page + 1) })}
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
