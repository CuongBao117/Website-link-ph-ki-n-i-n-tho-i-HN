import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createCategory } from "@/app/admin/(protected)/categories/actions";
import CategoryForm from "@/components/CategoryForm";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage({ searchParams }) {
  const { data: groups } = await supabaseAdmin.from("category_groups").select("*").order("display_order");

  return (
    <main>
      <div className="section-head">
        <h2>Thêm danh mục mới</h2>
      </div>

      {searchParams?.error && (
        <div className="empty-state" style={{ color: "#B0503A", marginBottom: 20, padding: 16 }}>
          Có lỗi khi thêm danh mục: {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <CategoryForm action={createCategory} groups={groups || []} isEdit={false} />
    </main>
  );
}
