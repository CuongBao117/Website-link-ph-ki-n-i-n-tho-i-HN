"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Slide "brand" dựng bằng code (logo + slogan) — không cần ảnh dựng sẵn.
// Slide "image" đặt file vào public/banner/ đúng tên bên dưới thì tự hiện; thiếu file thì rơi về
// nền gradient dự phòng trong CSS (.hero-promo), không vỡ layout.
// TODO: còn 2 ô "image" đang để trống chờ ảnh thật (banner khuyến mãi + ảnh so sánh sản phẩm) —
// thêm file /banner/slide-1.jpg và /banner/slide-2.jpg khi có.
const SLIDES = [
  { type: "brand" },
  { type: "image", src: "/banner/slide-1.jpg" },
  { type: "image", src: "/banner/slide-2.jpg" },
];

export default function BannerCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-banner-slides" aria-hidden="true">
      {SLIDES.map((slide, i) =>
        slide.type === "brand" ? (
          <div key="brand" className={`hero-banner-slide hero-banner-slide--brand${i === active ? " is-active" : ""}`}>
            <div className="hero-banner-brand">
              <Image src="/logo.png" alt="" width={88} height={88} className="hero-banner-brand-logo" />
              <span className="hero-banner-brand-slogan">Công nghệ &amp; Thiết bị</span>
            </div>
          </div>
        ) : (
          <div
            key={slide.src}
            className={`hero-banner-slide${i === active ? " is-active" : ""}`}
            style={{ backgroundImage: `url(${slide.src})` }}
          />
        )
      )}
      <div className="hero-banner-dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.type === "brand" ? "brand" : slide.src}
            type="button"
            className={`hero-banner-dot${i === active ? " is-active" : ""}`}
            aria-label={`Ảnh ${i + 1}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
