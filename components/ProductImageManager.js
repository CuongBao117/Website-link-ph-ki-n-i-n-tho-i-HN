"use client";

import { useState } from "react";

// Quản lý nhiều ảnh cho 1 sản phẩm trong form thêm/sửa:
// - "keepImages" (hidden input, JSON): danh sách URL ảnh cũ được GIỮ LẠI
// - "newImages" (file input, multiple): các ảnh mới chọn để tải lên
// Server action (actions.js) sẽ ghép 2 phần này lại thành mảng "images" cuối cùng.
export default function ProductImageManager({ initialImages }) {
  const [kept, setKept] = useState(initialImages || []);
  const [newFiles, setNewFiles] = useState([]);

  function removeExisting(url) {
    setKept((prev) => prev.filter((u) => u !== url));
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles(
      files.map((f) => ({ file: f, previewUrl: URL.createObjectURL(f) }))
    );
  }

  return (
    <div>
      <input type="hidden" name="keepImages" value={JSON.stringify(kept)} />

      {kept.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>
            Ảnh hiện có — ảnh đầu tiên sẽ là ảnh đại diện
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {kept.map((url, i) => (
              <div key={url} style={{ position: "relative" }}>
                <img
                  src={url}
                  alt={`Ảnh ${i + 1}`}
                  style={{
                    width: 84,
                    height: 84,
                    objectFit: "cover",
                    borderRadius: "var(--radius)",
                    border: i === 0 ? "2px solid var(--copper)" : "1px solid var(--line)",
                  }}
                />
                {i === 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 3,
                      background: "var(--copper)",
                      color: "#fff",
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 3,
                      fontFamily: "var(--font-mono), monospace",
                    }}
                  >
                    ẢNH BÌA
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeExisting(url)}
                  title="Xoá ảnh này"
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--ink)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input type="file" name="newImages" accept="image/*" multiple onChange={handleFileChange} />
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
        Có thể chọn nhiều ảnh cùng lúc. Ảnh mới sẽ được thêm vào sau các ảnh giữ lại ở trên.
      </div>

      {newFiles.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          {newFiles.map((f, i) => (
            <img
              key={i}
              src={f.previewUrl}
              alt={`Ảnh mới ${i + 1}`}
              style={{
                width: 84,
                height: 84,
                objectFit: "cover",
                borderRadius: "var(--radius)",
                border: "1px dashed var(--teal)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
