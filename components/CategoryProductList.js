"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ProductCard from "@/components/ProductCard";

const PAGE_SIZE = 12;

// Danh sách sản phẩm + thanh lọc (hãng, dòng máy/màu, khoảng giá) + sắp xếp + phân trang.
// Dùng chung cho trang danh mục (/danh-muc/[slug]) và trang tìm kiếm (/tim-kiem).
// Bộ lọc điều khiển qua URL (query params) để có thể chia sẻ link / bấm Lùi trình duyệt được.
export default function CategoryProductList({ products, totalCount, facets, page }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE));

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page"); // đổi bộ lọc thì quay lại trang 1
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPage(p) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const currentBrand = searchParams.get("brand") || "";
  const currentVariant = searchParams.get("variant") || "";
  const currentSort = searchParams.get("sort") || "default";
  const currentMin = searchParams.get("minPrice") || "";
  const currentMax = searchParams.get("maxPrice") || "";

  const hasFilters = currentBrand || currentVariant || currentMin || currentMax;

  // Xoá bộ lọc: chỉ xoá brand/variant/minPrice/maxPrice/sort — GIỮ LẠI "q" (từ khoá tìm kiếm).
  // Trước đây router.push(pathname) xoá luôn cả "q", nên ở trang /tim-kiem, bấm "Xoá bộ lọc"
  // sẽ mất luôn kết quả tìm kiếm (quay về trạng thái "chưa nhập gì") — không phải điều người
  // dùng mong đợi khi họ chỉ muốn bỏ lọc hãng/giá, vẫn muốn giữ nguyên từ khoá đang tìm.
  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["brand", "variant", "minPrice", "maxPrice", "sort", "page"].forEach((key) => params.delete(key));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <>
      <div className="filter-bar">
        {facets.brands.length > 0 && (
          <select
            className="sort-select"
            value={currentBrand}
            onChange={(e) => updateParam("brand", e.target.value)}
          >
            <option value="">Tất cả hãng</option>
            {facets.brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}

        {facets.variants.length > 0 && (
          <select
            className="sort-select"
            value={currentVariant}
            onChange={(e) => updateParam("variant", e.target.value)}
          >
            <option value="">Tất cả dòng máy / màu</option>
            {facets.variants.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        )}

        <input
          type="number"
          min="0"
          placeholder="Giá từ"
          className="admin-filter-input"
          style={{ minWidth: 100, flex: "0 1 110px" }}
          defaultValue={currentMin}
          onBlur={(e) => updateParam("minPrice", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("minPrice", e.currentTarget.value);
          }}
        />
        <input
          type="number"
          min="0"
          placeholder="Giá đến"
          className="admin-filter-input"
          style={{ minWidth: 100, flex: "0 1 110px" }}
          defaultValue={currentMax}
          onBlur={(e) => updateParam("maxPrice", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("maxPrice", e.currentTarget.value);
          }}
        />

        <select
          className="sort-select"
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          <option value="default">Mặc định</option>
          <option value="price-asc">Giá: thấp đến cao</option>
          <option value="price-desc">Giá: cao đến thấp</option>
        </select>

        {hasFilters && (
          <button type="button" className="cart-remove" onClick={clearFilters}>
            Xoá bộ lọc
          </button>
        )}
      </div>

      <div className="sort-bar">
        <span className="sort-count">{totalCount} sản phẩm</span>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">Không tìm thấy sản phẩm nào phù hợp bộ lọc hiện tại.</div>
      ) : (
        <div className="prod-grid">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            type="button"
            className={`cart-remove ${page <= 1 ? "disabled-link" : ""}`}
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            ← Trước
          </button>
          <span className="prod-code">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            className={`cart-remove ${page >= totalPages ? "disabled-link" : ""}`}
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Sau →
          </button>
        </div>
      )}
    </>
  );
}
