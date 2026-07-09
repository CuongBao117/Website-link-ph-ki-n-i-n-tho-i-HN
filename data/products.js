// Đọc dữ liệu sản phẩm/danh mục từ Supabase (bảng "products" và "categories").
// Dùng khoá anon (công khai, chỉ đọc) — an toàn cho phía trình duyệt.

import { supabase } from "@/lib/supabase";

// 3 nhóm danh mục lớn cố định — khớp với group_slug lưu trong bảng categories
// (xem supabase/migration_005_category_groups.sql)
export const CATEGORY_GROUPS = [
  { slug: "linh-kien", name: "Linh kiện" },
  { slug: "phu-kien", name: "Phụ kiện" },
  { slug: "do-nghe", name: "Đồ nghề" },
];

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
  const { data, error } = await supabase.from("categories").select("*").order("code");
  if (error) {
    console.error("Lỗi tải danh mục:", error.message);
    return [];
  }
  return data;
}

// Trả về danh mục đã gom theo nhóm lớn: { "linh-kien": [...], "phu-kien": [...], "do-nghe": [...] }
// Danh mục nào chưa có group_slug (dữ liệu cũ chưa migrate) sẽ không xuất hiện ở mega menu.
export async function getCategoriesGrouped() {
  const categories = await getCategories();
  const groups = {};
  CATEGORY_GROUPS.forEach((g) => (groups[g.slug] = []));
  categories.forEach((c) => {
    if (c.group_slug && groups[c.group_slug]) {
      groups[c.group_slug].push(c);
    }
  });
  return groups;
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

// Hàm dùng chung cho trang danh mục (/danh-muc/[slug]) và trang tìm kiếm (/tim-kiem):
// lọc theo danh mục / từ khoá / hãng / dòng máy-màu (variant) / khoảng giá, sắp xếp, phân trang.
// Từ khoá (q) khớp theo TÊN sản phẩm, MÃ sản phẩm, VÀ tên máy/dòng máy (variants) — để khách
// gõ "iPhone 13" cũng ra được các linh kiện/phụ kiện tương thích, không chỉ đúng tên sản phẩm.
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
} = {}) {
  let baseQuery = supabase.from("products").select("*");
  if (category) baseQuery = baseQuery.eq("category", category);

  const { data: baseData, error } = await baseQuery;
  if (error) {
    console.error("Lỗi tải sản phẩm:", error.message);
    return { products: [], totalCount: 0, facets: { brands: [], variants: [] } };
  }

  let baseList = (baseData || []).map(mapProductRow);

  const keyword = (q || "").trim().toLowerCase();
  if (keyword) {
    baseList = baseList.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        (p.code || "").toLowerCase().includes(keyword) ||
        p.variants.some((v) => (v || "").toLowerCase().includes(keyword))
    );
  }

  // Danh sách lựa chọn lọc (hãng, dòng máy/màu) tính từ tập đã lọc theo danh mục + từ khoá,
  // để bộ lọc luôn hiện đúng lựa chọn còn ra kết quả, không hiện lựa chọn rỗng.
  const brands = Array.from(new Set(baseList.map((p) => p.brand).filter(Boolean))).sort();
  const variantsSet = new Set();
  baseList.forEach((p) => p.variants.forEach((v) => v && variantsSet.add(v)));
  const variantOptions = Array.from(variantsSet).sort();

  let list = baseList;
  if (brand) list = list.filter((p) => p.brand === brand);
  if (variant) list = list.filter((p) => p.variants.includes(variant));
  if (minPrice) list = list.filter((p) => p.price >= Number(minPrice));
  if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));

  if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);

  const totalCount = list.length;
  const from = (Math.max(1, page) - 1) * pageSize;
  const paged = list.slice(from, from + pageSize);

  return { products: paged, totalCount, facets: { brands, variants: variantOptions } };
}

export function formatPrice(value) {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("vi-VN") + "đ";
}
