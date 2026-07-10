"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { importProductsFromCsv } from "@/app/admin/(protected)/products/import/actions";

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

export default function ImportProductsForm() {
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(null);
    startTransition(async () => {
      const res = await importProductsFromCsv(formData);
      setResult(res);
    });
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
          lớn ra nhập nhiều lần, hoặc nhập lại để sửa dữ liệu.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="checkout-form" style={{ maxWidth: 480 }}>
        <label>Chọn file CSV</label>
        <input
          type="file"
          name="csvFile"
          accept=".csv,text/csv"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
        />
        <button type="submit" className="btn-primary" style={{ marginTop: 16 }} disabled={isPending}>
          {isPending ? "Đang nhập..." : "Nhập sản phẩm"}
        </button>
      </form>

      {isPending && (
        <div className="empty-state" style={{ marginTop: 20 }}>
          Đang xử lý{fileName ? ` "${fileName}"` : ""} — với file vài nghìn dòng có thể mất khoảng 1 phút,
          đừng tắt hay tải lại trang.
        </div>
      )}

      {result && (
        <div
          className="empty-state"
          style={{ marginTop: 20, textAlign: "left", borderColor: result.success ? "var(--teal)" : "#B0503A" }}
        >
          {result.error ? (
            <p style={{ color: "#B0503A", fontWeight: 600 }}>{result.error}</p>
          ) : (
            <p style={{ fontWeight: 600, color: result.success ? "var(--teal)" : "#B0503A" }}>
              Đã nhập {result.insertedCount}/{result.totalRows} dòng thành công
              {result.skippedCount > 0 ? `, bỏ qua ${result.skippedCount} dòng lỗi.` : "."}
            </p>
          )}

          {result.batchErrors?.length > 0 && (
            <>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Lỗi khi ghi vào cơ sở dữ liệu:</p>
              <ul>
                {result.batchErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          )}

          {result.rowErrors?.length > 0 && (
            <>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Chi tiết dòng bị bỏ qua (tối đa 80 dòng đầu):</p>
              <ul style={{ maxHeight: 240, overflowY: "auto" }}>
                {result.rowErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </main>
  );
}
