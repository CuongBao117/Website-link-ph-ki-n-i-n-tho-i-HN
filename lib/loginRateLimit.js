import { headers } from "next/headers";

// Chống dò mật khẩu admin bằng script: giới hạn số lần đăng nhập sai theo IP trong 1 cửa sổ
// thời gian, khoá tạm IP đó nếu vượt ngưỡng. Lưu trong bộ nhớ tiến trình (không cần thêm bảng
// DB) — đủ dùng cho quy mô 1 admin/1 mật khẩu của site này. Hạn chế: reset khi server khởi
// động lại hoặc chạy nhiều instance song song không chia sẻ state; chấp nhận được vì đây là
// lớp phòng thủ bổ sung, không phải cơ chế bảo mật duy nhất.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const attemptsByIp = new Map();

function getClientIp() {
  const h = headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

function pruneExpired(now) {
  for (const [ip, rec] of attemptsByIp) {
    const stillLocked = rec.lockedUntil && rec.lockedUntil > now;
    const withinWindow = now - rec.firstAttemptAt < WINDOW_MS;
    if (!stillLocked && !withinWindow) attemptsByIp.delete(ip);
  }
}

export function checkLoginRateLimit() {
  const ip = getClientIp();
  const now = Date.now();
  pruneExpired(now);

  const rec = attemptsByIp.get(ip);
  if (rec?.lockedUntil && rec.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((rec.lockedUntil - now) / 1000) };
  }
  return { allowed: true, ip };
}

export function recordLoginFailure(ip) {
  const now = Date.now();
  let rec = attemptsByIp.get(ip);
  if (!rec || now - rec.firstAttemptAt > WINDOW_MS) {
    rec = { count: 0, firstAttemptAt: now, lockedUntil: 0 };
  }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCKOUT_MS;
  }
  attemptsByIp.set(ip, rec);
}

export function recordLoginSuccess(ip) {
  attemptsByIp.delete(ip);
}
