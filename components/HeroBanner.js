"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  {
    title: "Linh kiện chính hãng",
    desc: "Màn hình, pin, camera, cụm sạc... đúng mã, đúng đời máy",
    gradient: "linear-gradient(135deg, #16241f, #2f6f62)",
  },
  {
    title: "Phụ kiện đa dạng",
    desc: "Ốp lưng, cóc sạc, dây sạc, sạc dự phòng, tai nghe, loa...",
    gradient: "linear-gradient(135deg, #a9622c, #c97a3d)",
  },
  {
    title: "Đồ nghề sửa chữa",
    desc: "Dụng cụ tháo lắp chuyên dụng, đầy đủ cho thợ và người tự sửa",
    gradient: "linear-gradient(135deg, #2f6f62, #16241f)",
  },
];

export default function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="hero-banner" style={{ background: slide.gradient }}>
      <div className="hero-banner-text">
        <div className="hero-banner-title">{slide.title}</div>
        <div className="hero-banner-desc">{slide.desc}</div>
      </div>
      <div className="hero-banner-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === index ? "active" : ""}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
