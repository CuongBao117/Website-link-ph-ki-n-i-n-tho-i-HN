// Domain thật của site — PHẢI đặt NEXT_PUBLIC_SITE_URL trong Environment Variables trên Vercel
// (VD: https://linhkien.store, không có dấu "/" ở cuối). Thiếu biến này thì sitemap.xml,
// robots.txt, thẻ Open Graph và JSON-LD sẽ tạm dùng URL rỗng/placeholder bên dưới — sai domain
// thật thì Google Search Console sẽ không xác minh được sitemap.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://linhkien-store.vercel.app").replace(/\/$/, "");
