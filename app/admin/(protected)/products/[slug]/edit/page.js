import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateProduct } from "@/app/admin/(protected)/products/actions";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params, searchParams }) {
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabaseAdmin.from("products").select("*").eq("slug", params.slug).maybeSingle(),
    supabaseAdmin.from("categories").select("*").order("code"),
  ]);

  if (!product) return notFound();

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
        categories={categories || []}
        defaultValues={defaultValues}
        isEdit={true}
      />
    </main>
  );
}
