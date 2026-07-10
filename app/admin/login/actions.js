"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isCorrectAdminPassword, createAdminSessionValue, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export async function login(formData) {
  const password = formData.get("password");

  if (isCorrectAdminPassword(password)) {
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

  redirect("/admin/login?error=1");
}

export async function logout() {
  cookies().delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}
