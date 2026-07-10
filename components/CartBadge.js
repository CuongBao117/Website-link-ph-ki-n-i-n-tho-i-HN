"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartBadge({ className }) {
  const { totalItems } = useCart();

  return (
    <Link href="/gio-hang" className={className} style={className ? undefined : { color: "inherit", textDecoration: "none" }}>
      Giỏ hàng<span className="cart-badge">{totalItems}</span>
    </Link>
  );
}
