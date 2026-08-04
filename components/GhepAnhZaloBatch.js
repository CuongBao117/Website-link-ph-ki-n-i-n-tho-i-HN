"use client";

import { useEffect, useState } from "react";
import { createWorker } from "tesseract.js";
import {
  matchProductByName,
  attachPhotosToProduct,
  createProductWithPhotos,
} from "@/app/admin/(protected)/products/ghep-anh-zalo/actions";
import { searchProducts } from "@/app/admin/(protected)/products/gan-anh/actions";
import PriceInput from "@/components/PriceInput";

const AUTO_MATCH_THRESHOLD = 0.3; // độ khớp pg_trgm (0..1) — trên ngưỡng này coi là ĐÃ có sẵn, dưới thì coi là sản phẩm MỚI

// Đọc chữ (OCR) chạy THẲNG trong trình duyệt — trước đây chạy qua Server Action trên serverless
// function, mỗi ảnh phải khởi tạo lại từ đầu 1 worker Tesseract (tải lại dữ liệu ngôn ngữ ~vài MB)
// rồi mới đọc, lặp lại tuần tự cho từng ảnh -> rất chậm và hay bị timeout/đứng khi lô ảnh dài.
// Giờ dùng vài worker khởi tạo 1 LẦN DUY NHẤT, giữ lại dùng cho cả phiên làm việc.
const OCR_WORKER_COUNT = 3; // vài worker chạy song song — giới hạn vừa phải, tránh ngốn CPU trình duyệt
const OCR_TIMEOUT_MS = 25000; // 1 ảnh đọc quá lâu (ảnh lỗi/quá nặng/mạng chậm) thì bỏ qua, không treo cả lô
const OCR_MAX_DIMENSION = 1000; // thu nhỏ ảnh trước khi đọc chữ cho nhanh hơn — chỉ cần đọc rõ caption, không cần giữ nguyên độ phân giải ảnh gốc

let ocrWorkerPoolPromise = null;

function getOcrWorkerPool() {
  if (!ocrWorkerPoolPromise) {
    ocrWorkerPoolPromise = Promise.all(Array.from({ length: OCR_WORKER_COUNT }, () => createWorker("vie")));
  }
  return ocrWorkerPoolPromise;
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Thu nhỏ ảnh trước khi đưa vào OCR — ảnh chụp màn hình điện thoại thường rất to (2-4MB, cả
// nghìn px chiều ngang) trong khi engine chỉ cần đọc được chữ trong caption. Ảnh GỐC (đầy đủ độ
// phân giải) vẫn được giữ nguyên để gắn vào sản phẩm ở bước sau, resize này chỉ dùng riêng cho OCR.
async function resizeForOcr(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, OCR_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob || file;
  } catch {
    return file; // Không resize được (API lạ/trình duyệt cũ...) thì đọc thẳng ảnh gốc, vẫn đúng chỉ chậm hơn.
  }
}

// Các dòng chữ kiểu giao diện điện thoại/Zalo (giờ đăng, đồng hồ trạng thái, pin, nút Thích/Bình
// luận/Chia sẻ...) hay lẫn vào kết quả OCR — loại trước để không làm nhiễu bước đoán tên sản phẩm.
// Khớp NGUYÊN DÒNG — dùng cho rác không có số/mốc thời gian đi kèm. 3 nút Thích/Bình luận/Chia sẻ
// nằm ngang cùng hàng trên giao diện Zalo nên OCR hay đọc dính vào chung 1 dòng — cho phép lặp lại
// nhiều cụm nút cách nhau bởi khoảng trắng, không chỉ khớp đúng 1 cụm duy nhất.
const ENGAGEMENT_WORD = "(thích|bình luận|chia sẻ|xem thêm|trả lời)";
const NOISE_LINE_EXACT = new RegExp(`^(${ENGAGEMENT_WORD}(\\s+${ENGAGEMENT_WORD})*|\\.{2,}|[×xX]|\\d{1,3}\\s?%)$`, "i");

// Mốc thời gian/ngày đăng ("6 giờ trước", "20:55", "24-07-2026 - 14:51"...) — OCR hay đọc dính thêm
// 1-2 ký tự rác ở đầu/cuối dòng (icon cạnh chữ bị đọc lẫn vào, vd "x 6 giờ trước um") nên KHÔNG đòi
// khớp nguyên dòng như trước nữa, chỉ cần dòng có CHỨA mốc thời gian là loại — tên sản phẩm thật
// không bao giờ chứa các mốc này.
const NOISE_LINE_TIME =
  /\d+\s*(phút|giây|giờ|ngày|tuần)\s*trước|\d{1,2}[-/]\d{1,2}([-/]\d{2,4})?\s*[-–]?\s*\d{1,2}[:.,]\d{2}|\b\d{1,2}[:.,]\d{2}(\s?(am|pm))?\b/i;

function isNoiseLine(line) {
  return NOISE_LINE_EXACT.test(line) || NOISE_LINE_TIME.test(line);
}

// Dòng kiểu "Sỉ 90k" / "Giá: 95.000đ" — không phải tên sản phẩm, tách riêng ra để đọc GIÁ.
// Không dùng \b ngay sau "ỉ"/"á" — \b của JS tính theo \w kiểu ASCII nên không nhận ký tự có dấu,
// khiến \b không bao giờ khớp ở đây (vd "Sỉ 90k" sẽ KHÔNG được coi là dòng giá nếu dùng \b).
const PRICE_LINE = /^(s[ỉi]|gi[áa])(\s|:|$)/i;

// Bỏ icon/emoji ở đầu-cuối dòng (caption Zalo hay có "✨✨", "💵"...) để tên/giá đọc ra không dính rác.
function cleanLine(line) {
  return line
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/^[\s•*\-–✅❌:]+|[\s•*\-–✅❌]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Bóc số + "k" ra khỏi chuỗi giá kiểu Zalo: "Sỉ 90k" -> 90000, "125.000đ" -> 125000.
function parsePriceValue(raw) {
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

// Từ toàn bộ chữ OCR đọc được trong 1 ảnh chụp màn hình (lẫn cả tên người đăng, giờ đăng, chữ nút
// bấm, badge in trên ảnh...), tách ra TÊN sản phẩm và GIÁ bán (ưu tiên dòng có "Sỉ"/"Giá", không
// có thì quét số+k đầu tiên trong toàn bộ chữ).
//
// Tên sản phẩm: gộp TẤT CẢ dòng còn lại sau khi bỏ dòng rác/dòng giá/dòng quá ngắn — caption thật
// nằm dưới ảnh, sau phần rác đầu ảnh (tên người đăng, giờ đăng...), và có thể xuống dòng nhiều dòng
// (tên máy + dung lượng/specs riêng dòng...) nên KHÔNG chỉ lấy 1 dòng dài nhất như trước (mất phần
// còn lại của tên) và KHÔNG giới hạn trong vài dòng đầu (phần rác phía trên có thể dài hơn 6 dòng,
// đẩy caption thật xuống dưới, khiến rác lọt vào bị chọn nhầm làm tên).
function pickNameAndPrice(text) {
  const cleanedLines = String(text || "")
    .split("\n")
    .map((l) => cleanLine(l))
    .filter(Boolean);

  const nameLines = cleanedLines.filter((l) => l.length >= 4 && !isNoiseLine(l) && !PRICE_LINE.test(l));
  const nameCandidate = nameLines.join(" ").replace(/\s{2,}/g, " ").trim();

  let priceCandidate = null;
  for (const line of cleanedLines) {
    const m = line.match(/s[ỉi]\s*:?\s*([\d.,]+\s*k?)/iu) || line.match(/gi[áa]\s*:?\s*([\d.,]+\s*k?)/iu);
    if (m) {
      priceCandidate = parsePriceValue(m[1]);
      if (priceCandidate) break;
    }
  }
  if (priceCandidate === null) {
    for (const line of cleanedLines) {
      const m = line.match(/([\d.,]+\s*k)\b/iu);
      if (m) {
        priceCandidate = parsePriceValue(m[1]);
        if (priceCandidate) break;
      }
    }
  }

  return { nameCandidate, priceCandidate };
}

// Chạy OCR cho CẢ LÔ ảnh bằng vài worker dùng chung (xem getOcrWorkerPool) — mỗi worker rảnh sẽ
// tự lấy ảnh tiếp theo trong hàng đợi (round-robin đơn giản qua biến đếm dùng chung), nhanh hơn
// hẳn so với xử lý tuần tự từng ảnh một. 1 ảnh lỗi/quá lâu chỉ báo lỗi cho riêng ảnh đó.
async function ocrAllFiles(files, onProgress) {
  const workers = await getOcrWorkerPool();
  const results = new Array(files.length);
  let nextIndex = 0;
  let doneCount = 0;

  async function runWithWorker(worker) {
    while (nextIndex < files.length) {
      const i = nextIndex++;
      const file = files[i];
      try {
        const ocrInput = await resizeForOcr(file);
        const { data } = await withTimeout(
          worker.recognize(ocrInput),
          OCR_TIMEOUT_MS,
          "Quá thời gian đọc chữ (ảnh quá nặng hoặc mạng chậm) — thử lại riêng ảnh này."
        );
        const { nameCandidate, priceCandidate } = pickNameAndPrice(data.text || "");
        results[i] = { file, nameCandidate, priceCandidate, ocrError: null };
      } catch (err) {
        results[i] = { file, nameCandidate: "", priceCandidate: null, ocrError: err?.message || "Lỗi đọc chữ không rõ nguyên nhân" };
      }
      doneCount++;
      onProgress(doneCount, files.length);
    }
  }

  await Promise.all(workers.map((w) => runWithWorker(w)));
  return results;
}

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
  const [ocrFatalError, setOcrFatalError] = useState("");
  const [category, setCategory] = useState(categoryGroups?.[0]?.categories?.[0]?.slug || "");
  const [confirming, setConfirming] = useState(false);
  const [confirmLog, setConfirmLog] = useState([]);

  const categoryOption = categoryGroups?.flatMap((g) => g.categories).find((c) => c.slug === category);

  // Rời khỏi trang thì giải phóng worker Testeract đang giữ (nếu có) — tránh worker (Web Worker +
  // engine WASM đã tải) treo lại trong bộ nhớ khi admin không dùng công cụ này nữa.
  useEffect(() => {
    return () => {
      if (ocrWorkerPoolPromise) {
        const pool = ocrWorkerPoolPromise;
        ocrWorkerPoolPromise = null;
        pool.then((workers) => workers.forEach((w) => w.terminate()));
      }
    };
  }, []);

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
    // Gọi Server Action có thể thất bại (mất mạng, phiên đăng nhập hết hạn, vừa deploy bản mới
    // khiến action cũ không còn hợp lệ...) — không để 1 nhóm lỗi làm crash cả bảng, coi như
    // "chưa tìm thấy sản phẩm khớp" và để admin tự tìm tay/tạo mới.
    let res;
    try {
      res = await matchProductByName(group.nameCandidate);
    } catch {
      res = null;
    }
    const candidates = res?.success ? res.candidates || [] : [];
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
    setOcrFatalError("");
    const sorted = [...files].sort((a, b) => a.lastModified - b.lastModified);
    setOcrProgress({ done: 0, total: sorted.length });

    let items;
    try {
      items = await ocrAllFiles(sorted, (done, total) => setOcrProgress({ done, total }));
    } catch (err) {
      setOcrFatalError(
        `Không khởi tạo được engine đọc chữ: ${err?.message || "không rõ nguyên nhân"} — kiểm tra lại kết nối mạng rồi thử lại.`
      );
      setOcrRunning(false);
      return;
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
          {ocrFatalError && <p style={{ color: "#B0503A", fontSize: 13.5, marginTop: 10 }}>{ocrFatalError}</p>}
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
