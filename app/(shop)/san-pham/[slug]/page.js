import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, formatPrice } from "@/data/products";
import { getDisplayPrice } from "@/lib/priceOptions";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import ProductGrid from "@/components/ProductGrid";
import ProductGallery from "@/components/ProductGallery";
import { SITE_URL } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};

  const displayPrice = getDisplayPrice(product);
  const priceText = displayPrice.isRange
    ? `${formatPrice(displayPrice.min)}-${formatPrice(displayPrice.max)}`
    : formatPrice(displayPrice.price);
  const title = `${product.name} — Giá ${priceText}`;
  const description = product.specs?.length
    ? product.specs.slice(0, 4).map(([label, value]) => `${label}: ${value}`).join(" · ")
    : `${product.name} chính hãng, giao COD toàn quốc.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/san-pham/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/san-pham/${product.slug}`,
      type: "website",
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({ params }) {
  const product = await getProductBySlug(params.slug);
  if (!product) return notFound();

  const related = await getRelatedProducts(product);
  const hasPriceOptions = product.priceOptions?.length > 0;
  const displayPrice = getDisplayPrice(product);
  const discount =
    !hasPriceOptions && product.oldPrice ? Math.round(100 - (product.price / product.oldPrice) * 100) : null;
  const outOfStock = (product.stock ?? 0) <= 0;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.code,
    image: product.images?.length ? product.images : undefined,
    description: product.specs?.length
      ? product.specs.map(([label, value]) => `${label}: ${value}`).join(" · ")
      : product.name,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/san-pham/${product.slug}`,
      priceCurrency: "VND",
      price: displayPrice.price,
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <main>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="breadcrumb">
        <Link href="/">Trang chủ</Link> / {product.category} / {product.name}
      </div>

      <div className="pdp">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <span className="pdp-code">MÃ SP: {product.code}</span>
          <h1>{product.name}</h1>
          <div className="pdp-price-row">
            {/* Có phân loại nhiều giá -> ProductPurchasePanel (client) tự hiện giá theo lựa chọn
                đang chọn, không hiện giá tĩnh ở đây nữa để tránh 2 giá khác nhau cùng lúc. */}
            {!hasPriceOptions && (
              <>
                <div className="pdp-price">{formatPrice(product.price)}</div>
                {product.oldPrice && (
                  <>
                    <div className="pdp-price-old">{formatPrice(product.oldPrice)}</div>
                    <div className="pdp-badge">-{discount}%</div>
                  </>
                )}
              </>
            )}
            {outOfStock && (
              <div className="pdp-badge" style={{ background: "#F3E4E0", color: "#B0503A" }}>
                HẾT HÀNG
              </div>
            )}
          </div>

          <ProductPurchasePanel product={product} outOfStock={outOfStock} />

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
