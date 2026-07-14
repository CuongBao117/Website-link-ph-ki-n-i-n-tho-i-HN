"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductGallery({ images, name }) {
  const [active, setActive] = useState(0);
  const list = images && images.length > 0 ? images : [];

  return (
    <div>
      <div
        className="pdp-gallery-main"
        style={
          list[active]
            ? { position: "relative", overflow: "hidden", padding: 0, background: "var(--panel)" }
            : undefined
        }
      >
        {list[active] ? (
          <Image
            src={list[active]}
            alt={name}
            fill
            sizes="(max-width: 900px) 100vw, 500px"
            style={{ objectFit: "contain" }}
            priority
          />
        ) : (
          "ẢNH SẢN PHẨM — GÓC CHÍNH"
        )}
      </div>
      <div className="pdp-thumbs">
        {list.length > 0
          ? list.map((url, i) => (
              <div
                key={url + i}
                className={i === active ? "active" : ""}
                onClick={() => setActive(i)}
                style={{
                  backgroundImage: `url(${url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  cursor: "pointer",
                }}
              />
            ))
          : // Chưa có ảnh nào — hiện lại 4 ô placeholder như cũ
            [0, 1, 2, 3].map((i) => <div key={i} className={i === 0 ? "active" : ""} />)}
      </div>
    </div>
  );
}
