// Phân loại có giá riêng cho 1 sản phẩm — vd cùng "Vỏ bộ Full A57-4G" nhưng "Vỏ" 100k / "Xương"
// 45k, hiển thị trên trang sản phẩm giống chọn size quần áo. Dùng chung giữa storefront (chọn
// phân loại, giỏ hàng) và admin (form thêm/sửa, tool Nhập từ bài đăng Zalo).
//
// Lưu ở cột "price_options" (jsonb, mặc định []) — KHÁC với cột "variants" (dòng máy tương thích,
// dùng chung 1 giá) đã có sẵn, không đụng vào để không phá lọc/tìm kiếm theo variants sẵn có.

// Tìm giá đúng theo tên phân loại đã chọn — không thấy (chưa chọn, hoặc sản phẩm không có phân
// loại) thì rơi về giá gốc của sản phẩm.
export function getEffectivePrice(product, priceOptionName) {
  const options = product?.priceOptions || [];
  if (!priceOptionName || options.length === 0) return product?.price ?? null;
  const match = options.find((o) => o.name === priceOptionName);
  return match ? match.price : product?.price ?? null;
}

// Giá hiển thị trên thẻ sản phẩm/trang danh mục khi CHƯA chọn phân loại nào — nếu các phân loại
// có giá khác nhau, hiện giá THẤP NHẤT kèm cờ "isRange" để nơi hiển thị tự thêm chữ "Từ".
export function getDisplayPrice(product) {
  const options = product?.priceOptions || [];
  if (options.length === 0) return { price: product?.price ?? null, isRange: false };
  const prices = options.map((o) => o.price).filter((p) => Number.isFinite(p));
  if (prices.length === 0) return { price: product?.price ?? null, isRange: false };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { price: min, isRange: min !== max };
}

// Parse text dạng "Tên|Giá" mỗi dòng (giống định dạng "specs" đã dùng trong ProductForm) thành
// mảng [{name, price}] — dùng cho form admin nhập tay.
export function parsePriceOptionsText(text) {
  return (text || "")
    .split("\n")
    .map((line) => {
      const [name, priceRaw] = line.split("|").map((s) => s.trim());
      const price = Number(String(priceRaw || "").replace(/[^\d]/g, ""));
      return name && Number.isFinite(price) && price > 0 ? { name, price } : null;
    })
    .filter(Boolean);
}

// Ngược lại parsePriceOptionsText — hiện lại text trong ô sửa của form admin.
export function formatPriceOptionsText(priceOptions) {
  return (priceOptions || []).map((o) => `${o.name}|${o.price}`).join("\n");
}
