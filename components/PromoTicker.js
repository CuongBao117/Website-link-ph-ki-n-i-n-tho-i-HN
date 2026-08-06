// Topbar (Header.js) đã hiện cố định "Miễn phí vận chuyển từ 2.000.000đ" và "Hotline" — ticker
// này không lặp lại 2 thông điệp đó nữa (từng đứng ngay sát nhau, đọc trùng thông tin 2 lần liền
// trước khi thấy nội dung thật), chỉ thêm các thông điệp CHƯA có ở đâu khác trên trang.
const ITEMS = [
  "Chuyên sỉ linh phụ kiện điện thoại giá rẻ",
  "Giao hàng COD toàn quốc",
  "Kiểm tra trước khi nhận hàng",
  "Giá cả cạnh tranh — Bảo hành dài",
  "Tư vấn nhiệt tình qua Zalo/Hotline",
];

export default function PromoTicker() {
  // Lặp danh sách 2 lần để track cuộn liền mạch (khi nửa đầu trôi hết, nửa sau đã nối khít).
  const track = [...ITEMS, ...ITEMS];

  return (
    <div className="promo-ticker" role="region" aria-label="Thông tin khuyến mãi">
      <div className="promo-ticker__track">
        {track.map((text, i) => (
          <span className="promo-ticker__item" key={i}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
