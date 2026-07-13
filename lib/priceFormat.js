// Định dạng số tiền kiểu Việt Nam khi ĐANG GÕ (VD "115000" -> "115.000") và ngược lại.
// Dùng chung cho các ô nhập giá trong trang admin (components/PriceInput.js).
export function formatPriceDigits(digits) {
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

export function onlyDigits(value) {
  return (value || "").replace(/\D/g, "");
}
