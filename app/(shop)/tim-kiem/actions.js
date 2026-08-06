"use server";

import { getFilteredProducts } from "@/data/products";

// Gợi ý tức thời khi khách đang gõ ở ô tìm kiếm (xem SearchBox.js) — dùng lại đúng logic tìm
// kiếm đã có (khớp tên/mã/dòng máy, bỏ dấu, escape ký tự đặc biệt — xem data/products.js) nhưng
// chỉ lấy vài kết quả nhẹ, không tính facet/phân trang, để phản hồi nhanh trong lúc gõ.
export async function getSearchSuggestions(query) {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  const { products } = await getFilteredProducts({ q, page: 1, pageSize: 6, withFacets: false });
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    code: p.code,
    price: p.price,
    imageUrl: p.imageUrl,
  }));
}
