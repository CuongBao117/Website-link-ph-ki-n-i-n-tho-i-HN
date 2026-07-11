"use client";

import { useState } from "react";
import { updateOrderDetails } from "@/app/admin/(protected)/orders/actions";
import { formatPrice } from "@/data/products";

export default function OrderDetailForm({ order }) {
  const [items, setItems] = useState(order.cart_items || []);

  const total = items.reduce((sum, it) => sum + it.qty * it.price, 0);

  function updateQty(i, qty) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, qty: Math.max(1, qty) } : it)));
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const boundAction = updateOrderDetails.bind(null, order.id);

  return (
    <form action={boundAction} className="checkout-form no-print" style={{ maxWidth: 680 }}>
      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

      <label>Tên khách hàng</label>
      <input name="customerName" defaultValue={order.customer_name} required />

      <label>Số điện thoại</label>
      <input name="phoneNumber" defaultValue={order.phone_number} required />

      <label>Địa chỉ giao hàng</label>
      <input name="address" defaultValue={order.address} required />

      <label>Ghi chú</label>
      <textarea name="note" defaultValue={order.note || ""} rows="2" />

      <label style={{ marginTop: 18 }}>Sản phẩm trong đơn</label>
      <table className="cart-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Đơn giá</th>
            <th>SL</th>
            <th>Thành tiền</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={`${it.slug}-${it.variant}-${i}`}>
              <td>
                {it.name}
                <div className="prod-code">{it.variant}</div>
              </td>
              <td>{formatPrice(it.price)}</td>
              <td>
                <div className="qty-box">
                  <button type="button" onClick={() => updateQty(i, it.qty - 1)}>
                    –
                  </button>
                  <span>{it.qty}</span>
                  <button type="button" onClick={() => updateQty(i, it.qty + 1)}>
                    +
                  </button>
                </div>
              </td>
              <td>{formatPrice(it.price * it.qty)}</td>
              <td>
                <button type="button" className="cart-remove" onClick={() => removeItem(i)}>
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="empty-state">
          Đơn hàng không còn sản phẩm nào — nếu muốn huỷ cả đơn, hãy đổi trạng thái thành "Đã huỷ" thay vì xoá hết sản phẩm rồi lưu.
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div className="checkout-line">
          <span>Tạm tính</span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="checkout-line">
          <span>Phí vận chuyển</span>
          <span>{order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : "Miễn phí"}</span>
        </div>
        <div className="cart-total" style={{ marginTop: 4, marginBottom: 0 }}>
          Tổng thu (COD): <strong>{formatPrice(total + (order.shipping_fee || 0))}</strong>
        </div>
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: 16 }} disabled={items.length === 0}>
        Lưu thay đổi
      </button>
    </form>
  );
}
