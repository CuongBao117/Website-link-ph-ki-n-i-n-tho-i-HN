"use client";

import { useState } from "react";
import Link from "next/link";

// Hover (chuột) mở flyout qua CSS ":hover" — ổn định, không lo khoảng hở gây mất hover.
// State "openSlug" chỉ dùng để hỗ trợ BẤM trên điện thoại/máy tính bảng (không có hover).
export default function CategoryShowcaseList({ items }) {
  const [openSlug, setOpenSlug] = useState(null);

  return (
    <div className="hero-cat-list">
      {items.map((item) => (
        <div
          key={item.slug}
          className={`hero-cat-item-wrap ${openSlug === item.slug ? "open" : ""}`}
        >
          <button
            type="button"
            className="hero-cat-item"
            onClick={() => setOpenSlug((prev) => (prev === item.slug ? null : item.slug))}
          >
            <span className="hero-cat-icon">{item.icon}</span>
            <span>{item.name}</span>
            {item.categories.length > 0 && <span className="hero-cat-caret">›</span>}
          </button>

          {item.categories.length > 0 && (
            <div className="hero-cat-flyout">
              {item.categories.map((c) => (
                <Link key={c.slug} href={`/danh-muc/${c.slug}`} onClick={() => setOpenSlug(null)}>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
