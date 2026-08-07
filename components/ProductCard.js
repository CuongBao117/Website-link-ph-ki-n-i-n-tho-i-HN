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
      {/* "Stretched link" — Link phủ kín cả thẻ (vô hình, không đè lên nội dung vì không có
          nền/chữ). Đây cũng là cách "nhấn vào hình sản phẩm -> xem chi tiết": khu vực ảnh không bị
          nút nào che thì click sẽ rơi vào link này. Các nút hành động ở trên có z-index cao hơn
          nên bấm vào chúng không bị link "nuốt" mất click. */}
      <Link href={`/san-pham/${product.slug}`} className="prod-card-stretched-link" aria-label={product.name} />

      <div className={`prod-thumb${product.imageUrl ? "" : " prod-thumb--empty"}`}>
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
        {!outOfStock && (
          /* Desktop (có chuột/hover): di chuột vào ảnh hiện 2 lựa chọn */
          <div className="prod-hover-actions">
            <Link
              href={`/san-pham/${product.slug}`}
              className="prod-action prod-action--detail"
              onClick={(e) => e.stopPropagation()}
            >
              Xem chi tiết
            </Link>
            <button type="button" className="prod-action prod-action--cart" onClick={handleQuickAdd}>
              {added ? "✓ Đã thêm" : "Thêm vào giỏ hàng"}
            </button>
          </div>
        )}
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
        {!outOfStock && (
          /* Mobile/tablet (không có hover): nút thêm vào giỏ hiện sẵn dưới giá, không đè lên ảnh
             nữa (trước đây đặt tuyệt đối trên .prod-thumb, che mất góc ảnh sản phẩm). */
          <button
            type="button"
            className="prod-mobile-add"
            onClick={handleQuickAdd}
            aria-label={added ? "Đã thêm vào giỏ" : "Thêm vào giỏ hàng"}
          >
            {added ? "✓ Đã thêm" : "Thêm vào giỏ hàng"}
          </button>
        )}
      </div>
    </div>
  );
}
