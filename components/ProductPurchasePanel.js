"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

export default function ProductPurchasePanel({ product, outOfStock = false }) {
  const [variant, setVariant] = useState(product.defaultVariant || product.variants[0]);
  // Phân loại có giá riêng (vd "Vỏ" 100k / "Xương" 45k) — KHÁC dòng máy tương thích ở trên, đây
  // là lựa chọn quyết định GIÁ, giống chọn size quần áo. Mặc định chọn phân loại đầu tiên nếu có.
  const [priceOption, setPriceOption] = useState(product.priceOptions?.[0]?.name || null);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  const hasPriceOptions = product.priceOptions?.length > 0;
  const selectedOption = hasPriceOptions ? product.priceOptions.find((o) => o.name === priceOption) : null;
  const effectivePrice = selectedOption ? selectedOption.price : product.price;

  // Không chọn số lượng ở đây nữa — luôn thêm 1, muốn mua nhiều hơn thì chỉnh trong giỏ hàng
  // (trang /gio-hang đã có sẵn nút +/-). Đơn giản hoá vì shop không quản lý tồn kho chi tiết.
  function handleAddToCart() {
    if (outOfStock) return;
    addItem(product, variant, 1, priceOption);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    if (outOfStock) return;
    addItem(product, variant, 1, priceOption);
    router.push("/dat-hang");
  }

  return (
    <>
      {hasPriceOptions && (
        <>
          <div className="variant-label">Chọn phân loại</div>
          <div className="variant-chips">
            {product.priceOptions.map((o) => (
              <div
                key={o.name}
                className={`chip ${priceOption === o.name ? "active" : ""}`}
                onClick={() => setPriceOption(o.name)}
              >
                {o.name} — {formatPrice(o.price)}
              </div>
            ))}
          </div>
        </>
      )}

      {hasPriceOptions && <div className="pdp-price">{formatPrice(effectivePrice)}</div>}

      {product.variants.length > 0 && (
        <>
          <div className="variant-label">Chọn dòng máy / phiên bản</div>
          <div className="variant-chips">
            {product.variants.map((v) => (
              <div key={v} className={`chip ${variant === v ? "active" : ""}`} onClick={() => setVariant(v)}>
                {v}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pdp-ctas">
        <button className="btn-outline" onClick={handleAddToCart} disabled={outOfStock}>
          {outOfStock ? "Hết hàng" : added ? "Đã thêm ✓" : "Thêm vào giỏ"}
        </button>
        <button className="btn-primary" onClick={handleBuyNow} disabled={outOfStock}>
          {outOfStock ? "Hết hàng" : "Mua ngay — Thanh toán COD"}
        </button>
      </div>
    </>
  );
}
