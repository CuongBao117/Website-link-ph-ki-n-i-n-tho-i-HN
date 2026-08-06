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
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();
  const displayPrice = getDisplayPrice(product);

  // Nút thêm nhanh giờ LUÔN hiển thị (không chờ hover) và là phần tử anh em của <Link>, không
  // còn lồng bên trong — xem giải thích ở khối CSS ".prod-quick-add" trong globals.css.
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

  return (
    <div className="prod-card">
      <Link href={`/san-pham/${product.slug}`} className="prod-card-link">
        <div className="prod-thumb">
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
              style={{ objectFit: "contain" }}
            />
          )}
          {outOfStock && <span className="prod-oos-badge">HẾT HÀNG</span>}
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

      {!outOfStock && (
        <button
          type="button"
          className="prod-quick-add"
          onClick={handleQuickAdd}
          aria-label={added ? "Đã thêm vào giỏ" : "Thêm nhanh vào giỏ"}
        >
          {added ? "✓" : "+"}
        </button>
      )}
    </div>
  );
}
