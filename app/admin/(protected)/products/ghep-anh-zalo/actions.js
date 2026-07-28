"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { ocrImageText } from "@/lib/ocr";

const MATCH_LIMIT = 5;

// Các dòng chữ kiểu giao diện Zalo (giờ đăng, nút Thích/Bình luận/Chia sẻ...) hay lẫn vào kết
// quả OCR — loại trước để không làm nhiễu bước tìm dòng tên sản phẩm.
const NOISE_LINE = /^(thích|bình luận|chia sẻ|xem thêm|trả lời|phút trước|giờ trước|ngày trước|tuần trước|\d+\s*(phút|giờ|ngày|tuần))/i;

// Từ toàn bộ chữ OCR đọc được trong 1 ảnh chụp màn hình (lẫn cả tên người đăng, giờ đăng, chữ
// nút bấm...), đoán dòng nào nhiều khả năng là TÊN sản phẩm nhất: bỏ các dòng rác đã biết, dòng
// quá ngắn, rồi lấy dòng DÀI NHẤT trong vài dòng đầu — caption tên sản phẩm thường dài hơn hẳn
// chữ giao diện xung quanh.
function pickNameCandidate(text) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && !NOISE_LINE.test(l));

  if (lines.length === 0) return "";
  return lines.slice(0, 6).sort((a, b) => b.length - a.length)[0];
}

// Bóc số + "k" ra khỏi chuỗi giá kiểu Zalo: "Sỉ 23k" -> 23000, "125.000đ" -> 125000.
// Giống hệt logic parsePrice() trong NhapZaloForm.js — cố tình KHÔNG import chung 1 file để
// không phải sửa file đã hoạt động ổn định, chỉ thêm mới.
function parsePrice(raw) {
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

// Từ chữ OCR đọc được, tìm dòng ghi giá kiểu "Sỉ 23k" / "Giá 125.000đ" — nếu không thấy dòng rõ
// ràng thì quét cả khối tìm số+k đầu tiên (dự phòng, giống NhapZaloForm.js).
function pickPriceCandidate(text) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const priceMatch =
      line.match(/s[ỉi]\s*:?\s*([\d.,]+\s*k?)/iu) || line.match(/gi[áa]\s*:?\s*([\d.,]+\s*k?)/iu);
    if (priceMatch) {
      const price = parsePrice(priceMatch[1]);
      if (price !== null) return price;
    }
  }

  const fallback = String(text || "").match(/([\d.,]+\s*k)\b/iu);
  return fallback ? parsePrice(fallback[1]) : null;
}

// Đọc chữ (OCR) trong 1 ảnh chụp màn hình bài đăng Zalo, đoán tên + giá sản phẩm, rồi tìm các
// sản phẩm gần đúng nhất đã có sẵn trong database (so khớp mờ theo pg_trgm, xem migration_015).
//
// Việc tải ảnh lên/gắn vào sản phẩm/tạo sản phẩm mới KHÔNG xử lý ở file này — dùng thẳng
// attachImageToProduct/createProductWithImage đã có sẵn ở gan-anh/actions.js, gọi riêng 1 ảnh/lần
// từ phía client (xem GhepAnhZaloBatch.js) để mỗi sản phẩm nhiều ảnh không bị gộp chung 1 request
// rồi vượt giới hạn dung lượng của Server Action (25MB, xem next.config.js).
export async function matchScreenshotText(formData) {
  const authError = requireAdmin();
  if (authError) return authError;

  const file = formData.get("image");
  if (!file || typeof file === "string" || file.size === 0) {
    return { success: false, error: "Thiếu ảnh chụp màn hình." };
  }

  let text = "";
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await ocrImageText(buffer);
  } catch (err) {
    return { success: false, error: `Lỗi đọc chữ trong ảnh: ${err?.message || "không rõ nguyên nhân"}` };
  }

  const nameCandidate = pickNameCandidate(text);
  const ocrPrice = pickPriceCandidate(text);
  if (!nameCandidate) {
    return { success: true, text, nameCandidate: "", ocrPrice, candidates: [] };
  }

  const { data, error } = await supabaseAdmin.rpc("match_products_by_text", {
    search_text: nameCandidate,
    match_limit: MATCH_LIMIT,
  });

  if (error) {
    return { success: false, error: error.message, text, nameCandidate, ocrPrice };
  }

  return { success: true, text, nameCandidate, ocrPrice, candidates: data || [] };
}
