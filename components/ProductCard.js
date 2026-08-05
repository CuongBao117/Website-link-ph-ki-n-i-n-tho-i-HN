"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/data/products";
import { getDisplayPrice } from "@/lib/priceOptions";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }) {
  const outOfStock = (product.stock ?? 0) <= 0;
  const [hovered, setHovered] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();
  const displayPrice = getDisplayPrice(product);

  function handleQuickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    const variant = product.defaultVariant || product.variants?.[0] || "Mặc định";
    // Có nhiều phân loại giá khác nhau -> quick-add không đủ chỗ để chọn, đưa thẳng qua trang chi
    // tiết để khách tự chọn đúng phân loại (giống bấm chọn size trước khi thêm giỏ, tránh thêm
    // nhầm giá).
    if (product.priceOptions?.length > 1) {
      router.push(`/san-pham/${product.slug}`);
      return;
    }
    const priceOption = product.priceOptions?.[0]?.name || null;
    addItem(product, variant, 1, priceOption);
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
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            style={{ objectFit: "cover" }}
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
          {displayPrice.isRange
            ? `${formatPrice(displayPrice.min)}-${formatPrice(displayPrice.max)}`
            : formatPrice(displayPrice.price)}
          {!displayPrice.isRange && product.oldPrice && <span className="old">{formatPrice(product.oldPrice)}</span>}
        </div>
      </div>
    </Link>
  );
}
