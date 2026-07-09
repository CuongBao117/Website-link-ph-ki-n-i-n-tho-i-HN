import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createProduct } from "@/app/admin/(protected)/products/actions";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage({ searchParams }) {
  const { data: categories } = await supabaseAdmin.from("categories").select("*").order("code");

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

      <ProductForm action={createProduct} categories={categories || []} isEdit={false} />
    </main>
  );
}
