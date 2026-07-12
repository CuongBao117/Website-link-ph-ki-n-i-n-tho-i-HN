"use client";

import { useState } from "react";
import { prepareZaloRows } from "@/app/admin/(protected)/products/nhap-zalo/actions";
import { commitProductsCsv } from "@/app/admin/(protected)/products/import/actions";
import { VARIANT_PRESETS } from "@/lib/variantPresets";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toLocaleString("vi-VN") + "đ";
}

// Bóc số + "k" ra khỏi chuỗi giá kiểu Zalo: "Sỉ 23k" -> 23000, "125.000đ" -> 125000.
// Giống hệt logic parsePrice() trong NhapNhanhForm.js — cố tình KHÔNG import chung 1 file để
// không phải sửa file đã hoạt động ổn định, chỉ thêm mới.
function parsePrice(raw) {
  const s = String(raw || "").trim().toLowerCase();
  const hasK = /k\b/.test(s) || s.endsWith("k");
  const numMatch = s.replace(/[đdvnđ]/g, "").match(/[\d.,]+/);
  if (!numMatch) return null;
  let numStr = numMatch[0];
  numStr = hasK ? numStr.replace(/,/g, ".") : numStr.replace(/[.,]/g, "");
  const n = parseFloat(numStr);
  if (!Number.isFinite(n)) return null;
  return Math.round(hasK ? n * 1000 : n);
}

// Bỏ icon/emoji/bullet ở đầu-cuối dòng để tên sản phẩm không dính rác kiểu "✨✨ ... 🎀".
function cleanLine(line) {
  return line
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/^[\s•*\-–✅❌]+|[\s•*\-–✅❌]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Tách khối text dán vào thành từng sản phẩm. Ưu tiên tách theo dòng "---" nếu người dùng có
// gõ; nếu không có dấu phân cách rõ ràng thì tách theo dòng trống (2 lần xuống dòng liên tiếp).
function parseZaloBlocks(text, defaultVariants) {
  const hasExplicitSeparator = /^-{3,}\s*$/m.test(text);
  const rawBlocks = hasExplicitSeparator ? text.split(/^-{3,}\s*$/m) : text.split(/\n\s*\n+/);

  const items = [];
  rawBlocks.forEach((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const name = cleanLine(lines[0]);
    if (!name) return;

    let price = null;
    let variantOverride = null;

    for (const line of lines.slice(1)) {
      if (price === null) {
        const priceMatch =
          line.match(/s[ỉi]\s*:?\s*([\d.,]+\s*k?)/iu) || line.match(/gi[áa]\s*:?\s*([\d.,]+\s*k?)/iu);
        if (priceMatch) price = parsePrice(priceMatch[1]);
      }
      const variantMatch = line.match(/^(?:d[oò]ng\s*m[áa]y|variants?)\s*:\s*(.+)$/iu);
      if (variantMatch) {
        variantOverride = variantMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    // Không thấy dòng "Sỉ ..." rõ ràng -> dự phòng: quét cả khối tìm số+k đầu tiên.
    if (price === null) {
      const fallback = block.match(/([\d.,]+\s*k)\b/iu);
      if (fallback) price = parsePrice(fallback[1]);
    }

    items.push({ name, price, variants: variantOverride || defaultVariants });
  });

  return items;
}

export default function NhapZaloForm({ categoryGroups }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categoryGroups[0]?.categories[0]?.slug || "");
  const [presetIndex, setPresetIndex] = useState("");
  const [customVariants, setCustomVariants] = useState("");
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState(null); // sau khi prepareZaloRows xong, sẵn sàng commit
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const defaultVariants =
    presetIndex !== ""
      ? VARIANT_PRESETS[Number(presetIndex)].variants
      : customVariants.split(",").map((s) => s.trim()).filter(Boolean);

  function handleParse() {
    setError("");
    setResult(null);
    setRows(null);
    const parsed = parseZaloBlocks(text, defaultVariants);
    if (parsed.length === 0) {
      setError("Không tách được sản phẩm nào — kiểm tra lại định dạng dán vào (dòng đầu mỗi khối phải là tên sản phẩm).");
      return;
    }
    setItems(parsed);
  }

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function updateItemVariants(i, value) {
    updateItem(i, "variants", value.split(",").map((s) => s.trim()).filter(Boolean));
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handlePrepare() {
    const invalid = items.some(
      (it) => !it.name || !Number.isFinite(Number(it.price)) || Number(it.price) <= 0
    );
    if (invalid) {
      setError("Có dòng thiếu tên hoặc giá không hợp lệ — sửa lại (giá phải là số lớn hơn 0) trước khi tiếp tục.");
      return;
    }
    setIsBusy(true);
    setError("");
    const categoryOption = categoryGroups.flatMap((g) => g.categories).find((c) => c.slug === category);
    const res = await prepareZaloRows({
      category,
      categoryCode: categoryOption?.code || "SP",
      items: items.map((it) => ({ name: it.name, price: Number(it.price), variants: it.variants })),
    });
    setIsBusy(false);
    if (!res.success) {
      setError(res.error || "Có lỗi khi chuẩn bị dữ liệu.");
      return;
    }
    setRows(res.rows);
  }

  async function handleCommit() {
    if (!rows?.length) return;
    setIsBusy(true);
    const res = await commitProductsCsv(rows);
    setIsBusy(false);
    setResult(res);
    if (res.success) {
      setText("");
      setItems([]);
      setRows(null);
    }
  }

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--ink-soft)",
          marginBottom: 6,
        }}
      >
        Dán nội dung bài đăng (dán được nhiều bài liền nhau)
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder={
          "Ốp Vân Đá in Hình Gắn Stike Kute + Cafe\nSỉ 23k\n\n---\n\nỐp Từ Tính Sóng Camera Pha Lê\nSỉ 35k"
        }
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

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 14, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
            Danh mục (áp dụng cho cả lô):
          </label>
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

        <div>
          <label style={{ fontSize: 12, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
            Bộ dòng máy tương thích mặc định:
          </label>
          <select
            value={presetIndex}
            onChange={(e) => setPresetIndex(e.target.value)}
            style={{ border: "1.5px solid var(--line)", borderRadius: "var(--radius)", padding: "8px 10px", fontSize: 13.5 }}
          >
            <option value="">— Tự gõ bên dưới —</option>
            {VARIANT_PRESETS.map((p, i) => (
              <option key={i} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {presetIndex === "" && (
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
            Hoặc tự gõ danh sách dòng máy, cách nhau bằng dấu phẩy (áp dụng mặc định cho mọi sản
            phẩm trong lô — vẫn sửa riêng từng dòng được ở bước xem trước):
          </label>
          <input
            value={customVariants}
            onChange={(e) => setCustomVariants(e.target.value)}
            placeholder="iPhone 12, iPhone 12 Pro, iPhone 13..."
            style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: "var(--radius)", padding: "8px 10px", fontSize: 13.5 }}
          />
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
        Mẹo: nếu 1 sản phẩm có dòng máy khác với mặc định, thêm 1 dòng riêng trong khối của nó:{" "}
        <code>Dòng máy: iPhone 14, iPhone 14 Pro</code>
      </p>

      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn-primary" onClick={handleParse} disabled={!text.trim()}>
          Tách thành danh sách sản phẩm
        </button>
      </div>

      {error && <p style={{ color: "#B0503A", fontSize: 13.5, marginTop: 12 }}>{error}</p>}

      {items.length > 0 && !rows && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>
            Bước 1 — Xem trước và sửa lại {items.length} sản phẩm:
          </p>
          <table className="cart-table">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Giá bán (đ)</th>
                <th>Dòng máy tương thích</th>
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
                      value={it.price ?? ""}
                      onChange={(e) => updateItem(i, "price", e.target.value)}
                      style={{ width: 110, border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: 13.5 }}
                    />
                    {it.price === null && (
                      <div style={{ fontSize: 11, color: "#B0503A" }}>Không tự nhận ra giá — điền tay</div>
                    )}
                  </td>
                  <td>
                    <input
                      value={(it.variants || []).join(", ")}
                      onChange={(e) => updateItemVariants(i, e.target.value)}
                      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: 13.5 }}
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

          <button type="button" className="btn-primary" onClick={handlePrepare} disabled={isBusy} style={{ marginTop: 14 }}>
            {isBusy ? "Đang xử lý..." : "Kiểm tra trùng & chuẩn bị lưu →"}
          </button>
        </div>
      )}

      {rows && (
        <div className="gan-anh-confirm" style={{ marginTop: 24 }}>
          <div className="gan-anh-confirm-name">Bước 2 — Xác nhận tạo {rows.length} sản phẩm</div>
          <p style={{ fontSize: 13.5, margin: "0 0 12px" }}>
            Sản phẩm sẽ được tạo <b>chưa có ảnh</b> — dùng "Gán ảnh hàng loạt" ngay sau đó để gắn
            ảnh cho từng sản phẩm.
          </p>
          <ul style={{ fontSize: 13, paddingLeft: 18, marginBottom: 14 }}>
            {rows.map((r) => (
              <li key={r.slug}>
                {r.name} — {formatPrice(r.price)}{" "}
                {r.variants?.length ? `(${r.variants.length} dòng máy)` : "(không gắn dòng máy)"}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-primary" onClick={handleCommit} disabled={isBusy}>
              {isBusy ? "Đang tạo..." : `Xác nhận tạo ${rows.length} sản phẩm`}
            </button>
            <button type="button" className="cart-remove" onClick={() => setRows(null)} disabled={isBusy}>
              Quay lại sửa
            </button>
          </div>
        </div>
      )}

      {result && (
        <div
          className="empty-state"
          style={{ marginTop: 20, textAlign: "left", borderColor: result.success ? "var(--teal)" : "#B0503A" }}
        >
          {result.success ? (
            <p style={{ fontWeight: 600, color: "var(--teal)", margin: 0 }}>
              Đã tạo thành công {result.insertedCount} sản phẩm. Giờ vào{" "}
              <a href="/admin/products/gan-anh" style={{ color: "var(--teal)" }}>
                Gán ảnh hàng loạt
              </a>{" "}
              để gắn ảnh.
            </p>
          ) : (
            <p style={{ fontWeight: 600, color: "#B0503A", margin: 0 }}>
              Có lỗi: {result.batchErrors?.join("; ") || "không rõ nguyên nhân"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
