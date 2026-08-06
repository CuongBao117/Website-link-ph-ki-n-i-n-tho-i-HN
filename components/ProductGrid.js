import Link from "next/link";
import ProductCard from "@/components/ProductCard";

// Giữ export { ProductCard } để không phải sửa lại các chỗ import cũ dạng
// `import { ProductCard } from "@/components/ProductGrid"`.
export { ProductCard };

export default function ProductGrid({ title, idxLabel, products, moreHref }) {
  return (
    <section>
      <div className="section-head">
        <h2 className="prod-section-title">{title}</h2>
        {moreHref ? (
          <Link href={moreHref} className="idx" style={{ textDecoration: "none" }}>
            {idxLabel || "XEM TẤT CẢ →"}
          </Link>
        ) : (
          <span className="idx">{idxLabel}</span>
        )}
      </div>
      {products.length === 0 ? (
        <div className="empty-state">Chưa có sản phẩm nào.</div>
      ) : (
        <div className="prod-grid">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
