"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/adminAuth";

// Bước chuẩn bị: nhận danh sách sản phẩm đã tách từ bài đăng Zalo (tên/giá/dòng máy — xem
// NhapZaloForm.js), tự tạo slug + mã sản phẩm, và QUAN TRỌNG: kiểm tra trùng slug với sản phẩm
// ĐÃ CÓ SẴN trong database trước khi commit.
//
// Lý do cần bước riêng này: hàm commitProductsCsv() (dùng chung với chức năng nhập CSV) ghi dữ
// liệu bằng upsert(onConflict: "slug") — nếu 1 sản phẩm mới vô tình trùng slug với sản phẩm cũ
// (trùng tên -> cùng 1 slug), nó sẽ ÂM THẦM GHI ĐÈ sản phẩm cũ thay vì tạo sản phẩm mới. Bước
// này né rủi ro đó bằng cách luôn hậu tố thêm ký tự ngẫu nhiên khi phát hiện trùng.
export async function prepareZaloRows({ category, categoryCode, items }) {
  const authError = requireAdmin();
  if (authError) return authError;

  if (!category) return { success: false, error: "Thiếu danh mục." };
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Danh sách sản phẩm đang trống." };
  }

  const { data: existingSlugs, error: fetchError } = await supabaseAdmin.from("products").select("slug");
  if (fetchError) {
    return { success: false, error: `Lỗi kiểm tra sản phẩm hiện có: ${fetchError.message}` };
  }
  const takenSlugs = new Set((existingSlugs || []).map((r) => r.slug));

  const rows = items.map((item, i) => {
    let slug = slugify(item.name);
    if (!slug) slug = `sp-${Date.now()}-${i}`;
    if (takenSlugs.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    takenSlugs.add(slug);

    const variants = Array.isArray(item.variants) ? item.variants.filter(Boolean) : [];
    const code = `${categoryCode}-${Date.now().toString(36).toUpperCase()}${i}`;

    return {
      slug,
      code,
      name: item.name,
      price: item.price,
      old_price: null,
      // Giống nhap-nhanh và import CSV: shop không quản lý tồn kho theo từng lượt nhập.
      stock: 9999,
      category,
      brand: null,
      variants,
      default_variant: variants[0] || null,
      specs: [],
      // Chưa gắn ảnh ở bước này — dùng "Gán ảnh hàng loạt" (đã có sẵn) ngay sau khi tạo xong.
      images: [],
      image_url: null,
    };
  });

  return { success: true, rows };
}
