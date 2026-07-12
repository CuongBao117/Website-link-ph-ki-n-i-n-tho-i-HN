import Link from "next/link";
import { redirect } from "next/navigation";
import { getFilteredProducts } from "@/data/products";
import CategoryProductList from "@/components/CategoryProductList";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const { products, totalCount, totalPages, facets, suggestions, error } = q
    ? await getFilteredProducts({
        q,
        brand: searchParams?.brand,
        variant: searchParams?.variant,
        minPrice: searchParams?.minPrice,
        maxPrice: searchParams?.maxPrice,
        sort: searchParams?.sort,
        page,
      })
    : { products: [], totalCount: 0, totalPages: 1, facets: { brands: [], variants: [] }, suggestions: [] };

  // Số trang vượt quá thực tế (gõ tay ?page=999...) -> tự chuyển về trang cuối hợp lệ, tránh
  // hiện "không tìm thấy sản phẩm" gây hiểu lầm là hết hàng dù thực ra chỉ lệch trang.
  if (q && !error && page > totalPages) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(totalPages));
    redirect(`/tim-kiem?${params.toString()}`);
  }

  return (
    <main>
      <div className="breadcrumb">
        <Link href="/">Trang chủ</Link> / Tìm kiếm
      </div>

      <div className="section-head">
        <h2>Kết quả tìm kiếm{q ? `: "${q}"` : ""}</h2>
        <span className="idx">{totalCount} SẢN PHẨM</span>
      </div>

      {!q ? (
        <div className="empty-state">
          Gõ tên sản phẩm hoặc tên máy (ví dụ "iPhone 13", "pin Samsung"...) vào ô tìm kiếm ở đầu trang.
        </div>
      ) : error ? (
        <div className="empty-state" style={{ color: "#B0503A" }}>
          {error}
        </div>
      ) : (
        <CategoryProductList
          products={products}
          totalCount={totalCount}
          facets={facets}
          page={page}
          suggestions={suggestions}
        />
      )}
    </main>
  );
}
