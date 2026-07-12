"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ProductCard from "@/components/ProductCard";

const PAGE_SIZE = 12;

function formatPriceInput(digits) {
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

function onlyDigits(value) {
  return (value || "").replace(/\D/g, "");
}

// Danh sách sản phẩm + thanh lọc (hãng, dòng máy/màu, khoảng giá) + sắp xếp + phân trang.
// Dùng chung cho trang danh mục (/danh-muc/[slug]) và trang tìm kiếm (/tim-kiem).
// Bộ lọc điều khiển qua URL (query params) để có thể chia sẻ link / bấm Lùi trình duyệt được.
//
// Các ô lọc KHÔNG đẩy URL ngay mỗi lần đổi — gom lại thành "pending", chỉ thực sự điều hướng
// (và gọi Supabase) khi bấm "Áp dụng bộ lọc" hoặc Enter ở ô giá — đổi hãng, giá, sắp xếp liên
// tiếp chỉ tốn đúng 1 lượt tải thay vì mỗi ô 1 lượt riêng.
export default function CategoryProductList({ products, totalCount, facets, page, suggestions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE));

  const urlBrand = searchParams.get("brand") || "";
  const urlVariant = searchParams.get("variant") || "";
  const urlSort = searchParams.get("sort") || "default";
  const urlMin = searchParams.get("minPrice") || "";
  const urlMax = searchParams.get("maxPrice") || "";

  const [pendingBrand, setPendingBrand] = useState(urlBrand);
  const [pendingVariant, setPendingVariant] = useState(urlVariant);
  const [pendingSort, setPendingSort] = useState(urlSort);
  const [pendingMin, setPendingMin] = useState(urlMin);
  const [pendingMax, setPendingMax] = useState(urlMax);

  const hasFilters = urlBrand || urlVariant || urlMin || urlMax;
  const hasPendingChanges =
    pendingBrand !== urlBrand ||
    pendingVariant !== urlVariant ||
    pendingSort !== urlSort ||
    pendingMin !== urlMin ||
    pendingMax !== urlMax;

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    const entries = {
      brand: pendingBrand,
      variant: pendingVariant,
      sort: pendingSort === "default" ? "" : pendingSort,
      minPrice: pendingMin,
      maxPrice: pendingMax,
    };
    Object.entries(entries).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("page"); // đổi bộ lọc thì quay lại trang 1
    router.push(`${pathname}?${params.toString()}`);
  }

  // Xoá bộ lọc: chỉ xoá brand/variant/minPrice/maxPrice/sort — GIỮ LẠI "q" (từ khoá tìm kiếm).
  // Trước đây xoá luôn cả "q", nên ở trang /tim-kiem, bấm "Xoá bộ lọc" sẽ mất luôn kết quả tìm
  // kiếm — không phải điều người dùng mong đợi khi họ chỉ muốn bỏ lọc hãng/giá.
  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["brand", "variant", "minPrice", "maxPrice", "sort", "page"].forEach((key) => params.delete(key));
    setPendingBrand("");
    setPendingVariant("");
    setPendingSort("default");
    setPendingMin("");
    setPendingMax("");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function goToPage(p) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <div className="filter-bar">
        {facets.brands.length > 0 && (
          <select className="sort-select" value={pendingBrand} onChange={(e) => setPendingBrand(e.target.value)}>
            <option value="">Tất cả hãng</option>
            {facets.brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}

        {facets.variants.length > 0 && (
          <>
            {/* Ô gõ-lọc (datalist) thay vì <select> tĩnh — với catalog lớn, danh sách dòng máy/màu
                có thể lên tới hàng trăm mục, cuộn chọn trong dropdown thường rất khó dùng. Gõ vài
                chữ là trình duyệt tự lọc gợi ý, không cần thư viện combobox riêng. */}
            <input
              list="variant-options"
              className="admin-filter-input"
              style={{ minWidth: 160, flex: "0 1 200px" }}
              placeholder="Tất cả dòng máy / màu"
              value={pendingVariant}
              onChange={(e) => setPendingVariant(e.target.value)}
            />
            <datalist id="variant-options">
              {facets.variants.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </>
        )}

        <input
          type="text"
          inputMode="numeric"
          min="0"
          placeholder="Giá từ"
          className="admin-filter-input"
          style={{ minWidth: 100, flex: "0 1 110px" }}
          value={formatPriceInput(pendingMin)}
          onChange={(e) => setPendingMin(onlyDigits(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
        />
        <input
          type="text"
          inputMode="numeric"
          min="0"
          placeholder="Giá đến"
          className="admin-filter-input"
          style={{ minWidth: 100, flex: "0 1 110px" }}
          value={formatPriceInput(pendingMax)}
          onChange={(e) => setPendingMax(onlyDigits(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
        />

        <select className="sort-select" value={pendingSort} onChange={(e) => setPendingSort(e.target.value)}>
          <option value="default">Mặc định</option>
          <option value="newest">Mới nhất</option>
          <option value="price-asc">Giá: thấp đến cao</option>
          <option value="price-desc">Giá: cao đến thấp</option>
        </select>

        <button
          type="button"
          className="btn-primary"
          onClick={applyFilters}
          disabled={!hasPendingChanges}
          style={{ padding: "9px 18px", fontSize: 13.5 }}
        >
          Áp dụng bộ lọc
        </button>

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
        <div className="empty-state">
          <p style={{ marginTop: 0 }}>Không tìm thấy sản phẩm nào phù hợp bộ lọc hiện tại.</p>
          {suggestions?.length > 0 && (
            <>
              <p style={{ fontWeight: 600, marginBottom: 14 }}>Có thể bạn đang tìm:</p>
              <div className="prod-grid" style={{ marginBottom: 0, textAlign: "left" }}>
                {suggestions.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
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
