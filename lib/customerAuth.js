import { createSupabaseServerClient } from "@/lib/supabaseServer";

// Trả về thông tin tài khoản khách hàng đang đăng nhập (email, id...), hoặc null nếu
// chưa đăng nhập. KHÔNG liên quan gì đến đăng nhập admin (xem lib/adminAuth.js) — đây là
// tài khoản khách mua hàng, dùng Supabase Auth.
export async function getCustomerUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
