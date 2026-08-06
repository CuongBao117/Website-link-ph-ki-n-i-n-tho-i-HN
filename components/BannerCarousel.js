import Image from "next/image";

// Chỉ có 1 slide "brand" (logo + slogan) — CHƯA có ảnh thật nào để chạy/luân phiên. Trước đây có
// thêm 2 ô slide "image" trỏ tới /banner/slide-1.jpg và slide-2.jpg nhưng 2 file đó không tồn
// tại, nên carousel vẫn "chạy" nhưng đổi qua lại giữa các khung TRỐNG giống hệt nhau — nhìn như
// banner đứng yên/hỏng. Khi có ảnh thật, đổi lại thành danh sách nhiều slide + interval xoay vòng
// (xem lịch sử file) thay vì slide tĩnh này.
export default function BannerCarousel() {
  return (
    <div className="hero-banner-slides" aria-hidden="true">
      <div className="hero-banner-slide hero-banner-slide--brand is-active">
        <div className="hero-banner-brand">
          <Image src="/logo.png" alt="" width={88} height={88} className="hero-banner-brand-logo" />
          <span className="hero-banner-brand-slogan">Công nghệ &amp; Thiết bị</span>
        </div>
      </div>
    </div>
  );
}
