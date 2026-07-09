"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/data/products";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }) {
  const outOfStock = (product.stock ?? 0) <= 0;
  const [hovered, setHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  function handleQuickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    const variant = product.defaultVariant || product.variants?.[0] || "Mặc định";
    addItem(product, variant, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleQuickView(e) {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/san-pham/${product.slug}`);
  }

  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="prod-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="prod-thumb" style={{ position: "relative" }}>
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}
        {outOfStock && (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "#F3E4E0",
              color: "#B0503A",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 3,
              zIndex: 2,
            }}
          >
            HẾT HÀNG
          </span>
        )}

        {/* Hiệu ứng hover: 2 nút "Thêm vào giỏ" + "Xem chi tiết" nổi lên trên ảnh */}
        <div className={`prod-hover-actions ${hovered ? "visible" : ""}`}>
          {!outOfStock && (
            <button type="button" className="prod-hover-btn primary" onClick={handleQuickAdd}>
              {added ? "Đã thêm ✓" : "Thêm vào giỏ"}
            </button>
          )}
          <button type="button" className="prod-hover-btn" onClick={handleQuickView}>
            Xem chi tiết
          </button>
        </div>
      </div>
      <div className="prod-body">
        <span className="prod-code">{product.code}</span>
        <div className="prod-name">{product.name}</div>
        <div className="prod-price">
          {formatPrice(product.price)}
          {product.oldPrice && <span className="old">{formatPrice(product.oldPrice)}</span>}
        </div>
      </div>
    </Link>
  );
}
