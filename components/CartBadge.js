"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartBadge({ className }) {
  const { totalItems, loaded } = useCart();

  // Giỏ hàng đọc từ localStorage sau khi mount — trước lúc "loaded" xong, totalItems luôn là 0
  // dù khách thực sự có hàng trong giỏ. Ẩn số đi lúc này thay vì hiện "0" gây hiểu lầm giỏ trống.
  return (
    <Link href="/gio-hang" className={className} style={className ? undefined : { color: "inherit", textDecoration: "none" }}>
      Giỏ hàng{loaded && <span className="cart-badge">{totalItems}</span>}
    </Link>
  );
}
