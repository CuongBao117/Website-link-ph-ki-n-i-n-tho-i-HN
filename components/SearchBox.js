"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/data/products";
import { getSearchSuggestions } from "@/app/(shop)/tim-kiem/actions";

const DEBOUNCE_MS = 300;

export default function SearchBox() {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();
  const wrapRef = useRef(null);

  // Gõ tới đâu gợi ý tới đó (debounce 300ms) — catalog lớn, tên/mã máy dài, gõ thiếu dấu/sai
  // chính tả rất dễ "tìm không ra" nếu phải chờ Enter mới biết. Dùng lại đúng logic tìm kiếm đã
  // có (xem actions.js) qua Server Action, không cần thêm API route riêng.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await getSearchSuggestions(q);
      if (!cancelled) {
        setSuggestions(results);
        setActiveIndex(-1);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function goSearch(q) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/tim-kiem?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    goSearch(value);
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      router.push(`/san-pham/${suggestions[activeIndex].slug}`);
      setOpen(false);
    }
  }

  const showSuggestions = open && suggestions.length > 0;

  return (
    <div className="search-wrap" ref={wrapRef}>
      <form className="searchbar" onSubmit={handleSubmit} autoComplete="off">
        <input
          type="text"
          placeholder="Tìm màn hình, pin, cáp sạc, loa Bluetooth, tên máy..."
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          maxLength={100}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
        />
        <button type="submit">TÌM →</button>
      </form>

      {showSuggestions && (
        <div id="search-suggestions" className="search-suggestions" role="listbox">
          {suggestions.map((p, i) => (
            <Link
              key={p.slug}
              href={`/san-pham/${p.slug}`}
              className={`search-suggestion-item${i === activeIndex ? " active" : ""}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => setOpen(false)}
            >
              <span className="search-suggestion-name">{p.name}</span>
              <span className="search-suggestion-price">{formatPrice(p.price)}</span>
            </Link>
          ))}
          <button type="button" className="search-suggestion-more" onClick={() => goSearch(value)}>
            Xem tất cả kết quả cho “{value.trim()}” →
          </button>
        </div>
      )}
    </div>
  );
}
