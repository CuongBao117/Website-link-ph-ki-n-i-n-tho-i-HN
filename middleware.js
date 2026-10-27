import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Middleware này chạy trước các request của trang web để quản lý phiên đăng nhập Supabase.
// Đã được tối ưu hóa để đảm bảo độ tin cậy và tuân thủ giới hạn của Vercel:
// 1. Không dùng NextResponse.redirect() / rewrite() trực tiếp ở đây -> Tránh hoàn toàn nguy cơ vòng lặp vô hạn (Infinite Loop).
// 2. Không gọi API bên ngoài nếu không cần thiết: chỉ gọi Supabase auth khi request thực sự có cookie đăng nhập (sb-*).
// 3. Có cơ chế timeout và try/catch an toàn: không làm sập trang web nếu Supabase phản hồi chậm.
// 4. Matcher chặt chẽ: loại trừ toàn bộ file tĩnh (ảnh, CSS, JS, font, favicon...) để tránh kích hoạt middleware không cần thiết.

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Nếu chưa cấu hình biến môi trường Supabase, bỏ qua an toàn để tránh lỗi runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  // Tối ưu hiệu năng: Khách vãng lai (chiếm đa số lưu lượng) không có cookie phiên đăng nhập Supabase (tiền tố sb-).
  // Chỉ gọi getUser() khi thực sự có cookie auth để làm mới token.
  // Tránh việc gửi request HTTP ra ngoài tới Supabase trên mọi lượt tải trang dẫn đến nghẽn mạng hoặc quá timeout Vercel.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  if (!hasAuthCookie) {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Làm mới token nếu token sắp hết hạn.
    // Bọc trong timeout 3s để tránh bị Vercel Edge Function timeout
    // trong trường hợp mạng chập chờn hoặc Supabase phản hồi chậm.
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(null);
      }, 3000);

      supabase.auth
        .getUser()
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  } catch (error) {
    console.error("Lỗi làm mới phiên đăng nhập trong middleware:", error);
  }

  return response;
}

export const config = {
  // Áp dụng cho mọi trang NGOẠI TRỪ:
  // - Tài nguyên nội bộ của Next.js (_next/static, _next/image)
  // - File metadata (favicon.ico, sitemap.xml, robots.txt)
  // - Toàn bộ các file tĩnh (ảnh, CSS, JS, font, media, tài liệu)
  // Việc loại trừ này ngăn middleware chạy lặp lại vô ích hàng chục lần trên mỗi lượt tải trang,
  // giảm tải tối đa cho Edge Functions và tránh lỗi timeout trên Vercel.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|bmp|css|js|mjs|map|woff|woff2|ttf|eot|otf|json|csv|txt|xml)$).*)",
  ],
};
