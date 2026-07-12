"use client";

import { useState } from "react";
import Link from "next/link";

// Kiểu accordion: bấm 1 danh mục lớn để xổ danh mục con ngay bên dưới, trong cùng khung
// (không bung ra ngoài đè lên banner nữa). Chỉ mở 1 nhóm tại 1 thời điểm.
export default function CategoryShowcaseList({ items }) {
  const [openSlug, setOpenSlug] = useState(null);

  return (
    <div className="hero-cat-list">
      {items.map((item) => {
        const isOpen = openSlug === item.slug;
        return (
          <div key={item.slug} className={`hero-cat-item-wrap ${isOpen ? "open" : ""}`}>
            <button
              type="button"
              className="hero-cat-item"
              onClick={() => setOpenSlug((prev) => (prev === item.slug ? null : item.slug))}
            >
              <span>{item.name}</span>
              {item.categories.length > 0 && <span className="hero-cat-caret">▾</span>}
            </button>

            {item.categories.length > 0 && isOpen && (
              <div className="hero-cat-sublist">
                {item.categories.map((c) => (
                  <Link key={c.slug} href={`/danh-muc/${c.slug}`}>
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
