import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatPrice } from "@/data/products";
import ClearProductImagesButton from "@/components/ClearProductImagesButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

function buildPageHref({ category, page }) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  params.set("page", String(page));
  return `/admin/products/duyet-anh?${params.toString()}`;
}

// Trang rà soát nhanh ảnh sản phẩm — sắp "sửa gần đây nhất" lên đầu (cột updated_at, xem
// migration_018) vì lỗi gán nhầm ảnh thường đến từ các lần "Nhập từ bài đăng Zalo" trước đây
// (UPDATE vào sản phẩm ĐÃ CÓ SẴN nên created_at không đổi, chỉ updated_at mới phản ánh đúng).
// Không sửa tên/giá/danh mục ở đây — chỉ để lướt mắt qua ảnh và xoá ảnh sai nhanh, không cần mở
// từng trang sửa sản phẩm.
export default async function DuyetAnhPage({ searchParams }) {
  const categoryFilter = searchParams?.category || "all";
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: categories } = await supabaseAdmin.from("categories").select("*").order("display_order");

  let query = supabaseAdmin
    .from("products")
    .select("slug, code, name, price, category, images, image_url, updated_at", { count: "exact" });
  if (categoryFilter !== "all") {
    query = query.eq("category", categoryFilter);
  }

  const { data: products, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <main>
        <div className="empty-state">
          Lỗi tải sản phẩm: {error.message}
          {error.message?.includes("updated_at") && (
            <>
              <br />
              <span style={{ fontSize: 12 }}>
                Cần chạy file supabase/migration_018_products_updated_at.sql trong Supabase Dashboard trước.
              </span>
            </>
          )}
        </div>
      </main>
    );
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main>
      <div className="section-head">
        <h2>Duyệt lại ảnh sản phẩm</h2>
        <span className="idx">{totalCount} SẢN PHẨM · SỬA GẦN ĐÂY LÊN ĐẦU</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/products" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          ← Quay lại danh sách sản phẩm
        </Link>
      </div>

      <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 16, maxWidth: 640 }}>
        Lướt qua từng sản phẩm — ảnh nào không khớp tên (do trước đây khớp nhầm sản phẩm lúc
        &quot;Nhập từ bài đăng Zalo&quot;) thì bấm <b>&quot;Xoá ảnh sai&quot;</b>. Sản phẩm{" "}
        <b>không bị xoá</b>, chỉ mất ảnh — gắn lại ảnh đúng sau qua &quot;Gán ảnh hàng loạt&quot;.
      </p>

      <form method="GET" className="admin-filter-bar" style={{ marginBottom: 20 }}>
        <select name="category" defaultValue={categoryFilter} className="sort-select">
          <option value="all">Tất cả danh mục</option>
          {(categories || []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Lọc
        </button>
        {categoryFilter !== "all" && (
          <Link
            href="/admin/products/duyet-anh"
            className="cart-remove"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Xoá bộ lọc
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <div className="empty-state">Không có sản phẩm nào.</div>
      ) : (
        <>
          <div className="review-grid">
            {products.map((p) => {
              const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : p.image_url ? [p.image_url] : [];
              return (
                <div key={p.slug} className="review-card">
                  <div className="review-thumbs">
                    {images.length > 0 ? (
                      images.slice(0, 4).map((url, i) => <img key={i} src={url} alt={p.name} />)
                    ) : (
                      <span className="review-thumbs-empty">Chưa có ảnh</span>
                    )}
                  </div>
                  <div className="prod-code">{p.code}</div>
                  <div style={{ fontWeight: 600, margin: "2px 0 6px", fontSize: 13.5 }}>{p.name}</div>
                  <div style={{ fontWeight: 700, color: "var(--copper-dark)", marginBottom: 6 }}>
                    {formatPrice(p.price)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 10 }}>
                    Sửa lúc: {new Date(p.updated_at).toLocaleString("vi-VN")}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link
                      href={`/admin/products/${p.slug}/edit`}
                      className="cart-remove"
                      style={{ textDecoration: "none", display: "inline-block" }}
                    >
                      Sửa
                    </Link>
                    {images.length > 0 && <ClearProductImagesButton slug={p.slug} name={p.name} />}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <Link
                href={buildPageHref({ category: categoryFilter, page: Math.max(1, page - 1) })}
                className={`cart-remove ${page <= 1 ? "disabled-link" : ""}`}
                style={{ textDecoration: "none" }}
              >
                ← Trước
              </Link>
              <span className="prod-code">
                Trang {page} / {totalPages}
              </span>
              <Link
                href={buildPageHref({ category: categoryFilter, page: Math.min(totalPages, page + 1) })}
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
