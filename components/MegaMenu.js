"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Dropdown hiện/ẩn chủ yếu dựa vào CSS ":hover" (ổn định, không lo khoảng hở vài pixel
// giữa nút và bảng xổ xuống làm JS "mouseleave" bắn nhầm). State "openGroup" chỉ dùng để
// hỗ trợ BẤM (client) trên điện thoại/máy tính bảng — nơi không có khái niệm hover chuột.
//
// "groups" có dạng [{ slug, name, categories: [...] }, ...] — lấy từ getCategoriesGrouped()
// trong data/products.js, tên nhóm đọc thẳng từ bảng "category_groups" trong DB (không còn
// hardcode danh sách tên nhóm trong file này nữa — sửa tên nhóm giờ chỉ cần sửa ở /admin).
export default function MegaMenu({ groups }) {
  const [openGroup, setOpenGroup] = useState(null);
  const navRef = useRef(null);

  // Trên thiết bị cảm ứng (không có hover), bấm trigger để mở panel dựa vào state "openGroup" —
  // nhưng nếu khách chạm ra ngoài menu (không phải trigger khác, không phải link con) thì menu
  // không tự đóng, treo mở mãi. Bắt click/tap ngoài vùng <nav> để tự đóng lại.
  useEffect(() => {
    if (!openGroup) return;
    function handleOutsideClick(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openGroup]);

  return (
    <nav className="catnav mega-nav" ref={navRef}>
      {groups.map((g) => (
        <div key={g.slug} className={`mega-group ${openGroup === g.slug ? "open" : ""}`}>
          <button
            type="button"
            className={`mega-trigger ${openGroup === g.slug ? "active" : ""}`}
            onClick={() => setOpenGroup((prev) => (prev === g.slug ? null : g.slug))}
          >
            {g.name} {g.categories.length > 0 && <span className="mega-caret">▾</span>}
          </button>

          {g.categories.length > 0 && (
            <div className="mega-panel">
              {g.categories.map((c) => (
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
