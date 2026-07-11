import Link from "next/link";
import { getCategoryGroups } from "@/data/products";

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
  const groups = await getCategoryGroups();

  return (
    <div className="hero-cat-card">
      <div className="hero-cat-head">☰ Danh mục sản phẩm</div>
      <div className="hero-cat-list">
        {groups.map((g) => (
          <Link key={g.slug} href="#danh-muc" className="hero-cat-item">
            <span className="hero-cat-icon">{GROUP_ICONS[g.slug] || DEFAULT_ICON}</span>
            <span>{g.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
