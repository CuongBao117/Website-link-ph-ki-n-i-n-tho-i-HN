"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { calcShippingFee } from "@/lib/shipping";
import { placeOrder } from "./actions";

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [submitted, setSubmitted] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Ước tính hiển thị trước khi đặt — số THẬT (không thể bị sửa qua trình duyệt) được tính lại
  // ở server trong place_order() và hiện ra ở màn hình "Đặt hàng thành công" bên dưới.
  const estimatedShipping = calcShippingFee(totalPrice);
  const estimatedTotal = totalPrice + estimatedShipping;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    const res = await placeOrder({
      items: items.map((i) => ({ slug: i.slug, variant: i.variant, qty: i.qty })),
      customerName: form.name,
      phoneNumber: form.phone,
      address: form.address,
      note: form.note,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.");
      return;
    }

    setOrderResult(res);
    setSubmitted(true);
    clearCart();
  }

  if (submitted && orderResult) {
    return (
      <main>
        <div className="section-head">
          <h2>Đặt hàng thành công</h2>
          <span className="idx">{orderResult.orderCode}</span>
        </div>
        <div className="empty-state" style={{ textAlign: "left" }}>
          Cảm ơn bạn! Đơn hàng mã <strong>{orderResult.orderCode}</strong> đã được ghi nhận.
          <br />
          Tạm tính: {formatPrice(orderResult.subtotal)} · Phí vận chuyển:{" "}
          {orderResult.shippingFee > 0 ? formatPrice(orderResult.shippingFee) : "Miễn phí"} · Tổng thu (COD):{" "}
          <strong>{formatPrice(orderResult.totalPrice)}</strong>
          <br />
          Bên bán sẽ gọi điện xác nhận trước khi giao hàng thu tiền (COD).
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main>
        <div className="empty-state">Giỏ hàng đang trống, không có gì để đặt hàng.</div>
      </main>
    );
  }

  return (
    <main>
      <div className="section-head">
        <h2>Đặt hàng — Thanh toán COD</h2>
        <span className="idx">{items.length} SẢN PHẨM</span>
      </div>

      <div className="checkout-grid">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <label>Họ và tên</label>
          <input required name="name" value={form.name} onChange={handleChange} placeholder="Nguyễn Văn A" />

          <label>Số điện thoại</label>
          <input required name="phone" value={form.phone} onChange={handleChange} placeholder="09xxxxxxxx" />

          <label>Địa chỉ giao hàng</label>
          <input
            required
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
          />

          <label>Ghi chú (không bắt buộc)</label>
          <textarea name="note" value={form.note} onChange={handleChange} rows="3" />

          {error && (
            <div className="empty-state" style={{ color: "#B0503A", textAlign: "left", padding: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Xác nhận đặt hàng — COD"}
          </button>
        </form>

        <div className="checkout-summary">
          <h3>Đơn hàng của bạn</h3>
          {items.map((item) => (
            <div key={item.slug + item.variant} className="checkout-item">
              <span>
                {item.name} ({item.variant}) x{item.qty}
              </span>
              <span>{formatPrice(item.price * item.qty)}</span>
            </div>
          ))}

          <div className="checkout-line">
            <span>Tạm tính</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          <div className="checkout-line">
            <span>Phí vận chuyển</span>
            <span className={estimatedShipping === 0 ? "checkout-line-free" : ""}>
              {estimatedShipping > 0 ? formatPrice(estimatedShipping) : "Miễn phí"}
            </span>
          </div>

          <div className="checkout-total">
            <span>Tổng cộng</span>
            <strong>{formatPrice(estimatedTotal)}</strong>
          </div>
        </div>
      </div>
    </main>
  );
}
