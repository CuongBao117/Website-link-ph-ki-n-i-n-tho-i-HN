import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPrice } from "@/data/products";
import OrderStatusSelect from "@/components/OrderStatusSelect";
import OrderDetailForm from "@/components/OrderDetailForm";
import PrintOrderButton from "@/components/PrintOrderButton";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params, searchParams }) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!order) return notFound();

  const items = order.cart_items || [];

  return (
    <main>
      <div className="section-head no-print">
        <h2>Đơn hàng {order.order_code}</h2>
        <span className="idx">{new Date(order.created_at).toLocaleString("vi-VN")}</span>
      </div>

      <div className="no-print" style={{ marginBottom: 20, display: "flex", gap: 18, alignItems: "center" }}>
        <Link href="/admin/orders" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          ← Quay lại danh sách đơn hàng
        </Link>
        <PrintOrderButton />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Trạng thái</span>
          <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      {searchParams?.saved && (
        <div className="empty-state no-print" style={{ color: "#2f6f62", marginBottom: 20, padding: 16 }}>
          Đã lưu thay đổi.
        </div>
      )}
      {searchParams?.error && (
        <div className="empty-state no-print" style={{ color: "#B0503A", marginBottom: 20, padding: 16 }}>
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <OrderDetailForm order={order} />

      {/* Phiếu giao hàng — chỉ hiện ra khi bấm in (xem globals.css: .print-only) */}
      <div className="print-only print-slip">
        <h2 style={{ marginBottom: 4 }}>LINHKIEN.STORE — PHIẾU GIAO HÀNG</h2>
        <div style={{ marginBottom: 16, fontSize: 13 }}>
          Mã đơn: <strong>{order.order_code}</strong> · Ngày đặt:{" "}
          {new Date(order.created_at).toLocaleString("vi-VN")}
        </div>

        <table style={{ marginBottom: 16 }}>
          <tbody>
            <tr>
              <td style={{ width: 140 }}>Khách hàng</td>
              <td>
                <strong>{order.customer_name}</strong>
              </td>
            </tr>
            <tr>
              <td>Số điện thoại</td>
              <td>{order.phone_number}</td>
            </tr>
            <tr>
              <td>Địa chỉ giao hàng</td>
              <td>{order.address}</td>
            </tr>
            {order.note && (
              <tr>
                <td>Ghi chú</td>
                <td>{order.note}</td>
              </tr>
            )}
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Phân loại</th>
              <th>SL</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{it.name}</td>
                <td>{it.variant}</td>
                <td>{it.qty}</td>
                <td>{formatPrice(it.price)}</td>
                <td>{formatPrice(it.price * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: "right", marginTop: 12 }}>
          <div style={{ fontSize: 13 }}>Tạm tính: {formatPrice(order.total_price - (order.shipping_fee || 0))}</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            Phí vận chuyển: {order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : "Miễn phí"}
          </div>
          <div style={{ fontSize: 15 }}>
            <strong>Tổng thu (COD): {formatPrice(order.total_price)}</strong>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 56 }}>
          <div>Người giao hàng</div>
          <div>Người nhận hàng</div>
        </div>
      </div>
    </main>
  );
}
