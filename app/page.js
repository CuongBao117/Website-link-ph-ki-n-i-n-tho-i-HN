import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import ProductGrid from "@/components/ProductGrid";
import { getCategories, getFilteredProducts } from "@/data/products";

export const dynamic = "force-dynamic";

const PREVIEW_COUNT = 8;

export default async function HomePage() {
  const categories = await getCategories();

  const sections = await Promise.all(
    categories.map(async (c) => {
      const { products, totalCount } = await getFilteredProducts({
        category: c.slug,
        pageSize: PREVIEW_COUNT,
        page: 1,
      });
      return { category: c, products, totalCount };
    })
  );

  // Chỉ hiện các danh mục đã có sản phẩm — danh mục trống (chưa nhập hàng) sẽ không làm rối trang chủ.
  const nonEmptySections = sections.filter((s) => s.totalCount > 0);

  return (
    <main>
      <Hero />
      <TrustStrip />

      <div id="danh-muc" />

      {nonEmptySections.length === 0 ? (
        <div className="empty-state">Cửa hàng chưa có sản phẩm nào — vào trang quản trị để thêm sản phẩm đầu tiên.</div>
      ) : (
        nonEmptySections.map((s) => (
          <ProductGrid
            key={s.category.slug}
            title={s.category.name}
            idxLabel={`XEM TẤT CẢ (${s.totalCount}) →`}
            moreHref={`/danh-muc/${s.category.slug}`}
            products={s.products}
          />
        ))
      )}
    </main>
  );
}
