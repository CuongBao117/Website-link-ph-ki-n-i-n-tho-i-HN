"use client";

import { usePathname } from "next/navigation";
import HomeShortcut from "@/components/HomeShortcut";

// Bọc quanh Header + Footer của trang bán hàng.
// Khi đang ở khu vực /admin, ẩn hoàn toàn Header/Footer/giỏ hàng của shop
// vì trang quản trị có thanh điều hướng riêng (xem app/admin/(protected)/layout.js).
export default function ChromeGate({ header, footer, children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {header}
      {children}
      {footer}
      <HomeShortcut />
    </>
  );
}
