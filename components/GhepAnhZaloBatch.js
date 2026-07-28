"use client";

import { useState } from "react";
import { matchScreenshotText, attachPhotosToProduct } from "@/app/admin/(protected)/products/ghep-anh-zalo/actions";
import { searchProducts } from "@/app/admin/(protected)/products/gan-anh/actions";

const AUTO_SELECT_THRESHOLD = 0.3; // độ khớp pg_trgm (0..1) — trên ngưỡng này tự chọn sẵn, dưới thì để trống bắt xem tay

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value).toLocaleString("vi-VN") + "đ";
}

// Sắp 2 lô file (ảnh chụp màn hình + ảnh gốc) theo đúng thời gian lưu trên điện thoại, rồi ghép
// mỗi ảnh gốc vào nhóm của ảnh chụp màn hình ĐỨNG NGAY TRƯỚC nó — vì quy trình thao tác là
// "chụp màn hình bài đăng -> lưu ảnh gốc của chính bài đó -> sang bài tiếp theo", nên ảnh gốc lưu
// sau 1 screenshot và trước screenshot kế tiếp chắc chắn thuộc cùng sản phẩm với screenshot đó.
function buildGroups(screenshotFiles, originalFiles) {
  const shots = [...screenshotFiles].sort((a, b) => a.lastModified - b.lastModified);
  const originals = [...originalFiles].sort((a, b) => a.lastModified - b.lastModified);

  const groups = shots.map((shot, i) => ({
    key: `shot-${i}-${shot.lastModified}-${shot.name}`,
    screenshot: shot,
    originals: [],
    ocr: null, // { text, nameCandidate, candidates } sau khi chạy OCR
    ocrError: null,
    selectedSlug: "",
    selectedName: "",
    selectedPrice: null,
    manualQuery: "",
    manualResults: [],
    skip: false,
  }));

  const orphanOriginals = [];
  let shotIdx = -1;
  originals.forEach((file) => {
    while (shotIdx + 1 < shots.length && shots[shotIdx + 1].lastModified <= file.lastModified) {
      shotIdx++;
    }
    if (shotIdx === -1) orphanOriginals.push(file);
    else groups[shotIdx].originals.push(file);
  });

  return { groups, orphanOriginals };
}

export default function GhepAnhZaloBatch() {
  const [screenshotFiles, setScreenshotFiles] = useState([]);
  const [originalFiles, setOriginalFiles] = useState([]);
  const [groups, setGroups] = useState(null);
  const [orphanOriginals, setOrphanOriginals] = useState([]);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ done: 0, total: 0 });
  const [attaching, setAttaching] = useState(false);
  const [attachLog, setAttachLog] = useState([]);

  const timeline = [...screenshotFiles.map((f) => ({ file: f, isShot: true })), ...originalFiles.map((f) => ({ file: f, isShot: false }))].sort(
    (a, b) => a.file.lastModified - b.file.lastModified
  );

  function handleBuildGroups() {
    const { groups: built, orphanOriginals: orphans } = buildGroups(screenshotFiles, originalFiles);
    setGroups(built);
    setOrphanOriginals(orphans);
    setAttachLog([]);
  }

  function updateGroup(key, patch) {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  async function handleRunOcr() {
    if (!groups || groups.length === 0) return;
    setOcrRunning(true);
    setOcrProgress({ done: 0, total: groups.length });

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const formData = new FormData();
      formData.set("image", g.screenshot);
      try {
        const res = await matchScreenshotText(formData);
        if (res.success) {
          const best = res.candidates?.[0];
          const autoSelect = best && best.score >= AUTO_SELECT_THRESHOLD;
          updateGroup(g.key, {
            ocr: { text: res.text, nameCandidate: res.nameCandidate, candidates: res.candidates || [] },
            selectedSlug: autoSelect ? best.slug : "",
            selectedName: autoSelect ? best.name : "",
            selectedPrice: autoSelect ? best.price : null,
          });
        } else {
          updateGroup(g.key, { ocrError: res.error || "Lỗi OCR không rõ nguyên nhân" });
        }
      } catch (err) {
        updateGroup(g.key, { ocrError: err?.message || "Lỗi OCR không rõ nguyên nhân" });
      }
      setOcrProgress({ done: i + 1, total: groups.length });
    }

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

  function selectProduct(key, product) {
    updateGroup(key, {
      selectedSlug: product.slug,
      selectedName: product.name,
      selectedPrice: product.price,
      manualQuery: "",
      manualResults: [],
    });
  }

  const readyGroups = (groups || []).filter((g) => !g.skip && g.selectedSlug);

  async function handleConfirmAll() {
    if (readyGroups.length === 0) return;
    setAttaching(true);
    const results = [];

    for (const g of readyGroups) {
      const formData = new FormData();
      formData.set("slug", g.selectedSlug);
      g.originals.forEach((file) => formData.append("images", file));
      try {
        const res = await attachPhotosToProduct(formData);
        results.push({ name: g.selectedName, success: res.success, error: res.error, count: g.originals.length });
      } catch (err) {
        results.push({ name: g.selectedName, success: false, error: err?.message || "không rõ nguyên nhân" });
      }
    }

    setAttachLog(results);
    setAttaching(false);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
            1. Ảnh chụp màn hình (có cả ảnh + caption tên/giá)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              setScreenshotFiles(Array.from(e.target.files || []));
              setGroups(null);
            }}
          />
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>Đã chọn: {screenshotFiles.length} ảnh</div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
            2. Ảnh sản phẩm gốc (ảnh sạch, không caption)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              setOriginalFiles(Array.from(e.target.files || []));
              setGroups(null);
            }}
          />
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>Đã chọn: {originalFiles.length} ảnh</div>
        </div>
      </div>

      {timeline.length > 0 && !groups && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>
            Kiểm tra lại thứ tự trước khi ghép nhóm — phải xen kẽ 1 ảnh chụp màn hình rồi đến 1
            hoặc vài ảnh gốc, lặp lại. Nếu thứ tự lộn xộn (không xen kẽ), khả năng cao file bị mất
            đúng thời gian gốc lúc tải về máy (vd giải nén từ file .zip) — cần tải/copy lại từng
            ảnh trực tiếp rồi thử lại.
          </p>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0" }}>
            {timeline.map(({ file, isShot }, i) => (
              <div key={i} style={{ flexShrink: 0, textAlign: "center" }}>
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: "var(--radius)",
                    border: isShot ? "2px solid var(--teal)" : "1px solid var(--line)",
                  }}
                />
                <div style={{ fontSize: 10, color: isShot ? "var(--teal)" : "var(--ink-soft)", fontWeight: isShot ? 700 : 400 }}>
                  {isShot ? "Chụp màn hình" : "Ảnh gốc"}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 14 }}
            onClick={handleBuildGroups}
            disabled={screenshotFiles.length === 0 || originalFiles.length === 0}
          >
            Ghép nhóm theo thứ tự trên →
          </button>
        </div>
      )}

      {groups && (
        <div>
          {orphanOriginals.length > 0 && (
            <div className="empty-state" style={{ textAlign: "left", marginBottom: 16, borderColor: "#B0503A" }}>
              <p style={{ margin: 0, color: "#B0503A", fontWeight: 600 }}>
                ⚠️ {orphanOriginals.length} ảnh gốc được lưu TRƯỚC ảnh chụp màn hình đầu tiên — không
                ghép được nhóm cho các ảnh này, xem lại thứ tự hoặc gắn tay bằng &quot;Gán ảnh hàng loạt&quot;.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <button type="button" className="btn-primary" onClick={handleRunOcr} disabled={ocrRunning}>
              {ocrRunning ? `Đang đọc chữ ${ocrProgress.done}/${ocrProgress.total}...` : "Nhận diện chữ (OCR) toàn bộ →"}
            </button>
            <button
              type="button"
              className="cart-remove"
              onClick={() => {
                setGroups(null);
                setAttachLog([]);
              }}
              disabled={ocrRunning}
            >
              Quay lại chọn ảnh
            </button>
          </div>

          <table className="cart-table">
            <thead>
              <tr>
                <th>Ảnh chụp màn hình</th>
                <th>Chữ đọc được</th>
                <th>Khớp với sản phẩm</th>
                <th>Ảnh sẽ gắn ({groups.reduce((n, g) => n + g.originals.length, 0)} ảnh gốc)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const best = g.ocr?.candidates?.[0];
                const lowConfidence = g.ocr && (!best || best.score < AUTO_SELECT_THRESHOLD);
                return (
                  <tr key={g.key} style={{ opacity: g.skip ? 0.5 : 1 }}>
                    <td>
                      <img
                        src={URL.createObjectURL(g.screenshot)}
                        alt=""
                        style={{ width: 70, height: 70, objectFit: "cover", borderRadius: "var(--radius)" }}
                      />
                    </td>
                    <td style={{ maxWidth: 220, fontSize: 12.5 }}>
                      {g.ocrError ? (
                        <span style={{ color: "#B0503A" }}>{g.ocrError}</span>
                      ) : g.ocr ? (
                        g.ocr.nameCandidate || <i style={{ color: "var(--ink-soft)" }}>Không đọc được dòng nào</i>
                      ) : (
                        <span style={{ color: "var(--ink-soft)" }}>Chưa chạy OCR</span>
                      )}
                    </td>
                    <td style={{ minWidth: 240 }}>
                      {g.ocr && (
                        <div style={{ marginBottom: 8 }}>
                          {(g.ocr.candidates || []).slice(0, 3).map((c) => (
                            <label
                              key={c.slug}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12.5,
                                marginBottom: 4,
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="radio"
                                name={g.key}
                                checked={g.selectedSlug === c.slug}
                                onChange={() => selectProduct(g.key, c)}
                              />
                              {c.name} — {formatPrice(c.price)}{" "}
                              <span style={{ color: c.score >= AUTO_SELECT_THRESHOLD ? "var(--teal)" : "#B0503A" }}>
                                ({Math.round(c.score * 100)}%)
                              </span>
                            </label>
                          ))}
                          {lowConfidence && (
                            <div style={{ fontSize: 11.5, color: "#B0503A", marginBottom: 4 }}>
                              Độ khớp thấp — kiểm tra kỹ hoặc tìm tay bên dưới.
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        type="text"
                        placeholder="Tìm tay theo tên sản phẩm..."
                        value={g.manualQuery}
                        onChange={(e) => handleManualSearch(g.key, e.target.value)}
                        style={{
                          width: "100%",
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius)",
                          padding: "6px 8px",
                          fontSize: 12.5,
                        }}
                      />
                      {g.manualResults.length > 0 && (
                        <div className="gan-anh-results" style={{ marginTop: 6 }}>
                          {g.manualResults.map((p) => (
                            <button
                              key={p.slug}
                              type="button"
                              className="gan-anh-result-row"
                              onClick={() => selectProduct(g.key, p)}
                            >
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

                      {g.selectedSlug && (
                        <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: "var(--teal)" }}>
                          ✓ Đã chọn: {g.selectedName}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 160 }}>
                        {g.originals.map((f, i) => (
                          <img
                            key={i}
                            src={URL.createObjectURL(f)}
                            alt=""
                            style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }}
                          />
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="cart-remove"
                        onClick={() => updateGroup(g.key, { skip: !g.skip })}
                      >
                        {g.skip ? "Bỏ qua" : "Huỷ"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn-primary" onClick={handleConfirmAll} disabled={attaching || readyGroups.length === 0}>
              {attaching ? "Đang gắn ảnh..." : `Xác nhận gắn ảnh cho ${readyGroups.length} sản phẩm`}
            </button>
          </div>

          {attachLog.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>Kết quả:</p>
              <ul style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {attachLog.map((l, i) => (
                  <li key={i}>
                    {l.success ? `✓ Gắn ${l.count} ảnh vào "${l.name}"` : `✗ Lỗi "${l.name}": ${l.error}`}
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
