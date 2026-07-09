"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

export default function ProductPurchasePanel({ product }) {
  const [variant, setVariant] = useState(product.defaultVariant || product.variants[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const outOfStock = (product.stock ?? 0) <= 0;
  const maxQty = outOfStock ? 1 : product.stock;

  function handleAddToCart() {
    addItem(product, variant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    addItem(product, variant, qty);
    router.push("/gio-hang");
  }

  return (
    <>
      <div className="variant-label">Chọn dòng máy / phiên bản</div>
      <div className="variant-chips">
        {product.variants.map((v) => (
          <div
            key={v}
            className={`chip ${variant === v ? "active" : ""}`}
            onClick={() => setVariant(v)}
          >
            {v}
          </div>
        ))}
      </div>

      <div className="qty-row">
        <div className="variant-label" style={{ margin: 0 }}>
          Số lượng
        </div>
        <div className="qty-box">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={outOfStock}
          >
            –
          </button>
          <span>{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={outOfStock}
          >
            +
          </button>
        </div>
        {!outOfStock && product.stock <= 5 && (
          <span style={{ fontSize: 12, color: "var(--copper-dark)" }}>
            Chỉ còn {product.stock} sản phẩm
          </span>
        )}
      </div>

      {outOfStock ? (
        <div
          className="empty-state"
          style={{ textAlign: "left", marginBottom: 22, padding: 16 }}
        >
          Sản phẩm tạm thời hết hàng. Để lại thông tin qua hotline để được báo khi có hàng lại.
        </div>
      ) : (
        <div className="pdp-ctas">
          <button className="btn-outline" onClick={handleAddToCart}>
            {added ? "Đã thêm ✓" : "Thêm vào giỏ"}
          </button>
          <button className="btn-primary" onClick={handleBuyNow}>
            Mua ngay — Thanh toán COD
          </button>
        </div>
      )}
    </>
  );
}
