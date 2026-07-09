import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, formatPrice } from "@/data/products";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import ProductGrid from "@/components/ProductGrid";
import ProductGallery from "@/components/ProductGallery";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }) {
  const product = await getProductBySlug(params.slug);
  if (!product) return notFound();

  const related = await getRelatedProducts(product.slug);
  const discount = product.oldPrice
    ? Math.round(100 - (product.price / product.oldPrice) * 100)
    : null;
  const outOfStock = (product.stock ?? 0) <= 0;

  return (
    <main>
      <div className="breadcrumb">
        <Link href="/">Trang chủ</Link> / {product.category} / {product.name}
      </div>

      <div className="pdp">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <span className="pdp-code">MÃ SP: {product.code}</span>
          <h1>{product.name}</h1>
          <div className="pdp-price-row">
            <div className="pdp-price">{formatPrice(product.price)}</div>
            {product.oldPrice && (
              <>
                <div className="pdp-price-old">{formatPrice(product.oldPrice)}</div>
                <div className="pdp-badge">-{discount}%</div>
              </>
            )}
            {outOfStock && (
              <div className="pdp-badge" style={{ background: "#F3E4E0", color: "#B0503A" }}>
                HẾT HÀNG
              </div>
            )}
          </div>

          <ProductPurchasePanel product={product} />

          <div className="pdp-trust">
            <div><span className="ok">✓</span>Giao hàng thu tiền tận nơi (COD) toàn quốc</div>
            <div><span className="ok">✓</span>Hỗ trợ chuyển khoản trước, kiểm tra kỹ trước khi đóng gói</div>
            <div><span className="ok">✓</span>Bảo hành theo chính sách từng loại linh kiện</div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2>Thông số chi tiết</h2>
        <span className="idx">DATASHEET</span>
      </div>
      <table className="spec-table">
        <tbody>
          {product.specs.map(([label, value]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 48 }}>
        <ProductGrid title="Sản phẩm liên quan" idxLabel="CÙNG DÒNG MÁY" products={related} />
      </div>
    </main>
  );
}
