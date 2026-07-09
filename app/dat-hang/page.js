"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { supabase } from '../../lib/supabase';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [submitted, setSubmitted] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [loading, setLoading] = useState(false); // Trạng thái đợi lưu database

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    // Giữ nguyên cách tạo mã đơn hàng dạng DHxxxxxxxx thông minh của bạn
    const code = "DH" + Date.now().toString().slice(-8);

    try {
      // Thực hiện đẩy dữ liệu thật lên bảng 'orders' của Supabase
      const { error } = await supabase
        .from('orders')
        .insert([
          {
            order_code: code,
            customer_name: form.name,
            phone_number: form.phone,
            address: form.address,
            note: form.note,
            total_price: totalPrice,
            cart_items: items, // Lưu toàn bộ mảng sản phẩm dạng JSONB
            status: 'Chờ xác nhận'
          }
        ]);

      if (error) throw error;

      // Nếu không có lỗi, tiến hành cập nhật trạng thái giao diện thành công
      setOrderCode(code);
      setSubmitted(true);
      clearCart();
    } catch (error) {
      console.error("Lỗi lưu đơn hàng vào Database:", error);
      alert("Có lỗi xảy ra khi gửi đơn hàng lên hệ thống. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau!");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main>
        <div className="section-head">
          <h2>Đặt hàng thành công</h2>
          <span className="idx">{orderCode}</span>
        </div>
        <div className="empty-state" style={{ textAlign: "left" }}>
          Cảm ơn bạn! Đơn hàng mã <strong>{orderCode}</strong> đã được ghi nhận vào hệ thống thật.
          <br />
          Bên bán sẽ gọi điện xác nhận trước khi giao hàng thu tiền (COD).
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main>
        <div className="empty-state">
          Giỏ hàng đang trống, không có gì để đặt hàng.
        </div>
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

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ marginTop: 16, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Đang xử lý lưu đơn hàng..." : "Xác nhận đặt hàng — COD"}
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
          <div className="checkout-total">
            <span>Tổng cộng</span>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>
        </div>
      </div>
    </main>
  );
}