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
};

export default nextConfig;
