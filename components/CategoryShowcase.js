import { getCategoriesGrouped } from "@/data/products";
import CategoryShowcaseList from "@/components/CategoryShowcaseList";

export default async function CategoryShowcase() {
  const items = await getCategoriesGrouped();

  return (
    <div className="hero-cat-card">
      <div className="hero-cat-head">☰ Danh mục sản phẩm</div>
      <CategoryShowcaseList items={items} />
    </div>
  );
}
