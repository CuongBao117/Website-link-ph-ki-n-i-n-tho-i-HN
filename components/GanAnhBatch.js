"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchProducts,
  attachImageToProduct,
  createProductWithImage,
} from "@/app/admin/(protected)/products/gan-anh/actions";

function formatPrice(value) {
  if (value === null || value === undefined) return "";
  return Number(value).toLocaleString("vi-VN") + "đ";
}

export default function GanAnhBatch({ categoryGroups }) {
  const [queue, setQueue] = useState([]); // [{ file, previewUrl }]
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [log, setLog] = useState([]); // [{ fileName, status, label }]
  const [lastProduct, setLastProduct] = useState(null); // { slug, name } — để gắn nhanh ảnh tiếp theo cùng sản phẩm
  const fileInputRef = useRef(null);

  const current = queue[index] || null;
  const remaining = queue.length - index;

  // Tìm sản phẩm gần đúng — chờ 350ms sau khi gõ xong mới gọi, tránh gọi liên tục từng ký tự.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchProducts(query);
      setResults(res.results || []);
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setQueue(files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })));
    setIndex(0);
    setLog([]);
    setQuery("");
    setResults([]);
    setShowCreateForm(false);
    setLastProduct(null);
  }

  function goNext(entry) {
    if (entry) setLog((prev) => [...prev, entry]);
    setIndex((i) => i + 1);
    setQuery("");
    setResults([]);
    setShowCreateForm(false);
  }

  async function handleAttach(product) {
    if (!current || isBusy) return;
    setIsBusy(true);
    const formData = new FormData();
    formData.set("slug", product.slug);
    formData.set("image", current.file);
    const res = await attachImageToProduct(formData);
    setIsBusy(false);
    if (res.success) {
      setLastProduct({ slug: product.slug, name: product.name });
      goNext({ fileName: current.file.name, status: "attached", label: product.name });
    } else {
      alert(`Lỗi: ${res.error}`);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!current || isBusy) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("image", current.file);
    const categorySelect = form.elements.category;
    const categoryCode =
      categorySelect.selectedOptions?.[0]?.dataset?.code || "SP";
    formData.set("categoryCode", categoryCode);

    setIsBusy(true);
    const res = await createProductWithImage(formData);
    setIsBusy(false);
    if (res.success) {
      setLastProduct({ slug: res.slug, name: formData.get("name") });
      goNext({ fileName: current.file.name, status: "created", label: formData.get("name") });
    } else {
      alert(`Lỗi: ${res.error}`);
    }
  }

  function handleSkip() {
    if (!current) return;
    goNext({ fileName: current.file.name, status: "skipped", label: null });
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
        />
      </div>

      {queue.length === 0 ? (
        <div className="empty-state">Chưa chọn ảnh nào — chọn 1 lô ảnh ở trên để bắt đầu.</div>
      ) : !current ? (
        <div className="empty-state" style={{ borderColor: "var(--teal)" }}>
          <p style={{ fontWeight: 700, color: "var(--teal)", marginTop: 0 }}>
            Đã xử lý xong {queue.length}/{queue.length} ảnh trong lô này.
          </p>
          <p style={{ marginBottom: 0 }}>
            Gắn thành công: {log.filter((l) => l.status !== "skipped").length} — Bỏ qua:{" "}
            {log.filter((l) => l.status === "skipped").length}. Chọn lô ảnh tiếp theo ở ô phía trên nếu còn.
          </p>
        </div>
      ) : (
        <div className="gan-anh-workspace">
          <div className="gan-anh-preview">
            <img src={current.previewUrl} alt={current.file.name} />
            <div className="gan-anh-counter">
              Ảnh {index + 1}/{queue.length} — còn lại {remaining}
            </div>
          </div>

          <div className="gan-anh-match">
            {lastProduct && (
              <button
                type="button"
                className="gan-anh-quick-repeat"
                disabled={isBusy}
                onClick={() => handleAttach(lastProduct)}
              >
                📌 Ảnh này cũng của "{lastProduct.name}" — gắn luôn (thêm góc chụp khác)
              </button>
            )}

            <label>Gõ tên sản phẩm (đọc từ caption bên Zalo)</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pin DLC iPhone 13..."
              autoFocus
            />

            {isSearching && <div className="gan-anh-hint">Đang tìm...</div>}

            {results.length > 0 && (
              <div className="gan-anh-results">
                {results.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    className="gan-anh-result-row"
                    disabled={isBusy}
                    onClick={() => handleAttach(p)}
                  >
                    <div className="gan-anh-result-thumb">
                      {p.images?.[0] || p.image_url ? (
                        <img src={p.images?.[0] || p.image_url} alt="" />
                      ) : (
                        <span>Chưa có ảnh</span>
                      )}
                    </div>
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

            {query.trim() && !isSearching && results.length === 0 && (
              <div className="gan-anh-hint">Không tìm thấy sản phẩm nào khớp "{query}".</div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                type="button"
                className="cart-remove"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                {showCreateForm ? "Ẩn form tạo mới" : "Không thấy — tạo sản phẩm mới"}
              </button>
              <button type="button" className="cart-remove" onClick={handleSkip} disabled={isBusy}>
                Bỏ qua ảnh này →
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreate} className="gan-anh-create-form">
                <label>Tên sản phẩm</label>
                <input name="name" defaultValue={query} required placeholder="Pin DLC iPhone 13" />

                <label>Giá bán (đ)</label>
                <input type="number" name="price" required min="0" placeholder="115000" />

                <label>Danh mục</label>
                <select name="category" required>
                  {categoryGroups.map((g) => (
                    <optgroup key={g.slug} label={g.name}>
                      {g.categories.map((c) => (
                        <option key={c.slug} value={c.slug} data-code={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <button type="submit" className="btn-primary" style={{ marginTop: 12 }} disabled={isBusy}>
                  {isBusy ? "Đang tạo..." : "Tạo & gắn ảnh"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>Nhật ký lô này:</p>
          <ul style={{ fontSize: 13, color: "var(--ink-soft)", maxHeight: 200, overflowY: "auto" }}>
            {log.map((l, i) => (
              <li key={i}>
                {l.status === "attached" && `✓ Gắn vào "${l.label}"`}
                {l.status === "created" && `✓ Tạo mới "${l.label}"`}
                {l.status === "skipped" && `— Bỏ qua`}
                {" "}({l.fileName})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
