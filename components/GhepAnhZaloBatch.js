"use client";

import { useState } from "react";
import {
  ocrScreenshot,
  matchProductByName,
  attachPhotosToProduct,
  createProductWithPhotos,
} from "@/app/admin/(protected)/products/ghep-anh-zalo/actions";
import { searchProducts } from "@/app/admin/(protected)/products/gan-anh/actions";
import PriceInput from "@/components/PriceInput";

const AUTO_MATCH_THRESHOLD = 0.3; // độ khớp pg_trgm (0..1) — trên ngưỡng này coi là ĐÃ có sẵn, dưới thì coi là sản phẩm MỚI

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toLocaleString("vi-VN") + "đ";
}

// Y hệt slugify() phía server (lib/slugify.js), chỉ dùng để SO SÁNH caption giữa các ảnh — giá
// trị slug thật để lưu vẫn do server tự tính lại.
function normalizeName(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Nhiều ảnh chụp màn hình LIỀN KỀ (theo thời gian lưu trên máy) có thể cùng thuộc 1 bài đăng —
// tức cùng 1 caption tên/giá, chỉ khác góc chụp. Gộp các ảnh có caption giống hệt nhau (sau khi
// chuẩn hoá) thành 1 nhóm = 1 sản phẩm. Ảnh không đọc được chữ (OCR lỗi/mờ) được coi là góc chụp
// khác của sản phẩm NGAY TRƯỚC ĐÓ — khả năng cao là ảnh phụ cùng bài chứ không mở đầu sản phẩm mới.
function buildGroupsFromOcr(items) {
  const groups = [];
  items.forEach((item) => {
    const norm = normalizeName(item.nameCandidate);
    const last = groups[groups.length - 1];
    const sameAsLast = last && norm && norm === last.norm;
    const continuesUnreadable = last && !norm;

    if (sameAsLast || continuesUnreadable) {
      last.files.push(item.file);
      if (!last.norm && norm) {
        last.norm = norm;
        last.nameCandidate = item.nameCandidate;
      }
      if (last.priceCandidate === null && item.priceCandidate !== null) {
        last.priceCandidate = item.priceCandidate;
      }
      if (item.ocrError) last.ocrErrors.push(item.ocrError);
    } else {
      groups.push({
        key: `g${groups.length}-${item.file.lastModified}-${item.file.name}`,
        files: [item.file],
        norm,
        nameCandidate: item.nameCandidate,
        priceCandidate: item.priceCandidate,
        ocrErrors: item.ocrError ? [item.ocrError] : [],
      });
    }
  });
  return groups;
}

export default function GhepAnhZaloBatch({ categoryGroups }) {
  const [files, setFiles] = useState([]);
  const [groups, setGroups] = useState(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ done: 0, total: 0 });
  const [category, setCategory] = useState(categoryGroups?.[0]?.categories?.[0]?.slug || "");
  const [confirming, setConfirming] = useState(false);
  const [confirmLog, setConfirmLog] = useState([]);

  const categoryOption = categoryGroups?.flatMap((g) => g.categories).find((c) => c.slug === category);

  function handleFilesChange(e) {
    setFiles(Array.from(e.target.files || []));
    setGroups(null);
    setConfirmLog([]);
  }

  function updateGroup(key, patch) {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  async function decideGroupMode(group) {
    if (!group.nameCandidate) {
      return { candidates: [], mode: "new", newName: "", newPrice: group.priceCandidate };
    }
    const res = await matchProductByName(group.nameCandidate);
    const candidates = res.success ? res.candidates || [] : [];
    const best = candidates[0];
    if (best && best.score >= AUTO_MATCH_THRESHOLD) {
      return {
        candidates,
        mode: "existing",
        selectedSlug: best.slug,
        selectedName: best.name,
        existingPrice: best.price,
        priceMismatch: group.priceCandidate !== null && Number(best.price) !== Number(group.priceCandidate),
        priceChoice: null,
      };
    }
    return { candidates, mode: "new", newName: group.nameCandidate, newPrice: group.priceCandidate };
  }

  async function handleRunOcr() {
    if (files.length === 0) return;
    setOcrRunning(true);
    const sorted = [...files].sort((a, b) => a.lastModified - b.lastModified);
    setOcrProgress({ done: 0, total: sorted.length });

    const items = [];
    for (let i = 0; i < sorted.length; i++) {
      const file = sorted[i];
      const formData = new FormData();
      formData.set("image", file);
      try {
        const res = await ocrScreenshot(formData);
        if (res.success) {
          items.push({ file, nameCandidate: res.nameCandidate, priceCandidate: res.priceCandidate, ocrError: null });
        } else {
          items.push({ file, nameCandidate: "", priceCandidate: null, ocrError: res.error || "Lỗi OCR không rõ nguyên nhân" });
        }
      } catch (err) {
        items.push({ file, nameCandidate: "", priceCandidate: null, ocrError: err?.message || "Lỗi OCR không rõ nguyên nhân" });
      }
      setOcrProgress({ done: i + 1, total: sorted.length });
    }

    const built = buildGroupsFromOcr(items);
    const withMatches = await Promise.all(
      built.map(async (g) => ({
        ...g,
        manualQuery: "",
        manualResults: [],
        skip: false,
        ...(await decideGroupMode(g)),
      }))
    );

    setGroups(withMatches);
    setOcrRunning(false);
  }

  async function handleManualSearch(key, query) {
    updateGroup(key, { manualQuery: query });
    if (!query.trim()) {
      updateGroup(key, { manualResults: [] });
      return;
    }
    const res = await searchProducts(query);
    updateGroup(key, { manualResults: res.results || [] });
  }

  function selectExistingProduct(key, group, product) {
    updateGroup(key, {
      mode: "existing",
      selectedSlug: product.slug,
      selectedName: product.name,
      existingPrice: product.price,
      priceMismatch: group.priceCandidate !== null && Number(product.price) !== Number(group.priceCandidate),
      priceChoice: null,
      manualQuery: "",
      manualResults: [],
    });
  }

  function switchToNew(key, group) {
    updateGroup(key, { mode: "new", newName: group.nameCandidate || "", newPrice: group.priceCandidate });
  }

  function isGroupReady(g) {
    if (g.skip) return false;
    if (g.mode === "existing") return Boolean(g.selectedSlug) && (!g.priceMismatch || Boolean(g.priceChoice));
    if (g.mode === "new") return Boolean(g.newName?.trim()) && Number(g.newPrice) > 0 && Boolean(category);
    return false;
  }

  const readyGroups = (groups || []).filter(isGroupReady);
  const readyNewCount = readyGroups.filter((g) => g.mode === "new").length;
  const readyExistingCount = readyGroups.length - readyNewCount;

  async function handleConfirmAll() {
    if (readyGroups.length === 0) return;
    setConfirming(true);
    const results = [];

    for (const g of readyGroups) {
      if (g.mode === "existing") {
        const formData = new FormData();
        formData.set("slug", g.selectedSlug);
        g.files.forEach((file) => formData.append("images", file));
        if (g.priceChoice === "caption" && g.priceCandidate !== null) {
          formData.set("price", String(g.priceCandidate));
        }
        try {
          const res = await attachPhotosToProduct(formData);
          results.push({ name: g.selectedName, success: res.success, error: res.error, mode: "existing" });
        } catch (err) {
          results.push({ name: g.selectedName, success: false, error: err?.message || "không rõ nguyên nhân", mode: "existing" });
        }
      } else {
        const formData = new FormData();
        formData.set("name", g.newName);
        formData.set("price", String(g.newPrice));
        formData.set("category", category);
        formData.set("categoryCode", categoryOption?.code || "SP");
        g.files.forEach((file) => formData.append("images", file));
        try {
          const res = await createProductWithPhotos(formData);
          results.push({ name: g.newName, success: res.success, error: res.error, mode: "new" });
        } catch (err) {
          results.push({ name: g.newName, success: false, error: err?.message || "không rõ nguyên nhân", mode: "new" });
        }
      }
    }

    setConfirmLog(results);
    setConfirming(false);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
            Ảnh chụp màn hình (có cả ảnh sản phẩm + caption tên/giá)
          </label>
          <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>Đã chọn: {files.length} ảnh</div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>
            Danh mục (áp dụng cho sản phẩm MỚI tạo trong lô này):
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ border: "1.5px solid var(--line)", borderRadius: "var(--radius)", padding: "8px 10px", fontSize: 13.5 }}
          >
            {(categoryGroups || []).map((g) => (
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

      {files.length > 0 && !groups && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0" }}>
            {[...files]
              .sort((a, b) => a.lastModified - b.lastModified)
              .map((file, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(file)}
                  alt=""
                  style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "var(--radius)", border: "1px solid var(--line)", flexShrink: 0 }}
                />
              ))}
          </div>

          <button type="button" className="btn-primary" style={{ marginTop: 14 }} onClick={handleRunOcr} disabled={ocrRunning}>
            {ocrRunning ? `Đang đọc chữ ${ocrProgress.done}/${ocrProgress.total}...` : "Nhận diện chữ (OCR) & ghép nhóm →"}
          </button>
        </div>
      )}

      {groups && (
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Đã gộp thành {groups.length} sản phẩm.</span>
            <button
              type="button"
              className="cart-remove"
              onClick={() => {
                setGroups(null);
                setConfirmLog([]);
              }}
              disabled={ocrRunning}
            >
              Quay lại chọn ảnh
            </button>
          </div>

          <table className="cart-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Chữ đọc được</th>
                <th>Xử lý</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.key} style={{ opacity: g.skip ? 0.5 : 1 }}>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 160 }}>
                      {g.files.map((f, i) => (
                        <img
                          key={i}
                          src={URL.createObjectURL(f)}
                          alt=""
                          style={{ width: 54, height: 54, objectFit: "cover", borderRadius: "var(--radius)" }}
                        />
                      ))}
                    </div>
                  </td>
                  <td style={{ maxWidth: 200, fontSize: 12.5 }}>
                    {g.ocrErrors?.length > 0 && !g.nameCandidate && <span style={{ color: "#B0503A" }}>{g.ocrErrors[0]}</span>}
                    {g.nameCandidate ? (
                      <>
                        <div>{g.nameCandidate}</div>
                        <div style={{ color: "var(--ink-soft)" }}>
                          {g.priceCandidate !== null ? formatPrice(g.priceCandidate) : <i>Không đọc được giá</i>}
                        </div>
                      </>
                    ) : (
                      !g.ocrErrors?.length && <i style={{ color: "var(--ink-soft)" }}>Không đọc được dòng nào</i>
                    )}
                  </td>
                  <td style={{ minWidth: 260 }}>
                    <div style={{ marginBottom: 8 }}>
                      {(g.candidates || []).slice(0, 3).map((c) => (
                        <label key={c.slug} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginBottom: 4, cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={g.key}
                            checked={g.mode === "existing" && g.selectedSlug === c.slug}
                            onChange={() => selectExistingProduct(g.key, g, c)}
                          />
                          {c.name} — {formatPrice(c.price)}{" "}
                          <span style={{ color: c.score >= AUTO_MATCH_THRESHOLD ? "var(--teal)" : "#B0503A" }}>
                            ({Math.round(c.score * 100)}%)
                          </span>
                        </label>
                      ))}
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer", fontWeight: 600 }}>
                        <input type="radio" name={g.key} checked={g.mode === "new"} onChange={() => switchToNew(g.key, g)} />
                        + Tạo sản phẩm mới
                      </label>
                    </div>

                    {g.mode === "existing" && g.priceMismatch && (
                      <div style={{ border: "1.5px solid #B0503A", borderRadius: "var(--radius)", padding: "8px 10px", marginBottom: 8, background: "#fdf2ee" }}>
                        <div style={{ fontSize: 12, color: "#B0503A", fontWeight: 600, marginBottom: 6 }}>
                          ⚠️ Giá trong caption ({formatPrice(g.priceCandidate)}) khác giá đang lưu ({formatPrice(g.existingPrice)}) — chọn giá muốn dùng:
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className={g.priceChoice === "caption" ? "btn-primary" : "cart-remove"}
                            onClick={() => updateGroup(g.key, { priceChoice: "caption" })}
                          >
                            Dùng giá caption ({formatPrice(g.priceCandidate)})
                          </button>
                          <button
                            type="button"
                            className={g.priceChoice === "keep" ? "btn-primary" : "cart-remove"}
                            onClick={() => updateGroup(g.key, { priceChoice: "keep" })}
                          >
                            Giữ giá cũ ({formatPrice(g.existingPrice)})
                          </button>
                        </div>
                      </div>
                    )}

                    {g.mode === "new" && (
                      <div style={{ marginBottom: 8 }}>
                        <input
                          type="text"
                          placeholder="Tên sản phẩm mới"
                          value={g.newName}
                          onChange={(e) => updateGroup(g.key, { newName: e.target.value })}
                          style={{ width: "100%", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: 12.5, marginBottom: 6 }}
                        />
                        <PriceInput
                          value={g.newPrice ?? ""}
                          onChange={(digits) => updateGroup(g.key, { newPrice: digits ? Number(digits) : null })}
                          inputStyle={{ width: 150, border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 34px 6px 8px", fontSize: 12.5 }}
                        />
                        {(g.newPrice === null || !Number(g.newPrice)) && (
                          <div style={{ fontSize: 11, color: "#B0503A" }}>Không tự nhận ra giá — điền tay</div>
                        )}
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Tìm tay theo tên sản phẩm..."
                      value={g.manualQuery}
                      onChange={(e) => handleManualSearch(g.key, e.target.value)}
                      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: 12.5 }}
                    />
                    {g.manualResults.length > 0 && (
                      <div className="gan-anh-results" style={{ marginTop: 6 }}>
                        {g.manualResults.map((p) => (
                          <button key={p.slug} type="button" className="gan-anh-result-row" onClick={() => selectExistingProduct(g.key, g, p)}>
                            <div>
                              <div className="gan-anh-result-name">{p.name}</div>
                              <div className="gan-anh-result-meta">
                                {p.code} · {formatPrice(p.price)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {g.mode === "existing" && g.selectedSlug && (
                      <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--teal)" }}>
                        ✓ Cập nhật ảnh cho: {g.selectedName}
                      </div>
                    )}
                    {g.mode === "new" && (
                      <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--teal)" }}>+ Sẽ tạo sản phẩm mới</div>
                    )}
                  </td>
                  <td>
                    <button type="button" className="cart-remove" onClick={() => updateGroup(g.key, { skip: !g.skip })}>
                      {g.skip ? "Bỏ qua" : "Huỷ"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn-primary" onClick={handleConfirmAll} disabled={confirming || readyGroups.length === 0}>
              {confirming
                ? "Đang xử lý..."
                : `Xác nhận xử lý ${readyGroups.length} sản phẩm (${readyNewCount} tạo mới, ${readyExistingCount} cập nhật ảnh)`}
            </button>
          </div>

          {confirmLog.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>Kết quả:</p>
              <ul style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {confirmLog.map((l, i) => (
                  <li key={i}>
                    {l.success
                      ? l.mode === "new"
                        ? `✓ Đã tạo sản phẩm mới "${l.name}"`
                        : `✓ Đã cập nhật ảnh cho "${l.name}"`
                      : `✗ Lỗi "${l.name}": ${l.error}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
