import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import DeleteCategoryButton from "@/components/DeleteCategoryButton";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({ searchParams }) {
  const [{ data: categories, error }, { data: products }] = await Promise.all([
    supabaseAdmin.from("categories").select("*").order("code"),
    supabaseAdmin.from("products").select("category"),
  ]);

  if (error) {
    return (
      <main>
        <div className="empty-state">Lỗi tải danh mục: {error.message}</div>
      </main>
    );
  }

  const countBySlug = {};
  (products || []).forEach((p) => {
    countBySlug[p.category] = (countBySlug[p.category] || 0) + 1;
  });

  return (
    <main>
      <div className="section-head">
        <h2>Quản trị — Danh mục</h2>
        <span className="idx">{(categories || []).length} DANH MỤC</span>
      </div>

      {searchParams?.error && (
        <div className="empty-state" style={{ color: "#B0503A", marginBottom: 20, padding: 16 }}>
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <Link
          href="/admin/categories/new"
          className="btn-primary"
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          + Thêm danh mục mới
        </Link>
      </div>

      {(categories || []).length === 0 ? (
        <div className="empty-state">Chưa có danh mục nào.</div>
      ) : (
        <table className="cart-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên danh mục</th>
              <th>Slug</th>
              <th>Số sản phẩm</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.slug}>
                <td className="prod-code">{c.code}</td>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className="prod-code">{c.slug}</td>
                <td>
                  <Link href={`/admin/products?category=${c.slug}`} style={{ color: "var(--teal)" }}>
                    {countBySlug[c.slug] || 0} sản phẩm
                  </Link>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Link
                    href={`/admin/categories/${c.slug}/edit`}
                    className="cart-remove"
                    style={{ textDecoration: "none", marginRight: 8, display: "inline-block" }}
                  >
                    Sửa
                  </Link>
                  <DeleteCategoryButton slug={c.slug} name={c.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
