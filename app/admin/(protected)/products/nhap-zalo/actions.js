"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/adminAuth";

// Ngưỡng độ khớp mờ (pg_trgm, 0..1) để coi là "chắc chắn cùng 1 sản phẩm" — giống ngưỡng đã dùng
// ở công cụ "Ghép ảnh Zalo" cũ (đã bỏ) khi còn dùng match_products_by_text().
const FUZZY_MATCH_THRESHOLD = 0.3;

// Bước chuẩn bị: nhận danh sách sản phẩm đã tách từ bài đăng Zalo (tên/giá/dòng máy — xem
// NhapZaloForm.js), tự tạo slug + mã sản phẩm, và QUAN TRỌNG: kiểm tra trùng với sản phẩm ĐÃ CÓ
// SẴN trong database trước khi commit — cả trùng TÊN Y HỆT (so theo slug) lẫn trùng GẦN GIỐNG
// (so mờ bằng match_products_by_text(), pg_trgm — xem migration_015) vì caption dán lại 2 lần
// hiếm khi giống nhau tuyệt đối từng ký tự (thêm/bớt icon, viết hoa khác, thêm mô tả...).
//
// Lý do cần bước riêng này: hàm commitProductsCsv() (dùng chung với chức năng nhập CSV) ghi dữ
// liệu bằng upsert(onConflict: "slug") — nếu 1 sản phẩm mới vô tình trùng slug với sản phẩm cũ
// (trùng tên -> cùng 1 slug), nó sẽ ÂM THẦM GHI ĐÈ sản phẩm cũ thay vì tạo sản phẩm mới. Bước
// này né rủi ro đó bằng cách luôn hậu tố thêm ký tự ngẫu nhiên khi phát hiện trùng.
//
// Ngoài né ghi đè, còn CẢNH BÁO trùng để admin tự quyết định (có thể admin đang lỡ dán lại 1
// bài đã nhập trước đó, hoặc 2 bài dán trong cùng lô có tên giống nhau) — trả kèm mảng
// "duplicates" liệt kê tên/giá sản phẩm đã có sẵn khớp tên, để hiển thị cảnh báo ở bước xác
// nhận cuối, admin xem rồi mới bấm tạo (không tự động chặn, chỉ tự động chặn GHI ĐÈ).
export async function prepareZaloRows({ category, categoryCode, items }) {
  const authError = requireAdmin();
  if (authError) return authError;

  if (!category) return { success: false, error: "Thiếu danh mục." };
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Danh sách sản phẩm đang trống." };
  }

  const { data: existingProducts, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("slug, name, price, images, image_url");
  if (fetchError) {
    return { success: false, error: `Lỗi kiểm tra sản phẩm hiện có: ${fetchError.message}` };
  }
  const existingBySlug = new Map((existingProducts || []).map((p) => [p.slug, p]));
  const takenSlugs = new Set(existingBySlug.keys());
  const seenInBatch = new Map(); // baseSlug -> tên item xuất hiện trước trong CÙNG lô đang dán

  // So khớp mờ CHO TỪNG TÊN trước (song song, không phụ thuộc thứ tự) — chỉ dùng làm dự phòng cho
  // item nào KHÔNG khớp slug y hệt, để không phải chờ tuần tự từng RPC 1.
  const fuzzyResults = await Promise.all(
    items.map((item) =>
      supabaseAdmin
        .rpc("match_products_by_text", { search_text: item.name, match_limit: 1 })
        .then(({ data }) => data?.[0] || null)
        .catch(() => null)
    )
  );

  const rows = [];
  const duplicates = [];

  items.forEach((item, i) => {
    const baseSlug = slugify(item.name) || `sp-${Date.now()}-${i}`;
    let existingMatch = existingBySlug.get(baseSlug) || null;
    // Không khớp slug y hệt -> thử khớp mờ theo tên (bắt được caption dán lại hơi khác chữ).
    if (!existingMatch) {
      const fuzzy = fuzzyResults[i];
      if (fuzzy && fuzzy.score >= FUZZY_MATCH_THRESHOLD) {
        existingMatch = { slug: fuzzy.slug, name: fuzzy.name, price: fuzzy.price, image_url: fuzzy.image_url };
      }
    }
    const batchMatchName = seenInBatch.get(baseSlug) || null;
    seenInBatch.set(baseSlug, item.name);

    let slug = baseSlug;
    if (takenSlugs.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    takenSlugs.add(slug);

    const variants = Array.isArray(item.variants) ? item.variants.filter(Boolean) : [];
    // Phân loại có giá riêng (vd "Vỏ" 100k / "Xương" 45k, xem lib/priceOptions.js) — KHÁC variants
    // (dòng máy tương thích) ở trên, độc lập hoàn toàn, không bắt buộc phải có.
    const priceOptions = Array.isArray(item.priceOptions)
      ? item.priceOptions.filter((o) => o && o.name && Number.isFinite(Number(o.price)) && Number(o.price) > 0)
      : [];
    const code = `${categoryCode}-${Date.now().toString(36).toUpperCase()}${i}`;

    rows.push({
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
      price_options: priceOptions,
      // Ảnh gắn ở bước xác nhận cuối (xem createZaloProductWithPhotos/attachZaloPhotos bên dưới) —
      // ở đây chỉ chuẩn bị dữ liệu tên/giá/slug, chưa có ảnh.
      images: [],
      image_url: null,
    });

    if (existingMatch || batchMatchName) {
      const existingImages =
        Array.isArray(existingMatch?.images) && existingMatch.images.length > 0
          ? existingMatch.images
          : existingMatch?.image_url
          ? [existingMatch.image_url]
          : [];
      duplicates.push({
        index: i,
        name: item.name,
        existingSlug: existingMatch?.slug || null,
        existingName: existingMatch?.name || null,
        existingPrice: existingMatch?.price ?? null,
        // Sản phẩm trùng CHƯA có ảnh nào -> chỉ đang bổ sung ảnh, an toàn, không cần admin xác
        // nhận thêm. Đã có ảnh rồi -> bắt xác nhận rõ ràng (kèm ảnh hiện tại để so sánh) trước khi
        // gắn thêm/ghi đè giá, tránh gộp nhầm 2 sản phẩm khác nhau trùng tên.
        existingImages,
        existingHasImages: existingImages.length > 0,
        duplicateInSameBatch: batchMatchName,
      });
    }
  });

  return { success: true, rows, duplicates };
}

async function uploadOneImage(file, slugForPath) {
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `${slugForPath}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("product-images")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });

  if (error) {
    console.error("Lỗi tải ảnh lên:", error.message);
    return null;
  }

  const { data } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
  return data?.publicUrl || null;
}

// Tạo 1 sản phẩm MỚI kèm luôn ảnh — dùng cho các dòng KHÔNG trùng sản phẩm đã có (hoặc admin chủ
// động chọn "vẫn tạo mới" dù có cảnh báo trùng tên ở prepareZaloRows). Nhận variants qua form field
// JSON để giữ được danh sách "dòng máy tương thích" đã dán/sửa ở bước xem trước — ghép-anh-zalo cũ
// (đã bỏ) không có field này vì không hỗ trợ dòng máy.
export async function createZaloProductWithPhotos(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const name = formData.get("name")?.trim();
  const price = Number(formData.get("price"));
  const category = formData.get("category")?.trim();
  const categoryCode = formData.get("categoryCode")?.trim() || "SP";
  const files = formData.getAll("images").filter((f) => typeof f === "object" && f.size > 0);
  let variants = [];
  try {
    const parsed = JSON.parse(formData.get("variants") || "[]");
    if (Array.isArray(parsed)) variants = parsed.filter(Boolean);
  } catch {
    variants = [];
  }
  let priceOptions = [];
  try {
    const parsed = JSON.parse(formData.get("priceOptions") || "[]");
    if (Array.isArray(parsed)) {
      priceOptions = parsed.filter((o) => o && o.name && Number.isFinite(Number(o.price)) && Number(o.price) > 0);
    }
  } catch {
    priceOptions = [];
  }

  if (!name) return { success: false, error: "Thiếu tên sản phẩm." };
  if (!Number.isFinite(price) || price <= 0) return { success: false, error: "Giá bán không hợp lệ." };
  if (!category) return { success: false, error: "Thiếu danh mục." };
  if (files.length === 0) return { success: false, error: "Thiếu ảnh." };

  const baseSlug = slugify(name) || `sp-${Date.now()}`;
  const { data: clash } = await supabaseAdmin.from("products").select("slug").eq("slug", baseSlug).maybeSingle();
  const slug = clash ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug;
  const code = `${categoryCode}-${Date.now().toString(36).toUpperCase()}`;

  const uploadedUrls = [];
  for (const file of files) {
    const url = await uploadOneImage(file, slug);
    if (url) uploadedUrls.push(url);
  }
  if (uploadedUrls.length === 0) {
    return { success: false, error: "Tải ảnh lên thất bại, thử lại." };
  }

  const { error } = await supabaseAdmin.from("products").insert({
    slug,
    code,
    name,
    price,
    old_price: null,
    // Giống nhap-nhanh và import CSV: shop không quản lý tồn kho theo từng lượt nhập.
    stock: 9999,
    category,
    brand: null,
    variants,
    default_variant: variants[0] || null,
    specs: [],
    price_options: priceOptions,
    images: uploadedUrls,
    image_url: uploadedUrls[0],
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { success: true, slug, uploadedCount: uploadedUrls.length };
}

// Gắn thêm ảnh vào 1 sản phẩm ĐÃ CÓ SẴN (dòng bị đánh dấu trùng ở prepareZaloRows, admin chọn "cập
// nhật ảnh cho sản phẩm đã có" thay vì tạo mới) — thêm vào cuối mảng ảnh hiện có, không xoá ảnh cũ.
// Nếu giá dán vào khác giá đang lưu thì cập nhật giá luôn trong cùng 1 lần lưu.
export async function attachZaloPhotos(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const slug = formData.get("slug")?.trim();
  const files = formData.getAll("images").filter((f) => typeof f === "object" && f.size > 0);
  const priceRaw = formData.get("price");
  if (!slug || files.length === 0) {
    return { success: false, error: "Thiếu sản phẩm hoặc ảnh." };
  }

  const { data: product, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("images, image_url, price")
    .eq("slug", slug)
    .maybeSingle();

  if (fetchError || !product) {
    return { success: false, error: fetchError?.message || "Không tìm thấy sản phẩm." };
  }

  const uploadedUrls = [];
  for (const file of files) {
    const url = await uploadOneImage(file, slug);
    if (url) uploadedUrls.push(url);
  }

  if (uploadedUrls.length === 0) {
    return { success: false, error: "Tải ảnh lên thất bại, thử lại." };
  }

  const currentImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.image_url
    ? [product.image_url]
    : [];
  const newImages = [...currentImages, ...uploadedUrls];

  const update = { images: newImages, image_url: newImages[0] };
  const price = Number(priceRaw);
  if (priceRaw !== null && Number.isFinite(price) && price > 0 && price !== product.price) {
    update.price = price;
  }

  const { error: updateError } = await supabaseAdmin.from("products").update(update).eq("slug", slug);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath(`/san-pham/${slug}`);
  return { success: true, uploadedCount: uploadedUrls.length };
}
