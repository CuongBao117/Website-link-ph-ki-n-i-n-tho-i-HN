"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/tim-kiem?q=${encodeURIComponent(q)}`);
  }

  return (
    <form className="searchbar" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Tìm màn hình, pin, cáp sạc, loa Bluetooth, tên máy..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">TÌM →</button>
    </form>
  );
}
