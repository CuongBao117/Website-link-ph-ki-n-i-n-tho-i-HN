"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartBadge() {
  const { totalItems } = useCart();

  return (
    <Link href="/gio-hang" style={{ color: "inherit", textDecoration: "none" }}>
      Giỏ hàng<span className="cart-badge">{totalItems}</span>
    </Link>
  );
}
