"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { calcShippingFee } from "@/lib/shipping";
import { isValidVNPhone } from "@/lib/phone";
import { placeOrder } from "@/app/(shop)/dat-hang/actions";

export default function CheckoutForm({ userEmail }) {
  const { items, totalPrice, clearCart } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [submitted, setSubmitted] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [error, setError] = useState("");
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ước tính hiển thị trước khi đặt — số THẬT (không thể bị sửa qua trình duyệt) được tính lại
  // ở server trong place_order() và hiện ra ở màn hình "Đặt hàng thành công" bên dưới.
  const estimatedShipping = calcShippingFee(totalPrice);
  const estimatedTotal = totalPrice + estimatedShipping;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "phone" && phoneInvalid) setPhoneInvalid(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    if (!isValidVNPhone(form.phone)) {
      setPhoneInvalid(true);
      setError("Số điện thoại không hợp lệ — vui lòng nhập đúng định dạng (VD: 0912345678).");
      return;
    }

    setPhoneInvalid(false);
    setLoading(true);
    setError("");

    const res = await placeOrder({
      items: items.map((i) => ({ slug: i.slug, variant: i.variant, priceOption: i.priceOption, qty: i.qty })),
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
    <main className="checkout-page">
      <div className="section-head">
        <h2>Đặt hàng — Thanh toán COD</h2>
        <span className="idx">{items.length} SẢN PHẨM</span>
      </div>

      {userEmail && (
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>
          Đang đặt hàng với tài khoản <strong>{userEmail}</strong>
        </div>
      )}

      <div className="checkout-grid">
        <form id="checkout-form" className="checkout-form" onSubmit={handleSubmit}>
          <label htmlFor="checkout-name">Họ và tên</label>
          <input
            id="checkout-name"
            required
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nguyễn Văn A"
          />

          <label htmlFor="checkout-phone">Số điện thoại</label>
          <input
            id="checkout-phone"
            required
            type="tel"
            inputMode="tel"
            name="phone"
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="09xxxxxxxx"
            aria-invalid={phoneInvalid}
          />

          <label htmlFor="checkout-address">Địa chỉ giao hàng</label>
          <input
            id="checkout-address"
            required
            name="address"
            autoComplete="street-address"
            value={form.address}
            onChange={handleChange}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
          />

          <label htmlFor="checkout-note">Ghi chú (không bắt buộc)</label>
          <textarea id="checkout-note" name="note" value={form.note} onChange={handleChange} rows="3" />

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary checkout-submit-btn"
            style={{ marginTop: 16, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Xác nhận đặt hàng — COD"}
          </button>
        </form>

        <div className="checkout-summary">
          <h3>Đơn hàng của bạn</h3>
          {items.map((item) => (
            <div key={item.slug + item.variant + (item.priceOption || "")} className="checkout-item">
              <span>
                {item.name}
                {[item.priceOption, item.variant].filter(Boolean).length > 0
                  ? ` (${[item.priceOption, item.variant].filter(Boolean).join(" · ")})`
                  : ""}{" "}
                x{item.qty}
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

      {/* Chỉ hiện trên mobile (xem CSS) — khách luôn thấy tổng tiền + đặt được hàng ngay mà
          không cần cuộn xuống cuối form. Bấm nút này submit đúng #checkout-form ở trên. */}
      <div className="checkout-sticky-bar">
        <div className="checkout-sticky-total">
          <span>Tổng cộng</span>
          <strong>{formatPrice(estimatedTotal)}</strong>
        </div>
        <button type="submit" form="checkout-form" className="btn-primary" disabled={loading}>
          {loading ? "Đang xử lý..." : "Đặt hàng"}
        </button>
      </div>
    </main>
  );
}
