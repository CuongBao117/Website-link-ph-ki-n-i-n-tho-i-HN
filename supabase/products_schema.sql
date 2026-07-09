-- Bảng danh mục
create table if not exists categories (
  slug text primary key,
  code text not null,
  name text not null
);

-- Bảng sản phẩm
create table if not exists products (
  slug text primary key,
  code text not null,
  name text not null,
  price integer not null,
  old_price integer,
  stock integer not null default 0,
  category text references categories(slug),
  variants jsonb not null default '[]',
  default_variant text,
  specs jsonb not null default '[]'
);

-- Bật bảo vệ dữ liệu (Row Level Security)
alter table categories enable row level security;
alter table products enable row level security;

-- Cho phép AI CŨNG được đọc (dữ liệu sản phẩm vốn công khai trên trang bán hàng)
-- Không có policy insert/update/delete công khai -> chỉ trang admin (dùng service_role key) mới sửa được
create policy "Public read categories" on categories for select using (true);
create policy "Public read products" on products for select using (true);

-- Dữ liệu mẫu ban đầu — bạn có thể xoá/sửa sau khi có sản phẩm thật qua trang admin
insert into categories (slug, code, name) values
  ('man-hinh', 'LK-01', 'Màn hình'),
  ('pin', 'LK-02', 'Pin'),
  ('camera', 'LK-03', 'Camera'),
  ('cap-sac', 'LK-04', 'Cáp & Sạc'),
  ('loa-tai-nghe', 'LK-05', 'Loa & Tai nghe'),
  ('vo-khung', 'LK-06', 'Vỏ & Khung')
on conflict (slug) do nothing;

insert into products (slug, code, name, price, old_price, stock, category, variants, default_variant, specs) values
(
  'man-hinh-iphone-12-zin-boc-may',
  'LK-IP12-SCR-004',
  'Màn hình iPhone 12 — Zin bóc máy, đã test 100%',
  890000, 1050000, 12,
  'man-hinh',
  '["iPhone 12","iPhone 12 Pro","iPhone 12 Pro Max","iPhone 12 Mini"]',
  'iPhone 12 Pro',
  '[["Loại hàng","Zin bóc máy, đã kiểm tra điểm ảnh & cảm ứng"],["Tương thích","iPhone 12 / 12 Pro"],["Công nghệ tấm nền","OLED, hỗ trợ True Tone & 3D Touch"],["Bảo hành","3 tháng 1 đổi 1 lỗi hiển thị / cảm ứng"],["Phụ kiện kèm theo","Bộ dụng cụ tháo máy cơ bản, keo dán màn hình"]]'
),
(
  'pin-samsung-s21-dung-luong-cao',
  'LK-SS-BAT-021',
  'Pin Samsung Galaxy S21 — Dung lượng cao',
  320000, null, 0,
  'pin',
  '["Galaxy S21","Galaxy S21+","Galaxy S21 Ultra"]',
  'Galaxy S21',
  '[["Loại hàng","Pin mới 100%, chip bảo vệ chống chai"],["Dung lượng","4500mAh (cao hơn 10% so với zin)"],["Bảo hành","6 tháng 1 đổi 1"]]'
),
(
  'loa-bluetooth-mini-ipx5',
  'PK-BLT-SPK-009',
  'Loa Bluetooth mini chống nước IPX5',
  259000, null, 25,
  'loa-tai-nghe',
  '["Đen","Trắng","Xanh"]',
  'Đen',
  '[["Kết nối","Bluetooth 5.3"],["Chống nước","IPX5"],["Pin sử dụng","Lên đến 8 giờ"],["Bảo hành","12 tháng"]]'
),
(
  'cap-sac-nhanh-typec-100w',
  'PK-CAP-TC-014',
  'Cáp sạc nhanh Type-C 100W bện dù',
  89000, null, 4,
  'cap-sac',
  '["1m","2m"]',
  '1m',
  '[["Công suất","Hỗ trợ sạc nhanh tới 100W"],["Chất liệu","Dây bện dù chống đứt gãy"],["Bảo hành","6 tháng"]]'
)
on conflict (slug) do nothing;
