import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateCategory } from "@/app/admin/(protected)/categories/actions";
import CategoryForm from "@/components/CategoryForm";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params, searchParams }) {
  const [{ data: category }, { data: groups }] = await Promise.all([
    supabaseAdmin.from("categories").select("*").eq("slug", params.slug).maybeSingle(),
    supabaseAdmin.from("category_groups").select("*").order("display_order"),
  ]);

  if (!category) return notFound();

  const boundUpdateCategory = updateCategory.bind(null, category.slug);

  return (
    <main>
      <div className="section-head">
        <h2>Sửa danh mục — {category.name}</h2>
      </div>

      {searchParams?.error && (
        <div className="empty-state" style={{ color: "#B0503A", marginBottom: 20, padding: 16 }}>
          Có lỗi khi lưu danh mục: {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <CategoryForm action={boundUpdateCategory} defaultValues={category} groups={groups || []} isEdit={true} />
    </main>
  );
}
