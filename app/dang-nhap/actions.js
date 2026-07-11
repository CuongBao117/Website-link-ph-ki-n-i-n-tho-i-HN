"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function login(formData) {
  const email = formData.get("email")?.trim();
  const password = formData.get("password");
  const next = formData.get("next")?.trim() || "/";

  const backToLogin = (message) => {
    const qs = new URLSearchParams({ error: message, next });
    redirect(`/dang-nhap?${qs.toString()}`);
  };

  if (!email || !password) {
    backToLogin("Vui lòng nhập đủ email và mật khẩu.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    backToLogin("Email hoặc mật khẩu không đúng.");
  }

  // Chỉ redirect vào đường dẫn nội bộ (bắt đầu bằng "/") — tránh bị lợi dụng "next" để
  // chuyển hướng khách sang trang bên ngoài sau khi đăng nhập (open redirect).
  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
