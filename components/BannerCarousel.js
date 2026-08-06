"use client";

import { useEffect, useState } from "react";

// Đặt ảnh vào public/banner/ đúng các tên file dưới đây để banner tự hiện ảnh —
// không có ảnh thì slide vẫn hiển thị đẹp nhờ nền gradient dự phòng trong CSS (.hero-promo).
const SLIDES = ["/banner/slide-1.jpg", "/banner/slide-2.jpg", "/banner/slide-3.jpg", "/banner/slide-4.jpg"];

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
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className={`hero-banner-slide${i === active ? " is-active" : ""}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="hero-banner-dots">
        {SLIDES.map((src, i) => (
          <button
            key={src}
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
