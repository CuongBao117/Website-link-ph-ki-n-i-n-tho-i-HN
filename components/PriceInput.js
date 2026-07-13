"use client";

import { useState } from "react";
import { formatPriceDigits, onlyDigits } from "@/lib/priceFormat";

// Ô nhập giá hiển thị "115.000đ" trong lúc gõ thay vì số trần, để dễ soát số 0/số lẻ.
// 2 chế độ dùng:
//  - Controlled: truyền value (chuỗi số thô) + onChange(digits) — dùng khi giá đang nằm trong
//    state của component cha (VD sửa từng dòng trong bảng xem trước).
//  - Uncontrolled: truyền name (+ defaultValue) — tự quản lý state nội bộ, submit qua 1 input
//    ẩn cùng "name" để form đọc bằng FormData/Server Action nhận được số thô, không phải chuỗi
//    đã có dấu chấm.
export default function PriceInput({
  name,
  value,
  defaultValue,
  onChange,
  placeholder,
  required,
  autoFocus,
  inputStyle,
}) {
  const isControlled = value !== undefined;
  const [internalDigits, setInternalDigits] = useState(
    defaultValue !== undefined && defaultValue !== null && defaultValue !== ""
      ? onlyDigits(String(defaultValue))
      : ""
  );
  const digits = isControlled ? onlyDigits(String(value ?? "")) : internalDigits;

  function handleChange(e) {
    const next = onlyDigits(e.target.value);
    if (isControlled) {
      onChange?.(next);
    } else {
      setInternalDigits(next);
    }
  }

  return (
    <div className="price-input-wrap">
      <input
        type="text"
        inputMode="numeric"
        value={formatPriceDigits(digits)}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        style={{ width: "100%", paddingRight: 34, ...inputStyle }}
      />
      <span className="price-input-suffix">đ</span>
      {!isControlled && name && <input type="hidden" name={name} value={digits} />}
    </div>
  );
}
