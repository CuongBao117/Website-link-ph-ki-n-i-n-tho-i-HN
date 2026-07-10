"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/products", label: "Sản phẩm" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  // AdminLiveOrders.js (chạy polling) phát sự kiện này mỗi khi kiểm tra đơn hàng — dùng để
  // hiện huy hiệu số đơn "Chờ xác nhận" ngay trên thanh điều hướng, không cần tự polling lại.
  useEffect(() => {
    function handlePendingCount(e) {
      setPendingCount(e.detail || 0);
    }
    window.addEventListener("admin-pending-count", handlePendingCount);
    return () => window.removeEventListener("admin-pending-count", handlePendingCount);
  }, []);

  return (
    <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
      <span style={{ color: "#E3A06D", fontWeight: 700, letterSpacing: "0.04em" }}>
        KHU VỰC QUẢN TRỊ
      </span>
      {LINKS.map((link) => {
        // "/admin" chỉ active đúng trang chủ, các link khác active theo tiền tố đường dẫn.
        // Riêng /admin/orders KHÔNG active khi đang ở /admin/orders/history (trang lịch sử có link quay lại riêng).
        const isActive =
          link.href === "/admin"
            ? pathname === "/admin"
            : link.href === "/admin/orders"
            ? pathname === "/admin/orders"
            : pathname?.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              color: isActive ? "var(--ink)" : "#C7D6CE",
              textDecoration: "none",
              fontWeight: isActive ? 700 : 600,
              background: isActive ? "#E3A06D" : "transparent",
              padding: "8px 16px",
              borderRadius: 999,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {link.label}
            {link.href === "/admin/orders" && pendingCount > 0 && (
              <span
                style={{
                  background: isActive ? "var(--ink)" : "#E3A06D",
                  color: isActive ? "#E3A06D" : "var(--ink)",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: "1px 7px",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
