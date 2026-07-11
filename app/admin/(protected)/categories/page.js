import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import DeleteCategoryButton from "@/components/DeleteCategoryButton";

export const dynamic = "force-dynamic";

// Đếm số sản phẩm của 1 danh mục bằng head-count (chỉ hỏi Postgres con số, không kéo dòng
// dữ liệu nào về) — thay cho cách cũ là kéo TOÀN BỘ cột "category" của bảng products về rồi
// đếm bằng JS. Cách cũ với vài chục danh mục thì ổn, nhưng sắp nhập 10.000 sản phẩm thì sẽ
// kéo theo 10.000 dòng chỉ để đếm — chậm dần theo thời gian.
async function countProducts(slug) {
  const { count } = await supabaseAdmin
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category", slug);
  return count ?? 0;
}

function CategoryRow({ c }) {
  return (
    <tr key={c.slug}>
      <td className="prod-code">{c.code}</td>
      <td style={{ fontWeight: 600 }}>{c.name}</td>
      <td className="prod-code">{c.slug}</td>
      <td>
        <Link href={`/admin/products?category=${c.slug}`} style={{ color: "var(--teal)" }}>
          {c.productCount} sản phẩm
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
  );
}

export default async function AdminCategoriesPage({ searchParams }) {
  const [{ data: groups, error: groupsError }, { data: categories, error }] = await Promise.all([
    supabaseAdmin.from("category_groups").select("*").order("display_order"),
    supabaseAdmin.from("categories").select("*").order("display_order"),
  ]);

  if (error || groupsError) {
    return (
      <main>
        <div className="empty-state">Lỗi tải danh mục: {(error || groupsError).message}</div>
      </main>
    );
  }

  const categoriesWithCounts = await Promise.all(
    (categories || []).map(async (c) => ({ ...c, productCount: await countProducts(c.slug) }))
  );

  const bySlugGroup = (groups || []).map((g) => ({
    ...g,
    items: categoriesWithCounts.filter((c) => c.group_slug === g.slug),
  }));

  // Danh mục "mồ côi" — group_slug rỗng, đã bị gỡ khỏi menu/trang chủ qua các lần dọn dẹp
  // trước đây (xem migration_007/008) nhưng chưa xoá hẳn vì còn/từng có sản phẩm. Tách riêng
  // ra để nhìn phát biết ngay, không lẫn với danh mục đang sống trên site.
  const orphans = categoriesWithCounts.filter((c) => !c.group_slug);

  return (
    <main>
      <div className="section-head">
        <h2>Quản trị — Danh mục</h2>
        <span className="idx">{categoriesWithCounts.length} DANH MỤC</span>
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

      {bySlugGroup.map((g) => (
        <div key={g.slug} style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 8 }}>
            {g.name} <span className="prod-code">({g.items.length})</span>
          </h3>
          {g.items.length === 0 ? (
            <div className="empty-state" style={{ padding: 16 }}>
              Nhóm này chưa có danh mục con nào.
            </div>
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
                {g.items.map((c) => (
                  <CategoryRow key={c.slug} c={c} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {orphans.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 4, color: "#B0503A" }}>
            Đã gỡ khỏi menu ({orphans.length}) <span className="prod-code">— không hiện trên trang chủ/mega menu</span>
          </h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
            Danh mục ở đây còn/từng có sản phẩm nên chưa bị xoá hẳn. Nếu số sản phẩm = 0, bấm Xoá được luôn.
            Nếu còn sản phẩm, sửa danh mục → chọn lại 1 nhóm lớn để hiện lại trên site, hoặc chuyển sản phẩm
            sang danh mục khác rồi xoá.
          </p>
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
              {orphans.map((c) => (
                <CategoryRow key={c.slug} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
