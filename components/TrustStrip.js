const items = [
  { code: "🚚", label: "Ship COD toàn quốc" },
  { code: "🛡️", label: "Bảo hành 1 đổi 1" },
  { code: "✅", label: "Kiểm tra trước khi giao" },
  { code: "↩️", label: "Đổi trả trong 7 ngày" },
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
