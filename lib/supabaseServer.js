import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase "biết" phiên đăng nhập của khách (đọc/ghi qua cookie trình duyệt gửi lên).
// Khác với lib/supabase.js (đọc công khai, không biết ai đang đăng nhập) và
// lib/supabaseAdmin.js (service_role key, bỏ qua toàn bộ RLS, dùng cho trang admin).
//
// Dùng trong Server Component, Server Action, Route Handler — bất kỳ đâu có quyền truy cập
// cookies() của Next.js.
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // set() bị gọi trong 1 Server Component thuần (không phải Server Action/Route
            // Handler) sẽ ném lỗi vì Next.js không cho sửa cookie ở đó — bỏ qua an toàn,
            // vì middleware.js đã lo việc làm mới cookie phiên đăng nhập ở mọi request rồi.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Tương tự set() ở trên.
          }
        },
      },
    }
  );
}
