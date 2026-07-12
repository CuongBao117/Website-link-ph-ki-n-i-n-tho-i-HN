"use client";

import { useState } from "react";
import { createProductBatch } from "@/app/admin/(protected)/products/nhap-nhanh/actions";

function parsePrice(raw) {
  const s = raw.trim().toLowerCase();
  const hasK = /k\b/.test(s) || s.endsWith("k");
  const numMatch = s.replace(/[đdvnđ]/g, "").match(/[\d.,]+/);
  if (!numMatch) return null;
  // "103" hay "1.5" (khi có "k") -> số thập phân bình thường; "125.000" (không có "k") -> dấu chấm là
  // phân cách nghìn, phải bỏ đi trước khi parse.
  let numStr = numMatch[0];
  if (hasK) {
    numStr = numStr.replace(/,/g, ".");
  } else {
    numStr = numStr.replace(/[.,]/g, "");
  }
  const n = parseFloat(numStr);
  if (!Number.isFinite(n)) return null;
  return Math.round(hasK ? n * 1000 : n);
}

function parseBlock(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { baseName: "", items: [] };

  const baseName = lines[0].replace(/^[•*\-–]\s*/, "");
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/^[•*\-–]\s*/, "");
    let model = null;
    let priceRaw = null;

    let m = line.match(/^(.+?)\s*(?:→|->)\s*(.+)$/);
    if (!m) m = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (!m) m = line.match(/^(.+?)\s+-\s+(.+)$/);

    if (m) {
      model = m[1].trim();
      priceRaw = m[2].trim();
    }
    if (!model || !priceRaw) continue;

    const price = parsePrice(priceRaw);
    if (price === null) continue;

    items.push({ model, name: `${baseName} ${model}`.trim(), price });
  }

  return { baseName, items };
}

export default function NhapNhanhForm({ categoryGroups }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState(categoryGroups[0]?.categories[0]?.slug || "");
  const [sharedImage, setSharedImage] = useState(null);
  const [sharedImagePreview, setSharedImagePreview] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState(null);

  function handleParse() {
    const { items: parsed } = parseBlock(text);
    setItems(parsed);
    setResult(null);
  }

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSharedImage(file);
    setSharedImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (items.length === 0 || isBusy) return;
    const categoryOption = categoryGroups
      .flatMap((g) => g.categories)
      .find((c) => c.slug === category);

    const formData = new FormData();
    formData.set("category", category);
    formData.set("categoryCode", categoryOption?.code || "SP");
    formData.set(
      "items",
      JSON.stringify(items.map((it) => ({ name: it.name, price: Number(it.price) })))
    );
    if (sharedImage) formData.set("sharedImage", sharedImage);

    setIsBusy(true);
    const res = await createProductBatch(formData);
    setIsBusy(false);
    setResult(res);
    if (res.success) {
      setText("");
      setItems([]);
      setSharedImage(null);
      setSharedImagePreview(null);
    }
  }

  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-soft)", marginBottom: 6 }}>
        Dán bảng giá vào đây
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={"Cáp sạc WEIBI\n11 → 103k\n11 Pro → 454k\n11 Pro Max → 520k\n12 → 127k"}
        style={{
          width: "100%",
          border: "1.5px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: "12px 14px",
          fontSize: 13.5,
          fontFamily: "var(--font-mono), monospace",
          outline: "none",
        }}
      />

      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
        <button type="button" className="btn-primary" onClick={handleParse} disabled={!text.trim()}>
          Phân tích thành danh sách
        </button>

        <div>
          <label style={{ fontSize: 12, color: "var(--ink-soft)", marginRight: 8 }}>Danh mục:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ border: "1.5px solid var(--line)", borderRadius: "var(--radius)", padding: "8px 10px", fontSize: 13.5 }}
          >
            {categoryGroups.map((g) => (
              <optgroup key={g.slug} label={g.name}>
                {g.categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
          Ảnh đại diện dùng chung cho cả lô (không bắt buộc — có thể để trống rồi gắn ảnh sau)
        </label>
        <input type="file" accept="image/*" onChange={handleImageChange} />
        {sharedImagePreview && (
          <img
            src={sharedImagePreview}
            alt=""
            style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--radius)", marginTop: 8, border: "1px solid var(--line)" }}
          />
        )}
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>
            Xem trước — {items.length} sản phẩm sẽ được tạo (sửa lại nếu cần trước khi tạo):
          </p>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Giá bán (đ)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>
                    <input
                      value={it.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: 13.5 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={it.price}
                      onChange={(e) => updateItem(i, "price", e.target.value)}
                      style={{ width: 120, border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: 13.5 }}
                    />
                  </td>
                  <td>
                    <button type="button" className="cart-remove" onClick={() => removeItem(i)}>
                      Xoá dòng
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Đang tạo..." : `Tạo ${items.length} sản phẩm`}
          </button>
        </div>
      )}

      {result && (
        <div
          className="empty-state"
          style={{ marginTop: 20, textAlign: "left", borderColor: result.success ? "var(--teal)" : "#B0503A" }}
        >
          {result.success ? (
            <p style={{ fontWeight: 600, color: "var(--teal)", margin: 0 }}>
              Đã tạo thành công {result.count} sản phẩm.
            </p>
          ) : (
            <p style={{ fontWeight: 600, color: "#B0503A", margin: 0 }}>Lỗi: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
