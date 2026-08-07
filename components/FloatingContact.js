"use client";

import { useEffect, useRef, useState } from "react";

const HOTLINE = "0357 105 530";
const HOTLINE_TEL = "0357105530";

export default function FloatingContact() {
  const [scrolling, setScrolling] = useState(false);
  const hideTimerRef = useRef(null);

  // Ẩn tạm 2 nút nổi trong lúc đang cuộn (position: fixed nên luôn đè lên bất kỳ nội dung nào
  // cuộn qua, kể cả nút "Thêm vào giỏ hàng" của card cột phải) — hiện lại ngay sau khi NGỪNG cuộn
  // ~400ms. Nhờ vậy giữ được layout sát mép như cũ (không cần chừa khoảng trống cố định trong
  // .prod-grid) mà vẫn tránh được lúc thao tác thật (bấm nút) bị 2 nút này che mất.
  useEffect(() => {
    function handleScroll() {
      setScrolling(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setScrolling(false), 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <div className={`floating-contact${scrolling ? " floating-contact--hidden" : ""}`}>
      <a
        href={`https://zalo.me/${HOTLINE_TEL}`}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-contact__btn floating-contact__btn--zalo"
        title={`Chat Zalo: ${HOTLINE}`}
        aria-label={`Chat Zalo: ${HOTLINE}`}
      >
        <span className="floating-contact__ring" aria-hidden="true" />
        <span className="floating-contact__zalo-text" aria-hidden="true">
          Zalo
        </span>
      </a>

      <a
        href={`tel:${HOTLINE_TEL}`}
        className="floating-contact__btn floating-contact__btn--phone"
        title={`Gọi hotline: ${HOTLINE}`}
        aria-label={`Gọi hotline: ${HOTLINE}`}
      >
        <span className="floating-contact__ring" aria-hidden="true" />
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path d="M6.6 10.8c1.4 2.8 3.7 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" />
        </svg>
      </a>
    </div>
  );
}
