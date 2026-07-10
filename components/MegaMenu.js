"use client";

import { useState } from "react";
import Link from "next/link";

const GROUP_LABELS = {
  "linh-kien": "Linh kiện",
  "phu-kien": "Phụ kiện",
  "do-nghe": "Đồ nghề sửa chữa",
  "do-choi-cong-nghe": "Đồ chơi công nghệ",
};

// Dropdown hiện/ẩn chủ yếu dựa vào CSS ":hover" (ổn định, không lo khoảng hở vài pixel
// giữa nút và bảng xổ xuống làm JS "mouseleave" bắn nhầm). State "openGroup" chỉ dùng để
// hỗ trợ BẤM (client) trên điện thoại/máy tính bảng — nơi không có khái niệm hover chuột.
export default function MegaMenu({ groups }) {
  const [openGroup, setOpenGroup] = useState(null);

  return (
    <nav className="catnav mega-nav">
      {Object.entries(groups).map(([slug, children]) => (
        <div key={slug} className={`mega-group ${openGroup === slug ? "open" : ""}`}>
          <button
            type="button"
            className={`mega-trigger ${openGroup === slug ? "active" : ""}`}
            onClick={() => setOpenGroup((prev) => (prev === slug ? null : slug))}
          >
            {GROUP_LABELS[slug] || slug} {children.length > 0 && <span className="mega-caret">▾</span>}
          </button>

          {children.length > 0 && (
            <div className="mega-panel">
              {children.map((c) => (
                <Link key={c.slug} href={`/danh-muc/${c.slug}`} onClick={() => setOpenGroup(null)}>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
