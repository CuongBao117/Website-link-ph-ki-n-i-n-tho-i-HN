// Ảnh sản phẩm được lưu ở Supabase Storage (bucket "product-images"), URL public dạng
// https://<project-ref>.supabase.co/storage/v1/object/public/... — next/image cần khai báo
// trước domain remote nào được phép tối ưu ảnh, nên lấy thẳng từ NEXT_PUBLIC_SUPABASE_URL.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js mặc định giới hạn dữ liệu gửi lên qua Server Action ở 1MB — quá nhỏ để:
  //  (1) tải nhiều ảnh sản phẩm (ảnh chụp điện thoại thường 2–8MB/ảnh), và
  //  (2) nhập file CSV hàng nghìn dòng cho tính năng "Nhập hàng loạt".
  // Nâng lên 25MB cho thoải mái cả 2 trường hợp.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
