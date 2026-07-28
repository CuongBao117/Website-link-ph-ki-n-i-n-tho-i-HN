import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPrice, FACET_ROW_LIMIT } from "@/data/products";
import DeleteProductButton from "@/components/DeleteProductButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function buildPageHref({ q, category, brand, variant, page }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category && category !== "all") params.set("category", category);
  if (brand && brand !== "all") params.set("brand", brand);
  if (variant && variant !== "all") params.set("variant", variant);
  params.set("page", String(page));
  return `/admin/products?${params.toString()}`;
}

export default async function AdminProductsPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  const categoryFilter = searchParams?.category || "all";
  const brandFilter = searchParams?.brand || "all";
  const variantFilter = searchParams?.variant || "all";
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const { data: categories } = await supabaseAdmin.from("categories").select("*").order("display_order");

  let query = supabaseAdmin.from("products").select("*", { count: "exact" });

  if (q) {
    const escaped = q.replace(/[%,]/g, "");
    query = query.or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%,variants_text.ilike.%${escaped}%`);
  }
  if (categoryFilter !== "all") {
    query = query.eq("category", categoryFilter);
  }
  if (brandFilter !== "all") {
    query = query.eq("brand", brandFilter);
  }
  if (variantFilter !== "all") {
    query = query.contains("variants", [variantFilter]);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: products, error, count } = await query.order("code").range(from, to);

  // Danh sách Hãng/Đời máy để đổ vào 2 dropdown lọc — chỉ lấy 2 cột nhẹ (brand, variants),
  // không lấy nguyên dòng sản phẩm. Dùng đúng 2 cột đã có sẵn và đang chạy ở bộ lọc trang tìm
  // kiếm khách hàng (xem getFilteredProducts trong data/products.js) — không thêm dữ liệu mới.
  const { data: facetRows } = await supabaseAdmin
    .from("products")
    .select("brand, variants")
    .limit(FACET_ROW_LIMIT);
  const brandOptions = Array.from(new Set((facetRows || []).map((p) => p.brand).filter(Boolean))).sort();
  const variantOptions = Array.from(
    new Set((facetRows || []).flatMap((p) => p.variants || []).filter(Boolean))
  ).sort();

  if (error) {
    return (
      <main>
        <div className="empty-state">Lỗi tải sản phẩm: {error.message}</div>
      </main>
    );
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = Boolean(q) || categoryFilter !== "all" || brandFilter !== "all" || variantFilter !== "all";

  return (
    <main>
      <div className="section-head">
        <h2>Quản trị — Sản phẩm</h2>
        <span className="idx">{totalCount} SẢN PHẨM</span>
      </div>

      <div style={{ marginBottom: 20, display: "flex", gap: 12 }}>
        <Link
          href="/admin/products/new"
          className="btn-primary"
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          + Thêm sản phẩm mới
        </Link>
        <Link
          href="/admin/products/import"
          className="cart-remove"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          Nhập hàng loạt từ CSV
        </Link>
        <Link
          href="/admin/products/gan-anh"
          className="cart-remove"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          Gán ảnh hàng loạt
        </Link>
        <Link
          href="/admin/products/nhap-nhanh"
          className="cart-remove"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          Nhập nhanh nhiều dòng máy
        </Link>
        <Link href="/admin/products/nhap-zalo" className="cart-remove" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Nhập từ bài đăng Zalo
        </Link>
        <Link href="/admin/products/ghep-anh-zalo" className="cart-remove" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Ghép ảnh từ ảnh chụp màn hình Zalo
        </Link>
      </div>

      <form method="GET" className="admin-filter-bar">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tên hoặc mã sản phẩm..."
          className="admin-filter-input"
        />
        <select name="category" defaultValue={categoryFilter} className="sort-select">
          <option value="all">Tất cả danh mục</option>
          {(categories || []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="brand" defaultValue={brandFilter} className="sort-select">
          <option value="all">Tất cả hãng</option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select name="variant" defaultValue={variantFilter} className="sort-select">
          <option value="all">Tất cả đời máy</option>
          {variantOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Lọc
        </button>
        {hasFilters && (
          <Link
            href="/admin/products"
            className="cart-remove"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Xoá bộ lọc
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <div className="empty-state">Không tìm thấy sản phẩm nào phù hợp.</div>
      ) : (
        <>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Mã / Tên</th>
                <th>Danh mục</th>
                <th>Giá</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                return (
                  <tr key={p.slug}>
                    <td>
                      <div className="admin-thumb">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} />
                        ) : (
                          <span className="admin-thumb-empty">Chưa có ảnh</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="prod-code">{p.code}</div>
                      <div style={{ fontWeight: 600, marginTop: 2 }}>{p.name}</div>
                    </td>
                    <td>{p.category}</td>
                    <td style={{ fontWeight: 700, color: "var(--copper-dark)", whiteSpace: "nowrap" }}>
                      {formatPrice(p.price)}
                      {p.old_price && (
                        <div
                          style={{
                            fontWeight: 400,
                            fontSize: 12,
                            color: "#9AA6A0",
                            textDecoration: "line-through",
                          }}
                        >
                          {formatPrice(p.old_price)}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <Link
                        href={`/admin/products/${p.slug}/edit`}
                        className="cart-remove"
                        style={{ textDecoration: "none", marginRight: 8, display: "inline-block" }}
                      >
                        Sửa
                      </Link>
                      <DeleteProductButton slug={p.slug} name={p.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <Link
                href={buildPageHref({
                  q,
                  category: categoryFilter,
                  brand: brandFilter,
                  variant: variantFilter,
                  page: Math.max(1, page - 1),
                })}
                className={`cart-remove ${page <= 1 ? "disabled-link" : ""}`}
                style={{ textDecoration: "none" }}
              >
                ← Trước
              </Link>
              <span className="prod-code">
                Trang {page} / {totalPages}
              </span>
              <Link
                href={buildPageHref({
                  q,
                  category: categoryFilter,
                  brand: brandFilter,
                  variant: variantFilter,
                  page: Math.min(totalPages, page + 1),
                })}
                className={`cart-remove ${page >= totalPages ? "disabled-link" : ""}`}
                style={{ textDecoration: "none" }}
              >
                Sau →
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
