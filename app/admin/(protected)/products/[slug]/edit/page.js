import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateProduct } from "@/app/admin/(protected)/products/actions";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params, searchParams }) {
  const [{ data: product }, { data: groups }, { data: categories }] = await Promise.all([
    supabaseAdmin.from("products").select("*").eq("slug", params.slug).maybeSingle(),
    supabaseAdmin.from("category_groups").select("*").order("display_order"),
    supabaseAdmin.from("categories").select("*").order("display_order"),
  ]);

  if (!product) return notFound();

  // Chỉ liệt kê danh mục đang thuộc 1 nhóm lớn — ProductForm tự xử lý riêng trường hợp sản
  // phẩm đang ở 1 danh mục mồ côi (đã gỡ khỏi menu) bằng cảnh báo, không cần lọc thêm ở đây.
  const categoryGroups = (groups || []).map((g) => ({
    slug: g.slug,
    name: g.name,
    categories: (categories || []).filter((c) => c.group_slug === g.slug),
  }));

  const defaultValues = {
    slug: product.slug,
    code: product.code,
    name: product.name,
    price: product.price,
    oldPrice: product.old_price,
    stock: product.stock,
    category: product.category,
    brand: product.brand,
    variants: product.variants,
    defaultVariant: product.default_variant,
    specs: product.specs,
    imageUrl: product.image_url,
    images: Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image_url
      ? [product.image_url]
      : [],
  };

  const boundUpdateProduct = updateProduct.bind(null, product.slug);

  return (
    <main>
      <div className="section-head">
        <h2>Sửa sản phẩm — {product.name}</h2>
      </div>

      {searchParams?.error && (
        <div className="empty-state" style={{ color: "#B0503A", marginBottom: 20, padding: 16 }}>
          Có lỗi khi lưu sản phẩm: {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <ProductForm
        action={boundUpdateProduct}
        categoryGroups={categoryGroups}
        defaultValues={defaultValues}
        isEdit={true}
      />
    </main>
  );
}
