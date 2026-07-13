"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isCorrectAdminPassword, createAdminSessionValue, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { checkLoginRateLimit, recordLoginFailure, recordLoginSuccess } from "@/lib/loginRateLimit";

export async function login(formData) {
  const rateLimit = checkLoginRateLimit();
  if (!rateLimit.allowed) {
    const minutes = Math.ceil(rateLimit.retryAfterSec / 60);
    redirect(
      `/admin/login?error=${encodeURIComponent(
        `Đã thử sai quá nhiều lần — vui lòng đợi khoảng ${minutes} phút rồi thử lại.`
      )}`
    );
  }

  const password = formData.get("password");

  if (isCorrectAdminPassword(password)) {
    recordLoginSuccess(rateLimit.ip);
    // Cookie giờ chỉ lưu chữ ký HMAC (xem lib/adminAuth.js) — không còn lưu thẳng mật khẩu nữa.
    cookies().set(ADMIN_COOKIE_NAME, createAdminSessionValue(), {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    redirect("/admin/orders");
  }

  recordLoginFailure(rateLimit.ip);
  redirect(`/admin/login?error=${encodeURIComponent("Sai mật khẩu, vui lòng thử lại.")}`);
}

export async function logout() {
  cookies().delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}
