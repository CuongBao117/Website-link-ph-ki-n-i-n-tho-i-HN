"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getEffectivePrice } from "@/lib/priceOptions";

const CartContext = createContext(null);
const STORAGE_KEY = "linhkien_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Đọc giỏ hàng đã lưu (nếu có) khi trang vừa mở
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch (e) {
      // bỏ qua nếu localStorage lỗi hoặc dữ liệu hỏng
    }
    setLoaded(true);
  }, []);

  // Lưu lại mỗi khi giỏ hàng thay đổi
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, loaded]);

  // priceOption: tên phân loại có giá riêng đã chọn (vd "Vỏ"/"Xương"), null nếu sản phẩm không
  // có phân loại giá — quyết định giá THẬT thêm vào giỏ (xem lib/priceOptions.getEffectivePrice).
  function addItem(product, variant, qty, priceOption = null) {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.slug === product.slug && i.variant === variant && (i.priceOption || null) === (priceOption || null)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }
      return [
        ...prev,
        {
          slug: product.slug,
          name: product.name,
          code: product.code,
          price: getEffectivePrice(product, priceOption),
          variant,
          priceOption,
          qty,
        },
      ];
    });
  }

  function updateQty(slug, variant, qty, priceOption = null) {
    setItems((prev) =>
      prev.map((i) =>
        i.slug === slug && i.variant === variant && (i.priceOption || null) === (priceOption || null)
          ? { ...i, qty: Math.max(1, qty) }
          : i
      )
    );
  }

  function removeItem(slug, variant, priceOption = null) {
    setItems((prev) =>
      prev.filter((i) => !(i.slug === slug && i.variant === variant && (i.priceOption || null) === (priceOption || null)))
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQty,
        removeItem,
        clearCart,
        totalItems,
        totalPrice,
        loaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart phải được dùng bên trong <CartProvider>");
  }
  return ctx;
}
