import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createProduct } from "@/app/admin/(protected)/products/actions";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage({ searchParams }) {
  const [{ data: groups }, { data: categories }] = await Promise.all([
    supabaseAdmin.from("category_groups").select("*").order("display_order"),
    supabaseAdmin.from("categories").select("*").order("display_order"),
  ]);

  // Chỉ liệt kê danh mục đang thuộc 1 nhóm lớn (group_slug khớp) — xem giải thích trong ProductForm.js.
  const categoryGroups = (groups || []).map((g) => ({
    slug: g.slug,
    name: g.name,
    categories: (categories || []).filter((c) => c.group_slug === g.slug),
  }));

  return (
    <main>
      <div className="section-head">
        <h2>Thêm sản phẩm mới</h2>
      </div>

      {searchParams?.error && (
        <div className="empty-state" style={{ color: "#B0503A", marginBottom: 20, padding: 16 }}>
          Có lỗi khi thêm sản phẩm: {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <ProductForm action={createProduct} categoryGroups={categoryGroups} isEdit={false} />
    </main>
  );
}
