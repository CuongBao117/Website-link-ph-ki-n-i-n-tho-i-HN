"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";

export default function ProductPurchasePanel({ product }) {
  const [variant, setVariant] = useState(product.defaultVariant || product.variants[0]);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  // Không chọn số lượng ở đây nữa — luôn thêm 1, muốn mua nhiều hơn thì chỉnh trong giỏ hàng
  // (trang /gio-hang đã có sẵn nút +/-). Đơn giản hoá vì shop không quản lý tồn kho chi tiết.
  function handleAddToCart() {
    addItem(product, variant, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    addItem(product, variant, 1);
    router.push("/gio-hang");
  }

  return (
    <>
      <div className="variant-label">Chọn dòng máy / phiên bản</div>
      <div className="variant-chips">
        {product.variants.map((v) => (
          <div key={v} className={`chip ${variant === v ? "active" : ""}`} onClick={() => setVariant(v)}>
            {v}
          </div>
        ))}
      </div>

      <div className="pdp-ctas">
        <button className="btn-outline" onClick={handleAddToCart}>
          {added ? "Đã thêm ✓" : "Thêm vào giỏ"}
        </button>
        <button className="btn-primary" onClick={handleBuyNow}>
          Mua ngay — Thanh toán COD
        </button>
      </div>
    </>
  );
}
