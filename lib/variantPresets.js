// Các bộ "dòng máy tương thích" hay lặp lại giữa nhiều sản phẩm (đặc biệt ốp lưng, cường lực,
// thường dùng chung 1 bảng mã máy cho hàng chục sản phẩm khác nhau) — chọn 1 bộ có sẵn ở đây
// thay vì gõ lại danh sách dài mỗi lần nhập từ bài đăng Zalo.
//
// ⚠️ Đây là danh sách KHỞI ĐIỂM, mình gõ dựa trên các dòng máy phổ biến — CHƯA đối chiếu với
// bảng mã cụ thể trong ảnh chụp bài đăng của bạn (chữ trong ảnh quá nhỏ để đọc chính xác 100%).
// Trước khi dùng thật, mở lại ảnh gốc và sửa/bổ sung cho khớp — chỉ cần sửa 1 lần ở đây,
// mọi lượt nhập sau tự động dùng đúng danh sách đã sửa.
export const VARIANT_PRESETS = [
  {
    label: "iPhone 11 → 17 (đủ bản thường/Pro/ProMax)",
    variants: [
      "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
      "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max", "iPhone 12 Mini",
      "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max", "iPhone 13 Mini",
      "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
      "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
      "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
      "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max",
    ],
  },
  {
    label: "iPhone 12 → 17 (dòng có từ tính / MagSafe)",
    variants: [
      "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
      "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
      "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
      "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
      "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
      "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max",
    ],
  },
  {
    label: "Samsung Galaxy S21 → S25 (đủ bản thường/+/Ultra)",
    variants: [
      "Galaxy S21", "Galaxy S21+", "Galaxy S21 Ultra",
      "Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra",
      "Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra",
      "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra",
      "Galaxy S25", "Galaxy S25+", "Galaxy S25 Ultra",
    ],
  },
  {
    label: "Samsung Galaxy A-series phổ biến (A03 → A55)",
    variants: [
      "Galaxy A03", "Galaxy A04", "Galaxy A05", "Galaxy A05s",
      "Galaxy A13", "Galaxy A14", "Galaxy A15", "Galaxy A23",
      "Galaxy A24", "Galaxy A25", "Galaxy A33", "Galaxy A34",
      "Galaxy A35", "Galaxy A53", "Galaxy A54", "Galaxy A55",
    ],
  },
  {
    label: "Xiaomi Redmi Note phổ biến (Note 10 → 13)",
    variants: [
      "Redmi Note 10", "Redmi Note 10 Pro",
      "Redmi Note 11", "Redmi Note 11 Pro",
      "Redmi Note 12", "Redmi Note 12 Pro",
      "Redmi Note 13", "Redmi Note 13 Pro",
    ],
  },
];
