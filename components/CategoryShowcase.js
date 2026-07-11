import { getCategoriesGrouped } from "@/data/products";
import CategoryShowcaseList from "@/components/CategoryShowcaseList";

// Icon chỉ để trang trí — map theo slug nhóm (bảng "category_groups" trong DB, xem
// migration_011). Nhóm nào chưa có icon riêng (mới tạo thêm ở /admin) dùng icon mặc định.
const GROUP_ICONS = {
  "linh-kien": "⚙️",
  "phu-kien": "🎧",
  "do-nghe": "🔧",
  "do-choi-cong-nghe": "🎮",
};
const DEFAULT_ICON = "🔲";

export default async function CategoryShowcase() {
  const groups = await getCategoriesGrouped();
  const items = groups.map((g) => ({ ...g, icon: GROUP_ICONS[g.slug] || DEFAULT_ICON }));

  return (
    <div className="hero-cat-card">
      <div className="hero-cat-head">☰ Danh mục sản phẩm</div>
      <CategoryShowcaseList items={items} />
    </div>
  );
}
