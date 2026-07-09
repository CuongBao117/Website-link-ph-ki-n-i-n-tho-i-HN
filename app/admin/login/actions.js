"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData) {
  const password = formData.get("password");

  if (password && password === process.env.ADMIN_PASSWORD) {
    cookies().set("admin_auth", process.env.ADMIN_PASSWORD, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });
    redirect("/admin/orders");
  }

  redirect("/admin/login?error=1");
}

export async function logout() {
  cookies().delete("admin_auth");
  redirect("/admin/login");
}
