import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import { getCategories, getFilteredProducts } from "@/data/products";

// ISR: trang chủ được cache và tái tạo lại tối đa mỗi 60 giây thay vì query DB ở MỌI lượt
// truy cập. Giá/tồn kho hiện ở đây có thể trễ tối đa 60s so với thực tế — chấp nhận được cho
// khu vực xem trước; trang chi tiết sản phẩm và giỏ hàng/đặt hàng vẫn luôn real-time.
export const revalidate = 60;

const PREVIEW_COUNT = 8;

export default async function HomePage() {
  const allCategories = await getCategories();

  // Chỉ hiện những danh mục CÒN thuộc 1 trong 4 nhóm chính thức (group_slug khác null).
  // Các danh mục "cũ" như "Cáp & Sạc (cũ — chuyển sản phẩm sang...)" đã bị gỡ khỏi group_slug
  // ở migration_007/008 (xem file .sql) — đúng ra không nên hiện nữa, nhưng trang chủ trước
  // đây lấy TOÀN BỘ danh mục không lọc, nên tên ghi chú nội bộ đó lại lộ ra ngoài trang chủ.
  const categories = allCategories.filter((c) => c.group_slug);

  const sections = await Promise.all(
    categories.map(async (c) => {
      const { products, totalCount } = await getFilteredProducts({
        category: c.slug,
        pageSize: PREVIEW_COUNT,
        page: 1,
        withFacets: false,
      });
      return { category: c, products, totalCount };
    })
  );

  // Chỉ hiện các danh mục đã có sản phẩm — danh mục trống (chưa nhập hàng) sẽ không làm rối trang chủ.
  const nonEmptySections = sections.filter((s) => s.totalCount > 0);

  return (
    <main>
      <Hero />

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
