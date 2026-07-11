import Link from "next/link";

const GROUPS = [
  { icon: "⚙️", name: "Linh kiện" },
  { icon: "🎧", name: "Phụ kiện" },
  { icon: "🔧", name: "Đồ nghề sửa chữa" },
  { icon: "🎮", name: "Đồ chơi công nghệ" },
];

export default function CategoryShowcase() {
  return (
    <div className="hero-cat-card">
      <div className="hero-cat-head">☰ Danh mục sản phẩm</div>
      <div className="hero-cat-list">
        {GROUPS.map((g) => (
          <Link key={g.name} href="#danh-muc" className="hero-cat-item">
            <span className="hero-cat-icon">{g.icon}</span>
            <span>{g.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
