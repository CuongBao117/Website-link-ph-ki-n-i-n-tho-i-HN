const items = [
  { code: "01", label: "Bảo hành 3–6 tháng" },
  { code: "02", label: "Kiểm tra trước khi giao" },
  { code: "03", label: "Đổi trả trong 7 ngày" },
  { code: "04", label: "COD toàn quốc" },
];

export default function TrustStrip() {
  return (
    <div className="trust-strip">
      {items.map((item) => (
        <div key={item.code}>
          <span className="code">{item.code}</span>
          <span className="label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
