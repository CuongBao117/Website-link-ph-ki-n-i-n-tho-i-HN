const items = [
  { code: "01", label: "Ship COD toàn quốc" },
  { code: "02", label: "Bảo hành 1 đổi 1" },
  { code: "03", label: "Kiểm tra trước khi giao" },
  { code: "04", label: "Đổi trả trong 7 ngày" },
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
