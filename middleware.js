import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Token đăng nhập của Supabase Auth hết hạn sau một thời gian — middleware này chạy trước
// MỌI request, tự kiểm tra và làm mới token nếu cần, rồi ghi lại cookie mới vào response.
// Không có bước này, khách sẽ bị đăng xuất đột ngột giữa chừng dù chưa hết 1 tuần đăng nhập.
export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Gọi getUser() (không phải chỉ đọc session) để Supabase tự làm mới token nếu sắp hết hạn.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Áp dụng cho mọi trang NGOẠI TRỪ file tĩnh (ảnh, favicon...) và tài nguyên nội bộ của
  // Next.js — không cần làm mới phiên đăng nhập cho những request này.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
