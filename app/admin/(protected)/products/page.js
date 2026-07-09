import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPrice } from "@/data/products";
import DeleteProductButton from "@/components/DeleteProductButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function buildPageHref({ q, category, stock, page }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category && category !== "all") params.set("category", category);
  if (stock && stock !== "all") params.set("stock", stock);
  params.set("page", String(page));
  return `/admin/products?${params.toString()}`;
}

export default async function AdminProductsPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  const categoryFilter = searchParams?.category || "all";
  const stockFilter = searchParams?.stock || "all";
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const { data: categories } = await supabaseAdmin.from("categories").select("*").order("code");

  let query = supabaseAdmin.from("products").select("*", { count: "exact" });

  if (q) {
    const escaped = q.replace(/[%,]/g, "");
    query = query.or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%`);
  }
  if (categoryFilter !== "all") {
    query = query.eq("category", categoryFilter);
  }
  if (stockFilter === "out") {
    query = query.lte("stock", 0);
  } else if (stockFilter === "low") {
    query = query.gt("stock", 0).lte("stock", 5);
  } else if (stockFilter === "in") {
    query = query.gt("stock", 0);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: products, error, count } = await query.order("code").range(from, to);

  if (error) {
    return (
      <main>
        <div className="empty-state">Lỗi tải sản phẩm: {error.message}</div>
      </main>
    );
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = Boolean(q) || categoryFilter !== "all" || stockFilter !== "all";

  return (
    <main>
      <div className="section-head">
        <h2>Quản trị — Sản phẩm</h2>
        <span className="idx">{totalCount} SẢN PHẨM</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Link
          href="/admin/products/new"
          className="btn-primary"
          style={{ textDecoration: "none", display: "inline-block" }}
        >
          + Thêm sản phẩm mới
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
        <select name="stock" defaultValue={stockFilter} className="sort-select">
          <option value="all">Tất cả tồn kho</option>
          <option value="in">Còn hàng</option>
          <option value="low">Sắp hết (≤5)</option>
          <option value="out">Hết hàng</option>
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
                <th>Tồn kho</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const outOfStock = (p.stock ?? 0) <= 0;
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
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: outOfStock ? "#B0503A" : "var(--ink)",
                        }}
                      >
                        {p.stock ?? 0}
                      </span>
                      {outOfStock && (
                        <div style={{ fontSize: 11, color: "#B0503A", fontFamily: "var(--font-mono), monospace" }}>
                          HẾT HÀNG
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
                href={buildPageHref({ q, category: categoryFilter, stock: stockFilter, page: Math.max(1, page - 1) })}
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
                  stock: stockFilter,
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
