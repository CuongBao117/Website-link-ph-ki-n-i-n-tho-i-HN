"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";
import { calcShippingFee } from "@/lib/shipping";

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

      <div className="cart-table-hint">← Vuốt ngang để xem đầy đủ →</div>
      <div className="cart-table-scroll">
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
              <tr key={item.slug + item.variant + (item.priceOption || "")}>
                <td>
                  {item.name}
                  <div className="prod-code">{item.code}</div>
                </td>
                <td>{[item.priceOption, item.variant].filter(Boolean).join(" · ") || "—"}</td>
                <td>{formatPrice(item.price)}</td>
                <td>
                  <div className="qty-box">
                    <button
                      onClick={() => updateQty(item.slug, item.variant, item.qty - 1, item.priceOption)}
                      disabled={item.qty <= 1}
                    >
                      –
                    </button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.slug, item.variant, item.qty + 1, item.priceOption)}>
                      +
                    </button>
                  </div>
                </td>
                <td>{formatPrice(item.price * item.qty)}</td>
                <td>
                  <button
                    className="cart-remove"
                    onClick={() => removeItem(item.slug, item.variant, item.priceOption)}
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cart-summary" style={{ flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "var(--ink-soft)" }}>
          <div>Tạm tính: {formatPrice(totalPrice)}</div>
          <div>
            Phí vận chuyển:{" "}
            {calcShippingFee(totalPrice) > 0 ? (
              formatPrice(calcShippingFee(totalPrice))
            ) : (
              <span style={{ color: "var(--teal)", fontWeight: 600 }}>Miễn phí</span>
            )}
          </div>
        </div>
        <div className="cart-total">
          Tổng cộng: <strong>{formatPrice(totalPrice + calcShippingFee(totalPrice))}</strong>
        </div>
        <Link href="/dat-hang" className="btn-primary cart-checkout-btn">
          Tiến hành đặt hàng
        </Link>
      </div>
    </main>
  );
}
