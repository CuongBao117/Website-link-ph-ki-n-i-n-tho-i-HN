import crypto from "crypto";

// Trước đây cookie "admin_auth" lưu THẲNG mật khẩu admin — nếu cookie lộ ra
// (log, extension trình duyệt độc hại, lỗi cấu hình...) kẻ xấu có luôn mật khẩu gốc.
// Giờ cookie chỉ lưu một "chữ ký" (HMAC) suy ra từ mật khẩu + khoá bí mật riêng.
// Có được chữ ký này KHÔNG giúp suy ngược ra mật khẩu, và không dùng để đăng nhập nơi khác.

function getSecret() {
  // Nên đặt ADMIN_SESSION_SECRET riêng trong .env.local (chuỗi ngẫu nhiên bất kỳ, càng dài càng tốt).
  // Nếu chưa kịp thêm, tạm dùng ADMIN_PASSWORD để không phá vỡ site đang chạy — nhưng hãy thêm sớm.
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function timingSafeEqualStrings(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  // So sánh theo thời gian không đổi — tránh lộ thông tin qua việc đo thời gian phản hồi (timing attack)
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createAdminSessionValue() {
  return crypto.createHmac("sha256", getSecret()).update("admin-session").digest("hex");
}

export function isValidAdminSession(cookieValue) {
  if (!cookieValue) return false;
  return timingSafeEqualStrings(cookieValue, createAdminSessionValue());
}

export function isCorrectAdminPassword(password) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!password || !real) return false;
  return timingSafeEqualStrings(password, real);
}
