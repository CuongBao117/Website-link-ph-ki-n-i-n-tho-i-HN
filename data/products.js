// Đọc dữ liệu sản phẩm/danh mục từ Supabase (bảng "products" và "categories").
// Dùng khoá anon (công khai, chỉ đọc) — an toàn cho phía trình duyệt.

import { supabase } from "@/lib/supabase";
import { COMMON_BRANDS } from "@/lib/brands";
import { normalizeSearchText, escapeSearchTerm } from "@/lib/searchNormalize";

export const FACET_ROW_LIMIT = 500; // đủ đa dạng để liệt kê hết hãng/dòng máy thực tế, tránh quét cả bảng mỗi lần lọc

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
    priceOptions: row.price_options || [],
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

// "Sản phẩm liên quan" — ưu tiên CÙNG DANH MỤC, thiếu thì bù bằng cùng HÃNG, thiếu nữa thì
// mới lấy đại sản phẩm khác (để mục này không bao giờ trống trên catalog còn ít hàng), nhưng
// không bao giờ lẫn sản phẩm hoàn toàn không liên quan khi đã đủ hàng cùng danh mục/hãng.
export async function getRelatedProducts(product, limit = 4) {
  if (!product?.slug) return [];

  const picked = new Map();
  const addRows = (rows) => {
    for (const row of rows || []) {
      if (row.slug !== product.slug && !picked.has(row.slug)) picked.set(row.slug, row);
      if (picked.size >= limit) break;
    }
  };

  const { data: sameCategory, error: categoryError } = await supabase
    .from("products")
    .select("*")
    .eq("category", product.category)
    .neq("slug", product.slug)
    .limit(limit * 2);
  if (categoryError) {
    console.error("Lỗi tải sản phẩm liên quan:", categoryError.message);
  }
  addRows(sameCategory);

  if (picked.size < limit && product.brand) {
    const { data: sameBrand, error: brandError } = await supabase
      .from("products")
      .select("*")
      .eq("brand", product.brand)
      .neq("slug", product.slug)
      .limit(limit * 2);
    if (brandError) {
      console.error("Lỗi tải sản phẩm liên quan (theo hãng):", brandError.message);
    }
    addRows(sameBrand);
  }

  if (picked.size < limit) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("products")
      .select("*")
      .neq("slug", product.slug)
      .limit(limit * 2);
    if (fallbackError) {
      console.error("Lỗi tải sản phẩm liên quan (dự phòng):", fallbackError.message);
    }
    addRows(fallback);
  }

  return Array.from(picked.values()).slice(0, limit).map(mapProductRow);
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
  // Validate 2 ô giá lấy từ URL (?minPrice=...&maxPrice=...) — người dùng có thể tự sửa link
  // thành giá trị rác (chữ, số âm...). NaN thì coi như không lọc theo giá đó, thay vì để lọt
  // xuống Postgres gây lỗi hoặc âm thầm ra 0 kết quả.
  const minPriceNum = minPrice !== undefined && minPrice !== "" ? Number(minPrice) : null;
  const maxPriceNum = maxPrice !== undefined && maxPrice !== "" ? Number(maxPrice) : null;
  const validMin = Number.isFinite(minPriceNum) && minPriceNum >= 0 ? minPriceNum : null;
  const validMax = Number.isFinite(maxPriceNum) && maxPriceNum >= 0 ? maxPriceNum : null;

  if (validMin !== null && validMax !== null && validMin > validMax) {
    return {
      products: [],
      totalCount: 0,
      facets: { brands: [], variants: [] },
      error: "Khoảng giá không hợp lệ — \"Giá từ\" đang lớn hơn \"Giá đến\", vui lòng sửa lại.",
    };
  }

  // brand/variant cũng lấy thẳng từ URL — cắt bớt nếu bị dán giá trị rác quá dài, tránh gửi
  // chuỗi khổng lồ vô nghĩa xuống database.
  const safeBrand = typeof brand === "string" ? brand.trim().slice(0, 100) : "";
  const safeVariant = typeof variant === "string" ? variant.trim().slice(0, 100) : "";

  // Áp cùng 1 bộ điều kiện lọc cho cả truy vấn lấy sản phẩm VÀ truy vấn tính facet,
  // để 2 truy vấn luôn khớp nhau (facet chỉ hiện lựa chọn còn ra kết quả).
  function applyFilters(builder) {
    let query = builder;
    if (category) query = query.eq("category", category);
    if (safeBrand) query = query.eq("brand", safeBrand);
    if (safeVariant) query = query.contains("variants", [safeVariant]);
    if (validMin !== null) query = query.gte("price", validMin);
    if (validMax !== null) query = query.lte("price", validMax);

    const keyword = (q || "").trim();
    if (keyword) {
      // Tách thành từng từ, MỖI từ phải xuất hiện đâu đó (AND giữa các từ, OR giữa các cột) —
      // gõ "pin 13 iphone" vẫn ra "Pin DLC iPhone 13" dù không đúng thứ tự trong tên, khác với
      // kiểu match nguyên cụm cũ. Lọc trên các cột "..._unaccent" (chữ thường, không dấu — xem
      // migration_013) và tự chuẩn hoá từ khoá người dùng nhập (bỏ dấu) để khớp được dù gõ có
      // dấu hay không. escapeSearchTerm() bỏ ký tự có thể phá cú pháp .or() của PostgREST
      // ("()" dùng để nhóm điều kiện, "%," phá cú pháp OR) — từng gây lỗi 400 âm thầm ra 0 kết
      // quả với những từ khoá kiểu "ốp lưng (đen)".
      const words = normalizeSearchText(keyword).split(/\s+/).filter(Boolean);
      words.forEach((word) => {
        const escaped = escapeSearchTerm(word);
        if (!escaped) return;
        query = query.or(
          `name_unaccent.ilike.%${escaped}%,code_unaccent.ilike.%${escaped}%,variants_text_unaccent.ilike.%${escaped}%`
        );
      });
    }
    return query;
  }

  let mainQuery = applyFilters(supabase.from("products").select("*", { count: "exact" }));
  mainQuery =
    sort === "price-asc"
      ? mainQuery.order("price", { ascending: true })
      : sort === "price-desc"
      ? mainQuery.order("price", { ascending: false })
      : sort === "newest"
      ? mainQuery.order("created_at", { ascending: false })
      : mainQuery.order("code", { ascending: true });

  // Chặn số trang vượt quá thực tế — trước đây bấm/gõ ?page=999 sẽ ra "products" rỗng nhưng
  // "totalCount" vẫn > 0, hiện dòng "không tìm thấy sản phẩm" gây hiểu lầm là hết hàng. Kẹp lại
  // trong khoảng [1, totalPages] trước khi query — page component sẽ tự redirect nếu người dùng
  // gõ số trang không hợp lệ (xem app/tim-kiem, app/danh-muc/[slug]).
  const requestedPage = Math.max(1, Number(page) || 1);

  const from = (requestedPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: rows, error, count } = await mainQuery.range(from, to);
  if (error) {
    console.error("Lỗi tải sản phẩm:", error.message);
    return { products: [], totalCount: 0, totalPages: 1, facets: { brands: [], variants: [] } };
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  // Có từ khoá tìm kiếm nhưng ra 0 kết quả -> thử lại 1 lần LỎNG HƠN: chỉ cần khớp MỘT trong
  // các từ (OR giữa từ, thay vì AND như truy vấn chính) để gợi ý "có thể bạn đang tìm" — vd gõ
  // "pin sam sung a51" (thiếu dấu cách/gõ hơi khác) không ra kết quả đúng thì vẫn gợi ý được các
  // sản phẩm chứa ít nhất 1 từ khớp, đỡ hơn hẳn màn hình trắng "không tìm thấy".
  let suggestions = [];
  const trimmedKeyword = (q || "").trim();
  if (trimmedKeyword && (count ?? 0) === 0) {
    const words = normalizeSearchText(trimmedKeyword)
      .split(/\s+/)
      .map(escapeSearchTerm)
      .filter(Boolean);
    if (words.length > 0) {
      const orParts = words.flatMap((w) => [
        `name_unaccent.ilike.%${w}%`,
        `code_unaccent.ilike.%${w}%`,
        `variants_text_unaccent.ilike.%${w}%`,
      ]);
      let suggestQuery = supabase.from("products").select("*").or(orParts.join(","));
      if (category) suggestQuery = suggestQuery.eq("category", category);
      const { data: suggestRows, error: suggestError } = await suggestQuery.limit(8);
      if (suggestError) {
        console.error("Lỗi tải gợi ý tìm kiếm:", suggestError.message);
      } else {
        suggestions = (suggestRows || []).map(mapProductRow);
      }
    }
  }

  let facets = { brands: [], variants: [] };
  if (withFacets) {
    // Chỉ lấy 2 cột nhẹ (brand, variants) — không lấy ảnh/thông số kỹ thuật... — để tính danh
    // sách lựa chọn lọc mà không phải kéo nguyên dòng sản phẩm. Giới hạn FACET_ROW_LIMIT dòng
    // (thay vì quét hết mọi dòng khớp bộ lọc) — với 10.000+ sản phẩm, không cần quét hết mới
    // đủ hãng/dòng máy để liệt kê trong ô lọc.
    const { data: facetRows, error: facetError } = await applyFilters(
      supabase.from("products").select("brand, variants").limit(FACET_ROW_LIMIT)
    );
    if (facetError) {
      console.error("Lỗi tải bộ lọc hãng/dòng máy:", facetError.message);
    } else {
      // Chỉ hiện hãng THỰC SỰ có trong kết quả hiện tại — trước đây luôn gộp thêm COMMON_BRANDS
      // tĩnh dù không có sản phẩm nào, khiến khách chọn nhầm hãng ra 0 kết quả. COMMON_BRANDS chỉ
      // dùng làm phương án dự phòng khi CHƯA có sản phẩm nào cả (đỡ ô lọc trống trơn lúc mới mở shop).
      const realBrands = Array.from(new Set((facetRows || []).map((p) => p.brand).filter(Boolean))).sort();
      const brands = realBrands.length > 0 ? realBrands : [...COMMON_BRANDS].sort();
      const variantsSet = new Set();
      (facetRows || []).forEach((p) => (p.variants || []).forEach((v) => v && variantsSet.add(v)));
      facets = { brands, variants: Array.from(variantsSet).sort() };
    }
  }

  return { products: (rows || []).map(mapProductRow), totalCount: count ?? 0, totalPages, facets, suggestions };
}

export function formatPrice(value) {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("vi-VN") + "đ";
}
