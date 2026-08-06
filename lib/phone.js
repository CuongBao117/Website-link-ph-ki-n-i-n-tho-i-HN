// Kiểm tra số điện thoại Việt Nam hợp lệ — 10 số bắt đầu bằng 0, hoặc +84 theo sau 9 số.
// Dùng ở CẢ client (CheckoutForm, phản hồi ngay) LẪN server (dat-hang/actions.js, không tin
// tưởng validate phía client vì Server Action có thể bị gọi thẳng, bỏ qua form/UI).
export function isValidVNPhone(value) {
  const cleaned = (value || "").replace(/[\s.-]/g, "");
  return /^(0\d{9}|\+84\d{9})$/.test(cleaned);
}
