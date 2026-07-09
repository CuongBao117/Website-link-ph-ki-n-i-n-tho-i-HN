import Link from "next/link";

export default function CategoryGrid({ categories }) {
  return (
    <section>
      <div className="section-head">
        <h2>Danh mục linh kiện</h2>
        <span className="idx">{categories.length.toString().padStart(2, "0")} NHÓM CHÍNH</span>
      </div>
      <div className="cat-grid">
        {categories.map((c) => (
          <Link key={c.slug} href={`/danh-muc/${c.slug}`} className="cat-card">
            <span className="code">{c.code}</span>
            <div className="name">{c.name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
