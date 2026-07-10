// Phí vận chuyển đồng giá + ngưỡng miễn phí ship — dùng để HIỂN THỊ ước tính ở giỏ hàng/trang
// đặt hàng. Số tiền THẬT được tính lại ở server trong hàm place_order() (xem
// supabase/migration_009_shipping_fee.sql) — khách không thể sửa giá qua trình duyệt.
//
// LƯU Ý QUAN TRỌNG: 2 số dưới đây phải khớp với 2 hằng số trong place_order() (c_shipping_fee,
// c_free_ship_threshold). Nếu sau này đổi chính sách ship, phải sửa ở CẢ 2 nơi.
export const SHIPPING_FEE = 30000;
export const FREE_SHIP_THRESHOLD = 2000000;

export function calcShippingFee(subtotal) {
  return subtotal > FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
}
