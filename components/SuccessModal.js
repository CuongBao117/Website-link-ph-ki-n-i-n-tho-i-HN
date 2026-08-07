"use client";

// Modal "Hoàn tất" dùng chung cho các luồng thêm sản phẩm/ảnh ở trang admin (Nhập nhanh, Nhập
// CSV, Gán ảnh, Nhập từ Zalo, Thêm/sửa sản phẩm...) — bắt buộc bấm OK mới đóng, để admin luôn
// biết chắc thao tác đã xong, không lướt qua mất 1 dòng chữ thông báo nằm lẫn trong trang.
export default function SuccessModal({ open, success = true, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        className="empty-state"
        style={{
          textAlign: "left",
          borderColor: success ? "var(--teal)" : "#B0503A",
          background: "var(--bg, #fff)",
          maxWidth: 480,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <p style={{ fontWeight: 700, color: success ? "var(--teal)" : "#B0503A", margin: "0 0 10px", fontSize: 17 }}>
          {title || (success ? "Hoàn tất! ✓" : "Có lỗi xảy ra")}
        </p>
        {children}
        <button type="button" className="btn-primary" style={{ marginTop: 16 }} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
