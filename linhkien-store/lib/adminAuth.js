import crypto from "crypto";
import { cookies } from "next/headers";

// Trước đây cookie "admin_auth" lưu THẲNG mật khẩu admin — nếu cookie lộ ra
// (log, extension trình duyệt độc hại, lỗi cấu hình...) kẻ xấu có luôn mật khẩu gốc.
// Giờ cookie chỉ lưu một "chữ ký" (HMAC) suy ra từ mật khẩu + khoá bí mật riêng.
// Có được chữ ký này KHÔNG giúp suy ngược ra mật khẩu, và không dùng để đăng nhập nơi khác.

// Tên cookie phiên đăng nhập admin — đổi tên so với cookie cũ "admin_auth" (từng lưu thẳng
// mật khẩu) để không có chuyện trình duyệt còn giữ cookie cũ tưởng vẫn hợp lệ.
export const ADMIN_COOKIE_NAME = "admin_session";

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

// Đọc cookie phiên đăng nhập của request hiện tại và kiểm tra có hợp lệ không.
// Dùng được ở bất kỳ đâu chạy trên server: Server Component, Server Action, layout...
export function isAdminAuthed() {
  const value = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminSession(value);
}

// Chặn đầu vào cho các Server Action chỉnh sửa dữ liệu (thêm/sửa/xoá sản phẩm, danh mục...).
//
// QUAN TRỌNG: Server Action của Next.js là 1 endpoint HTTP thật — ai biết ID action (nằm sẵn
// trong file JS gửi về trình duyệt) đều gọi thẳng được, KHÔNG bắt buộc phải đăng nhập /admin
// hay đi qua layout bảo vệ trước. Vì vậy mỗi Server Action làm thay đổi dữ liệu đều phải tự
// kiểm tra đăng nhập ngay trong thân hàm — không được tin tưởng rằng "đứng sau layout admin
// là an toàn", vì Server Action không bắt buộc phải "đứng sau" layout nào cả.
//
// Trả về { success: false, error } nếu CHƯA đăng nhập (để action return thẳng ra ngoài),
// hoặc null nếu đã đăng nhập hợp lệ (action tiếp tục chạy bình thường).
export function requireAdmin() {
  if (!isAdminAuthed()) {
    return { success: false, error: "Không có quyền truy cập — vui lòng đăng nhập lại." };
  }
  return null;
}
