"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { ocrImageText } from "@/lib/ocr";
import { slugify } from "@/lib/slugify";

const MATCH_LIMIT = 5;

// Các dòng chữ kiểu giao diện điện thoại/Zalo (giờ đăng, đồng hồ trạng thái, pin, nút Thích/Bình
// luận/Chia sẻ...) hay lẫn vào kết quả OCR — loại trước để không làm nhiễu bước đoán tên sản phẩm.
const NOISE_LINE =
  /^(thích|bình luận|chia sẻ|xem thêm|trả lời|phút trước|giờ trước|ngày trước|tuần trước|\d+\s*(phút|giờ|ngày|tuần)|\d{1,2}[:.,]\d{2}(\s?(am|pm))?|\.{2,}|[×xX]|\d{1,3}\s?%)$/i;

// Dòng kiểu "Sỉ 90k" / "Giá: 95.000đ" — không phải tên sản phẩm, tách riêng ra để đọc GIÁ.
const PRICE_LINE = /^(s[ỉi]|gi[áa])\b/i;

// Bỏ icon/emoji ở đầu-cuối dòng (caption Zalo hay có "✨✨", "💵"...) để tên/giá đọc ra không dính rác.
function cleanLine(line) {
  return line
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/^[\s•*\-–✅❌:]+|[\s•*\-–✅❌]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Bóc số + "k" ra khỏi chuỗi giá kiểu Zalo: "Sỉ 90k" -> 90000, "125.000đ" -> 125000.
function parsePriceValue(raw) {
  const s = String(raw || "").trim().toLowerCase();
  const hasK = /k\b/.test(s) || s.endsWith("k");
  const numMatch = s.replace(/[đdvnđ]/g, "").match(/[\d.,]+/);
  if (!numMatch) return null;
  let numStr = numMatch[0];
  numStr = hasK ? numStr.replace(/,/g, ".") : numStr.replace(/[.,]/g, "");
  const n = parseFloat(numStr);
  if (!Number.isFinite(n)) return null;
  return Math.round(hasK ? n * 1000 : n);
}

// Từ toàn bộ chữ OCR đọc được trong 1 ảnh chụp màn hình (lẫn cả tên người đăng, giờ đăng, chữ
// nút bấm, badge in trên ảnh...), tách ra:
//  - TÊN sản phẩm: bỏ dòng rác/dòng giá/dòng quá ngắn, lấy dòng DÀI NHẤT trong vài dòng đầu —
//    caption tên sản phẩm thường dài hơn hẳn chữ giao diện hay badge ngắn xung quanh.
//  - GIÁ bán: ưu tiên dòng có "Sỉ"/"Giá", không có thì quét số+k đầu tiên trong toàn bộ chữ.
function pickNameAndPrice(text) {
  const cleanedLines = String(text || "")
    .split("\n")
    .map((l) => cleanLine(l))
    .filter(Boolean);

  const nameLines = cleanedLines.filter((l) => l.length >= 4 && !NOISE_LINE.test(l) && !PRICE_LINE.test(l));
  const nameCandidate = nameLines.length ? nameLines.slice(0, 6).sort((a, b) => b.length - a.length)[0] : "";

  let priceCandidate = null;
  for (const line of cleanedLines) {
    const m = line.match(/s[ỉi]\s*:?\s*([\d.,]+\s*k?)/iu) || line.match(/gi[áa]\s*:?\s*([\d.,]+\s*k?)/iu);
    if (m) {
      priceCandidate = parsePriceValue(m[1]);
      if (priceCandidate) break;
    }
  }
  if (priceCandidate === null) {
    for (const line of cleanedLines) {
      const m = line.match(/([\d.,]+\s*k)\b/iu);
      if (m) {
        priceCandidate = parsePriceValue(m[1]);
        if (priceCandidate) break;
      }
    }
  }

  return { nameCandidate, priceCandidate };
}

// Đọc chữ (OCR) trong 1 ảnh chụp màn hình, đoán tên + giá bán trong caption. Chỉ đọc chữ — việc
// so khớp với sản phẩm có sẵn tách riêng ở matchProductByName(), vì nhiều ảnh chụp màn hình có
// thể cùng 1 caption (nhiều góc chụp của cùng 1 sản phẩm) và chỉ cần so khớp 1 lần cho cả nhóm.
export async function ocrScreenshot(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const file = formData.get("image");
  if (!file || typeof file === "string" || file.size === 0) {
    return { success: false, error: "Thiếu ảnh chụp màn hình." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await ocrImageText(buffer);
    const { nameCandidate, priceCandidate } = pickNameAndPrice(text);
    return { success: true, text, nameCandidate, priceCandidate };
  } catch (err) {
    return { success: false, error: `Lỗi đọc chữ trong ảnh: ${err?.message || "không rõ nguyên nhân"}` };
  }
}

// So khớp mờ (fuzzy, pg_trgm — xem migration_015) 1 tên sản phẩm với các sản phẩm ĐÃ CÓ SẴN.
export async function matchProductByName(name) {
  const authError = requireAdmin();
  if (authError) return authError;

  const text = (name || "").trim();
  if (!text) return { success: true, candidates: [] };

  const { data, error } = await supabaseAdmin.rpc("match_products_by_text", {
    search_text: text,
    match_limit: MATCH_LIMIT,
  });

  if (error) return { success: false, error: error.message, candidates: [] };
  return { success: true, candidates: data || [] };
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

// Gắn NHIỀU ảnh (nhiều góc chụp cùng 1 sản phẩm) vào 1 sản phẩm ĐÃ CÓ SẴN trong 1 lần — thêm vào
// cuối mảng ảnh hiện có, không xoá ảnh cũ (giống nguyên tắc của "Gán ảnh hàng loạt"). Nếu có kèm
// "price" hợp lệ (khác giá đang lưu — admin đã tự xác nhận ở bước xem trước vì giá đọc từ caption
// khác giá cũ) thì cập nhật giá luôn trong cùng 1 lần lưu.
export async function attachPhotosToProduct(formData) {
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

// Không có sản phẩm nào khớp đủ tốt trong database -> TỰ ĐỘNG TẠO MỚI kèm luôn (các) ảnh chụp màn
// hình cùng nhóm (cùng 1 caption = cùng 1 sản phẩm), khỏi phải tạo xong rồi qua "Gán ảnh hàng loạt" riêng.
export async function createProductWithPhotos(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const name = formData.get("name")?.trim();
  const price = Number(formData.get("price"));
  const category = formData.get("category")?.trim();
  const categoryCode = formData.get("categoryCode")?.trim() || "SP";
  const files = formData.getAll("images").filter((f) => typeof f === "object" && f.size > 0);

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
    // Giống nhap-zalo và import CSV: shop không quản lý tồn kho theo từng lượt nhập.
    stock: 9999,
    category,
    brand: null,
    variants: [],
    default_variant: null,
    specs: [],
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
