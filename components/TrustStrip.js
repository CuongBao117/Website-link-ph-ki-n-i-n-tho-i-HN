const items = [
  "Ship COD toàn quốc",
  "Bảo hành 1 đổi 1",
  "Kiểm tra trước khi giao",
  "Đổi trả trong 7 ngày",
];

export default function TrustStrip() {
  return (
    <div className="trust-strip">
      {items.map((label) => (
        <div key={label}>
          <span className="label">{label}</span>
        </div>
      ))}
    </div>
  );
}
