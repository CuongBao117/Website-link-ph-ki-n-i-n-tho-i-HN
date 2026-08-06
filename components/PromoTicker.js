const ITEMS = [
  "🚚 Miễn phí vận chuyển cho đơn từ 2.000.000đ",
  "🔧 Linh kiện chính hãng — bảo hành rõ ràng",
  "📞 Hotline / Zalo: 0357 105 530 — hỗ trợ 8:00–21:00 mỗi ngày",
  "💯 Giao hàng COD toàn quốc, kiểm tra kỹ trước khi nhận",
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
