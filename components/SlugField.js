"use client";

import { useState } from "react";

// Chuẩn hoá y hệt hàm slugify() phía server (actions.js) — chỉ để XEM TRƯỚC,
// giá trị thật lưu vào DB vẫn do server tự chuẩn hoá lại, nên không sợ lệch nhau.
function previewSlugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SlugField({ defaultValue, disabled }) {
  const [value, setValue] = useState(defaultValue || "");
  const preview = previewSlugify(value);

  return (
    <div>
      <input
        name="slug"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Màn hình iPhone 13 Zin bóc máy (gõ tiếng Việt bình thường cũng được)"
        required
        disabled={disabled}
        style={disabled ? { background: "#F0F2EF", color: "var(--ink-soft)" } : undefined}
      />
      {!disabled && value && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
          Sẽ lưu thành: <code style={{ color: "var(--teal)" }}>{preview || "(chưa hợp lệ)"}</code>
        </div>
      )}
    </div>
  );
}
