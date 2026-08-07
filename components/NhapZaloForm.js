"use client";

import { useState } from "react";
import {
  prepareZaloRows,
  createZaloProductWithPhotos,
  attachZaloPhotos,
} from "@/app/admin/(protected)/products/nhap-zalo/actions";
import { VARIANT_PRESETS } from "@/lib/variantPresets";
import { parsePriceOptionsText, formatPriceOptionsText } from "@/lib/priceOptions";
import PriceInput from "@/components/PriceInput";
import SuccessModal from "@/components/SuccessModal";

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

// Dòng kiểu "Vỏ : 100k" / "Xương : 45k" — PHÂN LOẠI có giá riêng (khác dòng "Sỉ 90k" chỉ có 1 giá
// duy nhất cho cả sản phẩm). Nhãn không được là "sỉ"/"giá" (các biến thể dấu OCR/gõ tay hay dùng)
// vì đó là cách viết giá thường, không phải tên phân loại thật.
const PRICE_LABEL_LINE = /^([^:|]{1,24}):\s*([\d.,]+\s*k?)/iu;
const GENERIC_PRICE_WORD = /^(s[ỉiìịĩí]|gi[áàảãạa])$/i;

function parsePricedOptions(lines) {
  const options = [];
  for (const line of lines) {
    const m = line.match(PRICE_LABEL_LINE);
    if (!m) continue;
    const label = m[1].trim();
    if (!label || GENERIC_PRICE_WORD.test(label)) continue;
    const price = parsePrice(m[2]);
    if (price) options.push({ name: label, price });
  }
  return options;
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

    // >= 2 dòng "Tên : Giá" khác nhau -> đây là sản phẩm có NHIỀU PHÂN LOẠI GIÁ (vd "Vỏ: 100k" /
    // "Xương: 45k"), không phải chỉ 1 dòng giá lẻ tẻ trùng hợp có dấu ":". Giá hiển thị mặc định
    // (price) lấy theo phân loại ĐẦU TIÊN — admin vẫn sửa lại được ở bảng xem trước.
    const priceOptions = parsePricedOptions(lines.slice(1).map((l) => cleanLine(l)));
    const hasPriceOptions = priceOptions.length >= 2;

    items.push({
      name,
      price: hasPriceOptions ? priceOptions[0].price : price,
      variants: variantOverride || defaultVariants,
      priceOptions: hasPriceOptions ? priceOptions : [],
    });
  });

  return items;
}

export default function NhapZaloForm({ categoryGroups }) {
  const [text, setText] = useState("");
  // Để trống mặc định — bắt admin tự chọn danh mục cho lô, tránh trường hợp quên chỉnh mà lỡ tay
  // để nguyên danh mục mặc định (danh mục áp dụng cho CẢ LÔ, chọn nhầm ảnh hưởng mọi sản phẩm).
  const [category, setCategory] = useState("");
  const [presetIndex, setPresetIndex] = useState("");
  const [customVariants, setCustomVariants] = useState("");
  const [items, setItems] = useState([]);
  // Ảnh chụp màn hình chọn 1 lần cho CẢ LÔ, sắp theo thời gian chụp (lastModified) — đúng thứ tự
  // admin chụp lần lượt từng bài đăng, khớp với thứ tự các khối text đã dán ở trên.
  const [photoFiles, setPhotoFiles] = useState([]); // [{file, previewUrl}], đã sort theo lastModified
  // Gán TỪNG ảnh vào 1 sản phẩm — photoAssignment[pi] = index trong items, hoặc -1 = chưa gán.
  // Mặc định chia đều theo thứ tự (ảnh liền nhau -> cùng sản phẩm), nhưng sửa được TỪNG ảnh riêng lẻ
  // (đổi dropdown ở ảnh đó) — không còn kiểu "sửa số lượng làm dồn toa" như trước.
  const [photoAssignment, setPhotoAssignment] = useState([]);
  const [zoomedPhoto, setZoomedPhoto] = useState(null); // previewUrl đang phóng to xem, null = đang đóng
  const [rows, setRows] = useState(null); // sau khi prepareZaloRows xong, sẵn sàng commit
  const [duplicates, setDuplicates] = useState([]); // cảnh báo trùng tên, ứng với index trong rows
  const [duplicatesAck, setDuplicatesAck] = useState(false); // admin đã xem cảnh báo trùng CẦN xác nhận
  const [duplicateChoice, setDuplicateChoice] = useState({}); // index -> "existing" | "new"
  const [priceChoice, setPriceChoice] = useState({}); // index -> "new" | "keep" — khi giá dán vào khác giá đang lưu
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const defaultVariants =
    presetIndex !== ""
      ? VARIANT_PRESETS[Number(presetIndex)].variants
      : customVariants.split(",").map((s) => s.trim()).filter(Boolean);

  // Chia đều photoAssignment ban đầu: N ảnh đầu -> sản phẩm 1, N ảnh kế -> sản phẩm 2... (đúng thứ
  // tự thời gian chụp — đa số trường hợp đúng ngay). Dư ra (chia không hết) để "chưa gán" thay vì
  // dồn hết vào sản phẩm cuối, để admin thấy rõ và tự gán tay thay vì lẫn nhầm.
  function evenSplitAssignment(fileCount, itemCount) {
    if (itemCount === 0) return Array(fileCount).fill(-1);
    const perItem = Math.floor(fileCount / itemCount);
    const assignment = [];
    for (let i = 0; i < itemCount; i++) {
      for (let k = 0; k < perItem; k++) assignment.push(i);
    }
    while (assignment.length < fileCount) assignment.push(-1);
    return assignment;
  }

  // Nhóm ảnh theo sản phẩm, giữ lại vị trí gốc (pi) trong photoFiles — cần pi để sửa đúng ảnh khi
  // admin đổi dropdown gán lại, và để dùng làm key ổn định khi render.
  const photoGroupsWithIndex = items.map((_, i) =>
    photoFiles.map((p, pi) => ({ p, pi })).filter(({ pi }) => photoAssignment[pi] === i)
  );
  const leftoverWithIndex = photoFiles
    .map((p, pi) => ({ p, pi }))
    .filter(({ pi }) => photoAssignment[pi] === undefined || photoAssignment[pi] === -1);
  const photoGroups = photoGroupsWithIndex.map((g) => g.map(({ p }) => p));
  const totalAssigned = photoFiles.length - leftoverWithIndex.length;

  // Trùng tên với sản phẩm ĐÃ CÓ ẢNH SẴN, hoặc trùng NGAY TRONG lô đang dán (chưa rõ sản phẩm nào
  // là "gốc") -> bắt admin xác nhận rõ ràng trước khi lưu. Trùng với sản phẩm CHƯA CÓ ảnh nào thì
  // không tính là rủi ro (chỉ đang bổ sung ảnh còn thiếu) — không bắt xác nhận thêm.
  const blockingDuplicates = duplicates.filter((d) => d.existingHasImages || !d.existingSlug);
  const safeDuplicates = duplicates.filter((d) => d.existingSlug && !d.existingHasImages);
  // Giá dán vào khác giá đang lưu của sản phẩm đã có -> bắt chọn rõ "dùng giá mới" hay "giữ giá cũ"
  // trước khi cho lưu, không tự động ghi đè giá.
  function priceMismatch(d) {
    if (!d.existingSlug || !rows) return false;
    const row = rows[d.index];
    return row && Number(row.price) !== Number(d.existingPrice);
  }
  // CHỈ chặn nút Xác nhận vì lý do "chưa chọn dùng giá nào" đối với blockingDuplicates — đây là
  // nhóm DUY NHẤT có hiện giao diện chọn "dùng giá mới/giữ giá cũ" (xem blockingDuplicates.map
  // bên dưới). safeDuplicates (chưa có ảnh, đã hứa "không cần xác nhận thêm") không có giao diện
  // đó — trước đây pendingPriceChoices lỡ tính luôn cả safeDuplicates bị lệch giá, khoá cứng nút
  // Xác nhận vĩnh viễn mà không có cách nào gỡ (không có ô nào để bấm chọn).
  const pendingPriceChoices = blockingDuplicates.filter(
    (d) => duplicateChoice[d.index] === "existing" && priceMismatch(d) && !priceChoice[d.index]
  );
  const canCommit = Boolean(rows?.length) && (blockingDuplicates.length === 0 || duplicatesAck) && pendingPriceChoices.length === 0;

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
    // Ảnh đã chọn từ trước (nếu có) chia đều lại theo số sản phẩm mới tách được — admin chỉnh tay
    // tiếp ở bước gắn ảnh nếu chia đều không đúng thực tế (ảnh không đều nhau giữa các bài đăng).
    setPhotoAssignment(evenSplitAssignment(photoFiles.length, parsed.length));
  }

  function handlePhotoFilesChange(e) {
    const files = Array.from(e.target.files || []).sort((a, b) => a.lastModified - b.lastModified);
    const withPreview = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPhotoFiles(withPreview);
    setPhotoAssignment(evenSplitAssignment(withPreview.length, items.length));
  }

  // Đổi gán cho ĐÚNG 1 ảnh (pi = vị trí trong photoFiles) — sửa ảnh gán sai mà không đụng ảnh khác.
  function assignPhoto(pi, itemIndex) {
    setPhotoAssignment((prev) => prev.map((v, idx) => (idx === pi ? itemIndex : v)));
  }

  function resplitEvenly() {
    setPhotoAssignment(evenSplitAssignment(photoFiles.length, items.length));
  }

  function updateRowPrice(i, value) {
    const n = Number(value);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, price: Number.isFinite(n) ? n : r.price } : r)));
  }

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function updateItemVariants(i, value) {
    updateItem(i, "variants", value.split(",").map((s) => s.trim()).filter(Boolean));
  }

  function updateItemPriceOptionsText(i, text) {
    const priceOptions = parsePriceOptionsText(text);
    // Có phân loại hợp lệ -> giá hiển thị mặc định lấy theo phân loại ĐẦU TIÊN (khớp cách
    // parseZaloBlocks tự tách lúc nãy) — vẫn giữ nguyên giá cũ nếu admin xoá hết phân loại.
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? { ...it, priceOptions, price: priceOptions.length > 0 ? priceOptions[0].price : it.price }
          : it
      )
    );
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    // Ảnh đang gán cho dòng bị xoá -> chuyển về "chưa gán" (không mất ảnh); các dòng SAU dòng bị
    // xoá dịch lùi 1 index để khớp lại với items sau khi xoá.
    setPhotoAssignment((prev) => prev.map((v) => (v === i ? -1 : v > i ? v - 1 : v)));
  }

  async function handlePrepare() {
    if (!category) {
      setError("Chưa chọn danh mục cho lô hàng — chọn ở phần trên trước khi tiếp tục.");
      return;
    }
    const invalid = items.some(
      (it) => !it.name || !Number.isFinite(Number(it.price)) || Number(it.price) <= 0
    );
    if (invalid) {
      setError("Có dòng thiếu tên hoặc giá không hợp lệ — sửa lại (giá phải là số lớn hơn 0) trước khi tiếp tục.");
      return;
    }
    if (photoGroups.some((g) => g.length === 0)) {
      setError("Có sản phẩm chưa gắn ảnh nào — gán thêm ảnh ở bước gắn ảnh trước khi tiếp tục.");
      return;
    }
    setIsBusy(true);
    setError("");
    const categoryOption = categoryGroups.flatMap((g) => g.categories).find((c) => c.slug === category);
    try {
      const res = await prepareZaloRows({
        category,
        categoryCode: categoryOption?.code || "SP",
        items: items.map((it) => ({
          name: it.name,
          price: Number(it.price),
          variants: it.variants,
          priceOptions: it.priceOptions,
        })),
      });
      if (!res.success) {
        setError(res.error || "Có lỗi khi chuẩn bị dữ liệu.");
        return;
      }
      setRows(res.rows);
      setDuplicates(res.duplicates || []);
      setDuplicatesAck(false);
      setPriceChoice({});
      // Trùng với sản phẩm ĐÃ CÓ SẴN -> mặc định "cập nhật ảnh cho sản phẩm đó" (an toàn hơn, tránh
      // tạo trùng); trùng NGAY TRONG lô đang dán (chưa có existingSlug, sản phẩm kia còn chưa tồn
      // tại) thì bắt buộc "tạo mới" vì chưa có gì để gắn thêm ảnh vào.
      const nextChoice = {};
      (res.duplicates || []).forEach((d) => {
        nextChoice[d.index] = d.existingSlug ? "existing" : "new";
      });
      setDuplicateChoice(nextChoice);
    } catch (err) {
      setError(`Có lỗi khi chuẩn bị dữ liệu: ${err?.message || "không rõ nguyên nhân"}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCommit() {
    if (!canCommit) return;
    setIsBusy(true);
    const categoryOption = categoryGroups.flatMap((g) => g.categories).find((c) => c.slug === category);
    const perItem = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const files = (photoGroups[i] || []).map((p) => p.file);
      const dupInfo = duplicates.find((d) => d.index === i);
      const useExisting = Boolean(dupInfo?.existingSlug) && duplicateChoice[i] === "existing";

      try {
        if (useExisting) {
          const formData = new FormData();
          formData.set("slug", dupInfo.existingSlug);
          // Chỉ gửi giá mới nếu KHÔNG lệch giá đang lưu, hoặc admin đã chủ động chọn "dùng giá
          // mới" khi có lệch — giữ nguyên giá cũ nếu admin chọn "giữ giá cũ", không âm thầm ghi đè.
          // Riêng safeDuplicates (chưa có ảnh sẵn) không có bước chọn này (xem pendingPriceChoices
          // ở trên) nên LUÔN dùng giá mới — đúng mục đích tính năng là đồng bộ giá mới nhất từ
          // bài đăng, không lặng lẽ bỏ qua giá mới chỉ vì thiếu ảnh.
          const mismatch = priceMismatch(dupInfo);
          const isBlocking = dupInfo.existingHasImages || !dupInfo.existingSlug;
          if (!mismatch || !isBlocking || priceChoice[i] === "new") {
            formData.set("price", String(row.price));
          }
          // Đồng bộ luôn phân loại có giá riêng (Vỏ/Xương...) dán từ bài đăng vào sản phẩm đã có
          // sẵn — trước đây thiếu dòng này nên attachZaloPhotos không nhận được, sản phẩm mất hẳn
          // lựa chọn phân loại dù bảng xác nhận đã hiện đúng thông tin.
          formData.set("priceOptions", JSON.stringify(row.price_options || []));
          files.forEach((f) => formData.append("images", f));
          const res = await attachZaloPhotos(formData);
          perItem.push({ name: row.name, success: res.success, error: res.error, mode: "existing" });
        } else {
          const formData = new FormData();
          formData.set("name", row.name);
          formData.set("price", String(row.price));
          formData.set("category", row.category);
          formData.set("categoryCode", categoryOption?.code || "SP");
          formData.set("variants", JSON.stringify(row.variants || []));
          formData.set("priceOptions", JSON.stringify(row.price_options || []));
          files.forEach((f) => formData.append("images", f));
          const res = await createZaloProductWithPhotos(formData);
          perItem.push({ name: row.name, success: res.success, error: res.error, mode: "new" });
        }
      } catch (err) {
        perItem.push({ name: row.name, success: false, error: err?.message || "không rõ nguyên nhân", mode: useExisting ? "existing" : "new" });
      }
    }

    const success = perItem.every((r) => r.success);
    setResult({ success, items: perItem });
    if (success) {
      setText("");
      setItems([]);
      setPhotoFiles([]);
      setPhotoAssignment([]);
      setRows(null);
      setDuplicates([]);
      setDuplicatesAck(false);
      setDuplicateChoice({});
      setPriceChoice({});
    }
    setIsBusy(false);
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
            style={{
              border: category ? "1.5px solid var(--line)" : "1.5px solid #B0503A",
              borderRadius: "var(--radius)",
              padding: "8px 10px",
              fontSize: 13.5,
            }}
          >
            <option value="">— Chọn danh mục —</option>
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
        <button type="button" className="btn-primary" onClick={handleParse} disabled={!text.trim() || !category}>
          Tách thành danh sách sản phẩm
        </button>
        {!category && <span style={{ fontSize: 12, color: "#B0503A", marginLeft: 10 }}>Chưa chọn danh mục ở trên</span>}
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
                <th>Phân loại có giá (không bắt buộc)</th>
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
                    <PriceInput
                      value={it.price ?? ""}
                      onChange={(digits) => updateItem(i, "price", digits ? Number(digits) : null)}
                      inputStyle={{ width: 130, border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 34px 6px 8px", fontSize: 13.5 }}
                    />
                    {it.price === null && (
                      <div style={{ fontSize: 11, color: "#B0503A" }}>Không tự nhận ra giá — điền tay</div>
                    )}
                    {it.priceOptions?.length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Giá của phân loại đầu tiên</div>
                    )}
                  </td>
                  <td>
                    <textarea
                      defaultValue={formatPriceOptionsText(it.priceOptions)}
                      onChange={(e) => updateItemPriceOptionsText(i, e.target.value)}
                      rows={2}
                      placeholder={"Vỏ|100000\nXương|45000"}
                      style={{ width: 150, border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 8px", fontSize: 12.5, fontFamily: "inherit" }}
                    />
                    {it.priceOptions?.length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--teal)" }}>
                        Đã tự nhận diện {it.priceOptions.length} phân loại
                      </div>
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

          <div style={{ marginTop: 28 }}>
            <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>
              Bước 2 — Gắn ảnh cho từng sản phẩm:
            </p>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 0, marginBottom: 10 }}>
              Chọn hết ảnh chụp màn hình của cả lô cùng lúc (ảnh tự sắp theo thời gian chụp, chia đều
              theo số sản phẩm). Bấm vào ảnh để xem to, đổi ô chọn dưới mỗi ảnh nếu gán nhầm sản
              phẩm — sửa từng ảnh riêng lẻ, không ảnh hưởng các ảnh khác.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept="image/*" multiple onChange={handlePhotoFilesChange} />
              {photoFiles.length > 0 && (
                <button type="button" className="cart-remove" onClick={resplitEvenly}>
                  Chia đều lại
                </button>
              )}
            </div>
            {photoFiles.length > 0 && (
              <p style={{ fontSize: 12.5, color: totalAssigned === photoFiles.length ? "var(--ink-soft)" : "#B0503A", marginTop: 8 }}>
                Đã chọn {photoFiles.length} ảnh — đã gán {totalAssigned}
                {totalAssigned !== photoFiles.length && ` (còn ${leftoverWithIndex.length} ảnh chưa gán cho sản phẩm nào, xem cuối trang)`}.
              </p>
            )}

            {photoFiles.length > 0 &&
              items.map((it, i) => (
                <div key={i} style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {i + 1}. {it.name}{" "}
                    {photoGroupsWithIndex[i].length === 0 && (
                      <span style={{ fontSize: 12, fontWeight: 400, color: "#B0503A" }}>— chưa có ảnh</span>
                    )}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {photoGroupsWithIndex[i].map(({ p, pi }) => (
                      <div key={pi} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <img
                          src={p.previewUrl}
                          alt=""
                          onClick={() => setZoomedPhoto(p.previewUrl)}
                          style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "var(--radius)", cursor: "zoom-in", border: "1px solid var(--line)" }}
                        />
                        <select
                          value={i}
                          onChange={(e) => assignPhoto(pi, Number(e.target.value))}
                          style={{ fontSize: 13.5, width: 170, border: "1.5px solid var(--line)", borderRadius: 6, padding: "5px 6px" }}
                        >
                          <option value={-1}>— Chưa gán —</option>
                          {items.map((opt, optIdx) => (
                            <option key={optIdx} value={optIdx}>
                              {optIdx + 1}. {opt.name.slice(0, 28)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {leftoverWithIndex.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#B0503A", marginBottom: 6 }}>
                  Ảnh chưa gán cho sản phẩm nào:
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {leftoverWithIndex.map(({ p, pi }) => (
                    <div key={pi} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <img
                        src={p.previewUrl}
                        alt=""
                        onClick={() => setZoomedPhoto(p.previewUrl)}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "var(--radius)", cursor: "zoom-in", border: "1.5px solid #B0503A" }}
                      />
                      <select
                        value={-1}
                        onChange={(e) => assignPhoto(pi, Number(e.target.value))}
                        style={{ fontSize: 13.5, width: 170, border: "1.5px solid var(--line)", borderRadius: 6, padding: "5px 6px" }}
                      >
                        <option value={-1}>— Chưa gán —</option>
                        {items.map((opt, optIdx) => (
                          <option key={optIdx} value={optIdx}>
                            {optIdx + 1}. {opt.name.slice(0, 28)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="button" className="btn-primary" onClick={handlePrepare} disabled={isBusy} style={{ marginTop: 20 }}>
            {isBusy ? "Đang xử lý..." : "Kiểm tra trùng & chuẩn bị lưu →"}
          </button>
        </div>
      )}

      {zoomedPhoto && (
        <div
          onClick={() => setZoomedPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            cursor: "zoom-out",
            padding: 24,
          }}
        >
          <img
            src={zoomedPhoto}
            alt=""
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 10, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}
          />
        </div>
      )}

      {rows && (
        <div className="gan-anh-confirm" style={{ marginTop: 24 }}>
          <div className="gan-anh-confirm-name">Bước 3 — Xác nhận tạo {rows.length} sản phẩm</div>
          <p style={{ fontSize: 13.5, margin: "0 0 12px" }}>
            Kiểm tra lại giá lần cuối bên dưới trước khi xác nhận — ảnh đã gắn kèm theo từng dòng ở
            bước trước, không cần qua &quot;Gán ảnh hàng loạt&quot; riêng nữa.
          </p>

          {safeDuplicates.length > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 14 }}>
              ℹ️ {safeDuplicates.length} sản phẩm trùng tên với sản phẩm đã có sẵn NHƯNG chưa có ảnh nào —
              tự động cập nhật thêm ảnh và giá mới (nếu giá dán vào khác giá đang lưu), không cần xác nhận thêm.
            </p>
          )}

          {blockingDuplicates.length > 0 && (
            <div
              style={{
                border: "1.5px solid #B0503A",
                borderRadius: "var(--radius)",
                padding: "10px 14px",
                marginBottom: 14,
                background: "#fdf2ee",
              }}
            >
              <p style={{ fontWeight: 600, color: "#B0503A", margin: "0 0 6px", fontSize: 13.5 }}>
                ⚠️ Phát hiện {blockingDuplicates.length} sản phẩm có thể đã trùng — xem kỹ trước khi tạo:
              </p>
              <ul style={{ fontSize: 13, paddingLeft: 18, margin: 0 }}>
                {blockingDuplicates.map((d) => (
                  <li key={d.index} style={{ marginBottom: 10 }}>
                    <b>{d.name}</b>
                    {d.existingName && (
                      <> — trùng tên với sản phẩm đã có sẵn: <i>{d.existingName}</i> (giá hiện tại: {formatPrice(d.existingPrice)})</>
                    )}
                    {d.duplicateInSameBatch && (
                      <> — trùng tên với dòng “<i>{d.duplicateInSameBatch}</i>” cũng vừa dán trong lô này</>
                    )}
                    {d.existingImages?.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        {d.existingImages.slice(0, 4).map((url, ui) => (
                          <img
                            key={ui}
                            src={url}
                            alt=""
                            onClick={() => setZoomedPhoto(url)}
                            style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, cursor: "zoom-in", border: "1px solid var(--line)" }}
                          />
                        ))}
                      </div>
                    )}
                    {d.existingSlug && (
                      <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontWeight: 400 }}>
                          <input
                            type="radio"
                            name={`dup-${d.index}`}
                            checked={duplicateChoice[d.index] === "existing"}
                            onChange={() => setDuplicateChoice((prev) => ({ ...prev, [d.index]: "existing" }))}
                          />
                          Cập nhật thêm ảnh cho sản phẩm đã có
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontWeight: 400 }}>
                          <input
                            type="radio"
                            name={`dup-${d.index}`}
                            checked={duplicateChoice[d.index] === "new"}
                            onChange={() => setDuplicateChoice((prev) => ({ ...prev, [d.index]: "new" }))}
                          />
                          Vẫn tạo sản phẩm mới
                        </label>
                      </div>
                    )}
                    {duplicateChoice[d.index] === "existing" && priceMismatch(d) && (
                      <div style={{ border: "1px solid #B0503A", borderRadius: 6, padding: "6px 8px", marginTop: 6, background: "#fff" }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          Giá bài đăng ({formatPrice(rows[d.index].price)}) khác giá đang lưu ({formatPrice(d.existingPrice)}) — dùng giá nào?
                        </div>
                        <div style={{ display: "flex", gap: 14 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontWeight: 400 }}>
                            <input
                              type="radio"
                              name={`price-${d.index}`}
                              checked={priceChoice[d.index] === "new"}
                              onChange={() => setPriceChoice((prev) => ({ ...prev, [d.index]: "new" }))}
                            />
                            Dùng giá mới ({formatPrice(rows[d.index].price)})
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontWeight: 400 }}>
                            <input
                              type="radio"
                              name={`price-${d.index}`}
                              checked={priceChoice[d.index] === "keep"}
                              onChange={() => setPriceChoice((prev) => ({ ...prev, [d.index]: "keep" }))}
                            />
                            Giữ giá cũ ({formatPrice(d.existingPrice)})
                          </label>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={duplicatesAck} onChange={(e) => setDuplicatesAck(e.target.checked)} />
                Tôi đã kiểm tra, vẫn muốn tạo/cập nhật các sản phẩm này (kể cả sản phẩm trùng tên)
              </label>
            </div>
          )}

          <table className="cart-table" style={{ marginBottom: 14 }}>
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Giá bán (đ)</th>
                <th>Phân loại</th>
                <th>Dòng máy</th>
                <th>Ảnh</th>
                <th>Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const dupInfo = duplicates.find((d) => d.index === i);
                const useExisting = Boolean(dupInfo?.existingSlug) && duplicateChoice[i] === "existing";
                // blockingDuplicates (đã có ảnh sẵn) đã có ô chọn riêng, đầy đủ hơn (kèm ảnh so
                // sánh, chọn giá) ở khối cảnh báo ⚠️ phía trên rồi — ở đây chỉ cần thêm lựa chọn
                // cho safeDuplicates (trùng tên nhưng CHƯA có ảnh), trước đây tự động gán luôn
                // không cho sửa, lỡ khớp NHẦM tên (dễ xảy ra khi dán nhiều sản phẩm tên gần giống
                // nhau cùng lúc) thì không có cách nào chọn lại "tạo mới" thay vì ghi đè nhầm.
                const isBlocking = Boolean(dupInfo) && (dupInfo.existingHasImages || !dupInfo.existingSlug);
                const showInlineChoice = Boolean(dupInfo?.existingSlug) && !isBlocking;
                return (
                  <tr key={r.slug}>
                    <td>{r.name}</td>
                    <td>
                      <PriceInput
                        value={r.price ?? ""}
                        onChange={(digits) => updateRowPrice(i, digits)}
                        inputStyle={{ width: 130, border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 34px 6px 8px", fontSize: 13.5 }}
                      />
                      {r.price_options?.length > 0 && (
                        <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Giá phân loại đầu</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {r.price_options?.length > 0
                        ? r.price_options.map((o) => `${o.name}: ${formatPrice(o.price)}`).join(", ")
                        : "không có"}
                    </td>
                    <td>{r.variants?.length ? `${r.variants.length} dòng máy` : "không gắn dòng máy"}</td>
                    <td>{(photoGroups[i] || []).length} ảnh</td>
                    <td>
                      {showInlineChoice ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontWeight: 400 }}>
                            <input
                              type="radio"
                              name={`row-dup-${i}`}
                              checked={duplicateChoice[i] === "existing"}
                              onChange={() => setDuplicateChoice((prev) => ({ ...prev, [i]: "existing" }))}
                            />
                            Cập nhật vào: {dupInfo.existingName}
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontWeight: 400 }}>
                            <input
                              type="radio"
                              name={`row-dup-${i}`}
                              checked={duplicateChoice[i] === "new"}
                              onChange={() => setDuplicateChoice((prev) => ({ ...prev, [i]: "new" }))}
                            />
                            Khớp sai tên — tạo sản phẩm mới
                          </label>
                          {dupInfo.existingImages?.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                              {dupInfo.existingImages.slice(0, 3).map((url, ui) => (
                                <img
                                  key={ui}
                                  src={url}
                                  alt=""
                                  onClick={() => setZoomedPhoto(url)}
                                  style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, cursor: "zoom-in", border: "1px solid var(--line)" }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Chỉ là NHÃN TRẠNG THÁI, không phải nút bấm được — dùng cho blockingDuplicates
                           (đã có ô chọn riêng ở trên) và trường hợp không trùng ai cả (luôn tạo mới). */
                        <span className="pdp-badge" title='Chỉ là thông tin — bấm nút "Xác nhận" bên dưới để thực hiện'>
                          {useExisting ? `Sẽ cập nhật ảnh vào: ${dupInfo.existingName}` : "Sẽ tạo mới"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCommit}
              disabled={isBusy || !canCommit}
            >
              {isBusy ? "Đang tạo..." : `Xác nhận tạo ${rows.length} sản phẩm`}
            </button>
            <button
              type="button"
              className="cart-remove"
              onClick={() => {
                setRows(null);
                setDuplicates([]);
                setDuplicatesAck(false);
                setDuplicateChoice({});
                setPriceChoice({});
              }}
              disabled={isBusy}
            >
              Quay lại sửa
            </button>
          </div>
        </div>
      )}

      <SuccessModal
        open={!!result}
        success={result?.success}
        title={result?.success ? "Hoàn tất! ✓" : "Có sản phẩm xử lý lỗi:"}
        onClose={() => setResult(null)}
      >
        <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
          {result?.items?.map((it, i) => (
            <li key={i} style={{ color: it.success ? "var(--ink-soft)" : "#B0503A" }}>
              {it.success
                ? it.mode === "existing"
                  ? `✓ Đã cập nhật ảnh cho "${it.name}"`
                  : `✓ Đã tạo mới "${it.name}"`
                : `✗ Lỗi "${it.name}": ${it.error}`}
            </li>
          ))}
        </ul>
      </SuccessModal>
    </div>
  );
}
