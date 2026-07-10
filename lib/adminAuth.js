import crypto from "crypto";
import { cookies } from "next/headers";

// Tru?c dây cookie "admin_auth" luu TH?NG m?t kh?u admin  n?u cookie l? ra
// (log, extension trình duy?t d?c h?i, l?i c?u hình...) k? x?u có luôn m?t kh?u g?c.
// Gi? cookie ch? luu m?t "ch? ky" (HMAC) suy ra t? m?t kh?u + khoá bí m?t riêng.
// Có du?c ch? ky này KHONG giúp suy ngu?c ra m?t kh?u, và không dùng d? dang nh?p noi khác.

// Tên cookie phiên dang nh?p admin  d?i tên so v?i cookie cu "admin_auth" (t?ng luu th?ng
// m?t kh?u) d? không có chuy?n trình duy?t còn gi? cookie cu tu?ng v?n h?p l?.
export const ADMIN_COOKIE_NAME = "admin_session";

function getSecret() {
  // Nên d?t ADMIN_SESSION_SECRET riêng trong .env.local (chu?i ng?u nhiên b?t k?, càng dài càng t?t).
  // N?u chua k?p thêm, t?m dùng ADMIN_PASSWORD d? không phá v? site dang ch?y  nhung hay thêm s?m.
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function timingSafeEqualStrings(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  // So sánh theo th?i gian không d?i  tránh l? thông tin qua vi?c do th?i gian ph?n h?i (timing attack)
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

// D?c cookie phiên dang nh?p c?a request hi?n t?i và ki?m tra có h?p l? không.
// Dùng du?c ? b?t k? dâu ch?y trên server: Server Component, Server Action, layout...
export function isAdminAuthed() {
  const value = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminSession(value);
}

// Ch?n d?u vào cho các Server Action ch?nh s?a d? li?u (thêm/s?a/xoá s?n ph?m, danh m?c...).
//
// QUAN TR?NG: Server Action c?a Next.js là 1 endpoint HTTP th?t  ai bi?t ID action (n?m s?n
// trong file JS g?i v? trình duy?t) d?u g?i th?ng du?c, KHONG b?t bu?c ph?i dang nh?p /admin
// hay di qua layout b?o v? tru?c. Vì v?y m?i Server Action làm thay d?i d? li?u d?u ph?i t?
// ki?m tra dang nh?p ngay trong thân hàm  không du?c tin tu?ng r?ng "d?ng sau layout admin
// là an toàn", vì Server Action không b?t bu?c ph?i "d?ng sau" layout nào c?.
//
// Tr? v? { success: false, error } n?u CHUA dang nh?p (d? action return th?ng ra ngoài),
// ho?c null n?u da dang nh?p h?p l? (action ti?p t?c ch?y bình thu?ng).
export function requireAdmin() {
  if (!isAdminAuthed()) {
    return { success: false, error: "Không có quy?n truy c?p  vui lòng dang nh?p l?i." };
  }
  return null;
}
