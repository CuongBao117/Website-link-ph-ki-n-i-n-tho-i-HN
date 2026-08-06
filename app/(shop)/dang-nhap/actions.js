"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Chống dò mật khẩu: khoá tạm 1 email nếu nhập sai quá MAX_ATTEMPTS lần trong WINDOW_MINUTES
// phút gần nhất (xem bảng "login_attempts", supabase/migration_017_login_rate_limit.sql).
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

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

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  // Dọn bớt log cũ (mọi email, không chỉ email đang đăng nhập) để bảng không phình to theo
  // thời gian — không cần pg_cron riêng, tiện tay dọn ngay trong lượt đăng nhập này.
  // Nếu bảng chưa tồn tại (quên chạy migration_017) thì bỏ qua lỗi — KHÔNG chặn đăng nhập của
  // toàn bộ khách chỉ vì thiếu 1 bảng phụ trợ (fail open, không fail closed).
  await supabaseAdmin.from("login_attempts").delete().lt("created_at", windowStart);

  const { count, error: countError } = await supabaseAdmin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", windowStart);

  if (!countError && (count ?? 0) >= MAX_ATTEMPTS) {
    backToLogin(`Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${WINDOW_MINUTES} phút.`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await supabaseAdmin.from("login_attempts").insert({ email });
    backToLogin("Email hoặc mật khẩu không đúng.");
  }

  // Đăng nhập thành công -> xoá lịch sử nhập sai của email này, không giữ khoá cho lần sau.
  await supabaseAdmin.from("login_attempts").delete().eq("email", email);

  // Chỉ redirect vào đường dẫn nội bộ (bắt đầu bằng "/" nhưng KHÔNG phải "//") — "//evil.com"
  // cũng thoả startsWith("/") nhưng trình duyệt hiểu là URL tuyệt đối (protocol-relative), nên
  // phải chặn riêng để không bị lợi dụng "next" chuyển hướng khách sang trang ngoài sau khi
  // đăng nhập (open redirect).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  redirect(safeNext);
}

export async function logout() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
