"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

export default function CartPage() {
  const { items, updateQty, removeItem, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <main>
        <div className="section-head">
          <h2>Giỏ hàng</h2>
          <span className="idx">0 SẢN PHẨM</span>
        </div>
        <div className="empty-state">
          Giỏ hàng đang trống.{" "}
          <Link href="/" style={{ color: "var(--teal)", fontWeight: 600 }}>
            Quay lại mua sắm
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="section-head">
        <h2>Giỏ hàng</h2>
        <span className="idx">{items.length} SẢN PHẨM</span>
      </div>

      <table className="cart-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Phân loại</th>
            <th>Đơn giá</th>
            <th>Số lượng</th>
            <th>Thành tiền</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.slug + item.variant}>
              <td>
                {item.name}
                <div className="prod-code">{item.code}</div>
              </td>
              <td>{item.variant}</td>
              <td>{formatPrice(item.price)}</td>
              <td>
                <div className="qty-box">
                  <button onClick={() => updateQty(item.slug, item.variant, item.qty - 1)}>
                    –
                  </button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(item.slug, item.variant, item.qty + 1)}>
                    +
                  </button>
                </div>
              </td>
              <td>{formatPrice(item.price * item.qty)}</td>
              <td>
                <button
                  className="cart-remove"
                  onClick={() => removeItem(item.slug, item.variant)}
                >
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cart-summary">
        <div className="cart-total">
          Tổng cộng: <strong>{formatPrice(totalPrice)}</strong>
        </div>
        <Link href="/dat-hang" className="btn-primary cart-checkout-btn">
          Tiến hành đặt hàng
        </Link>
      </div>
    </main>
  );
}
