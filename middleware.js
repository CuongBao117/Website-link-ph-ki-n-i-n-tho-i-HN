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
  // Middleware này chạy trên MỌI trang (kể cả trang chủ), nên nếu Supabase chậm/không phản hồi
  // (mất mạng, dự án Supabase bị tạm ngưng...) mà không giới hạn thời gian chờ, cả website sẽ
  // treo và Vercel trả lỗi 504 MIDDLEWARE_INVOCATION_TIMEOUT — kể cả với khách không cần đăng
  // nhập. Nên đặt giới hạn 5 giây: hết giờ thì bỏ qua bước làm mới token, vẫn cho trang chạy
  // tiếp bình thường (khách chỉ bị đăng xuất sớm hơn dự kiến, còn hơn cả site sập).
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("supabase auth timeout")), 5000)),
    ]);
  } catch {
    // Bỏ qua lỗi/timeout — cho request đi tiếp với response hiện có.
  }

  return response;
}

export const config = {
  // Áp dụng cho mọi trang NGOẠI TRỪ file tĩnh (ảnh, favicon...) và tài nguyên nội bộ của
  // Next.js — không cần làm mới phiên đăng nhập cho những request này.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
