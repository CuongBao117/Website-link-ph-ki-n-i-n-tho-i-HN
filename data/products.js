// Đọc dữ liệu sản phẩm/danh mục từ Supabase (bảng "products" và "categories").
// Dùng khoá anon (công khai, chỉ đọc) — an toàn cho phía trình duyệt.

import { supabase } from "@/lib/supabase";
import { COMMON_BRANDS } from "@/lib/brands";

// 4 nhóm danh mục lớn — đọc từ bảng "category_groups" (xem migration_011), KHÔNG hardcode
// trong code nữa. Trước đây danh sách này bị lặp lại ở 3 nơi (data/products.js, MegaMenu.js,
// CategoryForm.js) — sửa 1 nơi phải nhớ sửa cả 3, dễ lệch. Giờ chỉ còn duy nhất bảng này.
export async function getCategoryGroups() {
  const { data, error } = await supabase.from("category_groups").select("*").order("display_order");
  if (error) {
    console.error("Lỗi tải nhóm danh mục:", error.message);
    return [];
  }
  return data;
}

function mapProductRow(row) {
  if (!row) return null;
  // "images" là mảng nhiều ảnh (mới); nếu sản phẩm cũ chưa có thì dùng tạm image_url làm ảnh duy nhất.
  const images =
    Array.isArray(row.images) && row.images.length > 0
      ? row.images
      : row.image_url
      ? [row.image_url]
      : [];
  return {
    slug: row.slug,
    code: row.code,
    name: row.name,
    price: row.price,
    oldPrice: row.old_price,
    stock: row.stock,
    category: row.category,
    brand: row.brand || null,
    variants: row.variants || [],
    defaultVariant: row.default_variant,
    specs: row.specs || [],
    images,
    imageUrl: images[0] || null, // ảnh đại diện — giữ lại để tương thích code cũ (ProductGrid, thẻ sản phẩm...)
  };
}

export async function getCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("display_order");
  if (error) {
    console.error("Lỗi tải danh mục:", error.message);
    return [];
  }
  return data;
}

// Trả về danh mục đã gom theo nhóm lớn, dạng mảng: [{ slug, name, categories: [...] }, ...],
// sắp theo đúng display_order của cả nhóm và danh mục con. Danh mục nào chưa có group_slug
// (đã bị gỡ khỏi menu — xem /admin/categories) sẽ không xuất hiện ở đây.
export async function getCategoriesGrouped() {
  const [groups, categories] = await Promise.all([getCategoryGroups(), getCategories()]);
  return groups.map((g) => ({
    slug: g.slug,
    name: g.name,
    categories: categories.filter((c) => c.group_slug === g.slug),
  }));
}

export async function getCategoryBySlug(slug) {
  const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    console.error("Lỗi tải danh mục:", error.message);
    return null;
  }
  return data;
}

export async function getProducts() {
  const { data, error } = await supabase.from("products").select("*").order("code");
  if (error) {
    console.error("Lỗi tải sản phẩm:", error.message);
    return [];
  }
  return data.map(mapProductRow);
}

export async function getProductBySlug(slug) {
  const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    console.error("Lỗi tải sản phẩm:", error.message);
    return null;
  }
  return mapProductRow(data);
}

export async function getProductsByCategory(slug) {
  const { data, error } = await supabase.from("products").select("*").eq("category", slug).order("code");
  if (error) {
    console.error("Lỗi tải sản phẩm theo danh mục:", error.message);
    return [];
  }
  return data.map(mapProductRow);
}

export async function getRelatedProducts(slug, limit = 4) {
  const { data, error } = await supabase.from("products").select("*").neq("slug", slug).limit(limit);
  if (error) {
    console.error("Lỗi tải sản phẩm liên quan:", error.message);
    return [];
  }
  return data.map(mapProductRow);
}

// Hàm dùng chung cho trang chủ (xem trước theo danh mục), trang danh mục (/danh-muc/[slug])
// và trang tìm kiếm (/tim-kiem): lọc theo danh mục / từ khoá / hãng / dòng máy-màu (variant) /
// khoảng giá, sắp xếp, phân trang.
//
// QUAN TRỌNG: lọc/sắp xếp/phân trang ĐẨY XUỐNG Postgres (qua .eq/.ilike/.range của Supabase)
// thay vì kéo hết dữ liệu khớp danh mục về rồi lọc bằng JS như bản cũ — bản cũ với vài nghìn
// sản phẩm/danh mục sẽ kéo cả nghìn dòng về chỉ để hiện 12 dòng, rất chậm và tốn băng thông.
//
// Từ khoá (q) khớp theo TÊN sản phẩm, MÃ sản phẩm, VÀ tên máy/dòng máy (variants) — để khách
// gõ "iPhone 13" cũng ra được các linh kiện/phụ kiện tương thích, không chỉ đúng tên sản phẩm.
//
// withFacets = false: bỏ qua truy vấn tính "hãng"/"dòng máy" cho bộ lọc (VD: trang chủ chỉ xem
// trước 8 sản phẩm/danh mục, không có UI lọc nên không cần tính facet — đỡ thêm 1 lượt gọi Supabase).
export async function getFilteredProducts({
  category,
  q,
  brand,
  variant,
  minPrice,
  maxPrice,
  sort = "default",
  page = 1,
  pageSize = 12,
  withFacets = true,
} = {}) {
  // Áp cùng 1 bộ điều kiện lọc cho cả truy vấn lấy sản phẩm VÀ truy vấn tính facet,
  // để 2 truy vấn luôn khớp nhau (facet chỉ hiện lựa chọn còn ra kết quả).
  function applyFilters(builder) {
    let query = builder;
    if (category) query = query.eq("category", category);
    if (brand) query = query.eq("brand", brand);
    if (variant) query = query.contains("variants", [variant]);
    if (minPrice) query = query.gte("price", Number(minPrice));
    if (maxPrice) query = query.lte("price", Number(maxPrice));

    const keyword = (q || "").trim();
    if (keyword) {
      // Bỏ dấu % và dấu phẩy để không phá cú pháp bộ lọc ilike/or của PostgREST.
      const escaped = keyword.replace(/[%,]/g, "");
      // Lọc trên "variants_text" (cột tính sẵn, xem migration_012) — KHÔNG được ép kiểu
      // "variants::text" ngay trong .or() vì PostgREST chặn cast trong điều kiện lọc (chỉ
      // cho phép khi chọn cột hiển thị), làm cả câu truy vấn lỗi 400 → tìm gì cũng ra 0 kết quả.
      query = query.or(`name.ilike.%${escaped}%,code.ilike.%${escaped}%,variants_text.ilike.%${escaped}%`);
    }
    return query;
  }

  let mainQuery = applyFilters(supabase.from("products").select("*", { count: "exact" }));
  mainQuery =
    sort === "price-asc"
      ? mainQuery.order("price", { ascending: true })
      : sort === "price-desc"
      ? mainQuery.order("price", { ascending: false })
      : mainQuery.order("code", { ascending: true });

  const from = (Math.max(1, page) - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: rows, error, count } = await mainQuery.range(from, to);
  if (error) {
    console.error("Lỗi tải sản phẩm:", error.message);
    return { products: [], totalCount: 0, facets: { brands: [], variants: [] } };
  }

  let facets = { brands: [], variants: [] };
  if (withFacets) {
    // Chỉ lấy 2 cột nhẹ (brand, variants) — không lấy ảnh/thông số kỹ thuật... — để tính danh
    // sách lựa chọn lọc mà không phải kéo nguyên dòng sản phẩm (vẫn quét theo bộ lọc hiện tại,
    // nhưng nhẹ hơn nhiều so với "select *").
    const { data: facetRows, error: facetError } = await applyFilters(
      supabase.from("products").select("brand, variants")
    );
    if (facetError) {
      console.error("Lỗi tải bộ lọc hãng/dòng máy:", facetError.message);
    } else {
      const brands = Array.from(
        new Set([...(facetRows || []).map((p) => p.brand).filter(Boolean), ...COMMON_BRANDS])
      ).sort();
      const variantsSet = new Set();
      (facetRows || []).forEach((p) => (p.variants || []).forEach((v) => v && variantsSet.add(v)));
      facets = { brands, variants: Array.from(variantsSet).sort() };
    }
  }

  return { products: (rows || []).map(mapProductRow), totalCount: count ?? 0, facets };
}

export function formatPrice(value) {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("vi-VN") + "đ";
}
