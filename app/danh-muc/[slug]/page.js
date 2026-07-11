import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, getCategories, getFilteredProducts } from "@/data/products";
import CategoryProductList from "@/components/CategoryProductList";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params, searchParams }) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return notFound();

  const page = Math.max(1, Number(searchParams?.page) || 1);

  const [{ products, totalCount, facets }, categories] = await Promise.all([
    getFilteredProducts({
      category: category.slug,
      brand: searchParams?.brand,
      variant: searchParams?.variant,
      minPrice: searchParams?.minPrice,
      maxPrice: searchParams?.maxPrice,
      sort: searchParams?.sort,
      page,
    }),
    getCategories(),
  ]);

  return (
    <main>
      <div className="breadcrumb">
        <Link href="/">Trang chủ</Link> / {category.name}
      </div>

      <div className="section-head">
        <h2>{category.name}</h2>
        <span className="idx">{category.code}</span>
      </div>

      <div className="cat-pills">
        {categories
          .filter((c) => c.group_slug)
          .map((c) => (
            <Link
              key={c.slug}
              href={`/danh-muc/${c.slug}`}
              className={`cat-pill ${c.slug === category.slug ? "active" : ""}`}
            >
              {c.name}
            </Link>
          ))}
      </div>

      <CategoryProductList products={products} totalCount={totalCount} facets={facets} page={page} />
    </main>
  );
}
