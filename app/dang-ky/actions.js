"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function register(formData) {
  const name = formData.get("name")?.trim();
  const email = formData.get("email")?.trim();
  const password = formData.get("password");

  if (!name || !email || !password) {
    redirect(`/dang-ky?error=${encodeURIComponent("Vui lòng điền đủ họ tên, email và mật khẩu.")}`);
  }
  if (password.length < 6) {
    redirect(`/dang-ky?error=${encodeURIComponent("Mật khẩu phải có ít nhất 6 ký tự.")}`);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    // Supabase trả message tiếng Anh — dịch vài lỗi hay gặp nhất cho khách dễ hiểu.
    const msg = error.message?.includes("already registered")
      ? "Email này đã có tài khoản — hãy đăng nhập hoặc dùng email khác."
      : error.message || "Đăng ký thất bại, vui lòng thử lại.";
    redirect(`/dang-ky?error=${encodeURIComponent(msg)}`);
  }

  // Nếu dự án đã TẮT "Confirm email" trong Supabase Dashboard, signUp() đăng nhập luôn
  // (có sẵn session) — cho khách vào thẳng trang chủ. Nếu vẫn BẬT (mặc định), khách phải
  // bấm link xác nhận trong email trước, nên chuyển sang trang đăng nhập kèm thông báo.
  if (data.session) {
    redirect("/");
  }

  redirect("/dang-nhap?registered=1");
}
