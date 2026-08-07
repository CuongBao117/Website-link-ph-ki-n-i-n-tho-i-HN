"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { parseProductsCsv, commitProductsCsv } from "@/app/admin/(protected)/products/import/actions";
import SuccessModal from "@/components/SuccessModal";

const COLUMNS = [
  { name: "name", required: true, example: "Màn hình iPhone 13 — Zin bóc máy" },
  { name: "code", required: true, example: "LK-IP13-SCR-001" },
  { name: "category", required: true, example: "man-hinh (đúng slug trong /admin/categories)" },
  { name: "price", required: true, example: "890000" },
  { name: "slug", required: false, example: "Để trống sẽ tự tạo từ tên" },
  { name: "old_price", required: false, example: "1050000" },
  { name: "brand", required: false, example: "iPhone" },
  { name: "variants", required: false, example: "iPhone 13, iPhone 13 Pro" },
  { name: "default_variant", required: false, example: "iPhone 13" },
  { name: "specs", required: false, example: "Bảo hành:3 tháng;Loại hàng:Zin bóc máy" },
  { name: "images", required: false, example: "https://.../a.jpg, https://.../b.jpg" },
];

const PREVIEW_LIMIT = 50;

function formatPrice(value) {
  if (value === null || value === undefined) return "";
  return Number(value).toLocaleString("vi-VN") + "đ";
}

export default function ImportProductsForm() {
  const [preview, setPreview] = useState(null); // { rows, totalRows, skippedCount, rowErrors }
  const [commitResult, setCommitResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleParseSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPreview(null);
    setCommitResult(null);
    startTransition(async () => {
      const res = await parseProductsCsv(formData);
      if (res.error) {
        setCommitResult(res);
      } else {
        setPreview(res);
      }
    });
  }

  function handleCommit() {
    if (!preview?.rows?.length) return;
    startTransition(async () => {
      const res = await commitProductsCsv(preview.rows);
      setCommitResult({ ...res, skippedCount: preview.skippedCount, rowErrors: preview.rowErrors });
      setPreview(null);
    });
  }

  function handleCancel() {
    setPreview(null);
  }

  return (
    <main>
      <div className="section-head">
        <h2>Quản trị — Nhập hàng loạt</h2>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/products" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          ← Quay lại danh sách sản phẩm
        </Link>
      </div>

      {!preview && (
        <div className="empty-state" style={{ textAlign: "left", marginBottom: 24 }}>
          <p style={{ marginTop: 0, fontWeight: 600 }}>Định dạng file CSV cần có:</p>
          <p>
            Dòng đầu tiên là tên cột (không phân biệt hoa/thường). Excel: mở file, chọn{" "}
            <b>Tệp → Lưu dưới dạng → CSV UTF-8 (.csv)</b>.
          </p>
          <table className="cart-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Cột</th>
                <th>Bắt buộc</th>
                <th>Ví dụ</th>
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map((c) => (
                <tr key={c.name}>
                  <td className="prod-code">{c.name}</td>
                  <td>{c.required ? "Có" : "Không"}</td>
                  <td>{c.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginBottom: 0 }}>
            Chưa có ảnh cũng nhập được — bổ sung ảnh sau qua trang sửa từng sản phẩm. Nếu sản phẩm đã tồn tại
            (trùng slug), nhập lại sẽ <b>cập nhật</b> sản phẩm đó thay vì báo lỗi trùng — nên có thể chia file
            lớn ra nhập nhiều lần, hoặc nhập lại để sửa dữ liệu. File sẽ được <b>xem lại trước</b>, chưa lưu
            vào hệ thống ngay.
          </p>
        </div>
      )}

      {!preview && (
        <form onSubmit={handleParseSubmit} className="checkout-form" style={{ maxWidth: 480 }}>
          <label>Chọn file CSV</label>
          <input
            type="file"
            name="csvFile"
            accept=".csv,text/csv"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
          <button type="submit" className="btn-primary" style={{ marginTop: 16 }} disabled={isPending}>
            {isPending ? "Đang phân tích..." : "Phân tích file"}
          </button>
        </form>
      )}

      {isPending && (
        <div className="empty-state" style={{ marginTop: 20 }}>
          Đang xử lý{fileName ? ` "${fileName}"` : ""} — với file vài nghìn dòng có thể mất khoảng 1 phút,
          đừng tắt hay tải lại trang.
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 8 }}>
          <div className="empty-state" style={{ textAlign: "left", borderColor: "var(--teal)" }}>
            <p style={{ fontWeight: 700, color: "var(--teal)", marginTop: 0 }}>
              Đã phân tích {preview.rows.length}/{preview.totalRows} dòng hợp lệ
              {preview.skippedCount > 0 ? `, bỏ qua ${preview.skippedCount} dòng lỗi.` : "."} — xem lại kỹ
              trước khi lưu, đặc biệt là <b>giá bán</b> và <b>ảnh</b>.
            </p>

            {preview.rowErrors?.length > 0 && (
              <>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Dòng bị bỏ qua (tối đa 80 dòng đầu):</p>
                <ul style={{ maxHeight: 160, overflowY: "auto", marginBottom: 0 }}>
                  {preview.rowErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <p style={{ fontWeight: 600, fontSize: 13.5, margin: "18px 0 10px" }}>
            Xem trước {Math.min(preview.rows.length, PREVIEW_LIMIT)}/{preview.rows.length} sản phẩm sẽ được
            lưu:
          </p>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            <table className="cart-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, PREVIEW_LIMIT).map((r) => (
                  <tr key={r.slug}>
                    <td>
                      <div className="admin-thumb">
                        {r.images?.[0] ? (
                          <img src={r.images[0]} alt="" />
                        ) : (
                          <span className="admin-thumb-empty">Chưa có ảnh</span>
                        )}
                      </div>
                    </td>
                    <td>{r.name}</td>
                    <td className="prod-code">{r.category}</td>
                    <td>{formatPrice(r.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > PREVIEW_LIMIT && (
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8 }}>
              ... và {preview.rows.length - PREVIEW_LIMIT} dòng khác không hiện ở đây (vẫn sẽ được lưu đầy đủ
              khi bấm xác nhận).
            </p>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button type="button" className="btn-primary" onClick={handleCommit} disabled={isPending}>
              {isPending ? "Đang lưu..." : `Xác nhận lưu ${preview.rows.length} sản phẩm`}
            </button>
            <button type="button" className="cart-remove" onClick={handleCancel} disabled={isPending}>
              Huỷ, chọn file khác
            </button>
          </div>
        </div>
      )}

      <SuccessModal
        open={!!commitResult}
        success={commitResult?.success}
        title={commitResult?.success ? "Hoàn tất! ✓" : "Có lỗi xảy ra"}
        onClose={() => setCommitResult(null)}
      >
        {commitResult?.error ? (
          <p style={{ color: "#B0503A", fontWeight: 600, margin: 0 }}>{commitResult.error}</p>
        ) : (
          <p style={{ fontWeight: 600, color: commitResult?.success ? "var(--teal)" : "#B0503A", margin: 0 }}>
            Đã lưu {commitResult?.insertedCount} sản phẩm thành công.
          </p>
        )}

        {commitResult?.batchErrors?.length > 0 && (
          <>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Lỗi khi ghi vào cơ sở dữ liệu:</p>
            <ul>
              {commitResult.batchErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </>
        )}
      </SuccessModal>
    </main>
  );
}
