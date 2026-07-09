-- Migration 005: tái cấu trúc danh mục thành 2 cấp (Linh kiện / Phụ kiện / Đồ nghề)
-- + cột "brand" (hãng) cho sản phẩm để lọc theo hãng điện thoại / hãng phụ kiện.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần,
-- kể cả khi trước đó đã chạy migration_004.

-- 1) Thêm cột "nhóm lớn" cho danh mục — không phá vỡ danh mục/sản phẩm cũ.
alter table categories add column if not exists group_slug text;

-- 2) Cập nhật nhóm cho các danh mục ĐÃ CÓ TỪ TRƯỚC (giữ nguyên slug để không vỡ link sản phẩm cũ).
update categories set group_slug = 'linh-kien' where slug in ('man-hinh', 'pin', 'camera', 'vo-khung');

-- "Cáp & Sạc" và "Loa & Tai nghe" cũ gộp chung nhiều thứ — nay đã tách thành các danh mục con
-- rõ ràng hơn bên dưới. 2 danh mục cũ này KHÔNG bị xoá (để sản phẩm cũ không mất danh mục),
-- chỉ đổi tên để nhắc bạn tự chuyển sản phẩm sang danh mục mới rồi xoá đi sau (ở /admin/categories,
-- nút Xoá sẽ tự chặn nếu danh mục còn sản phẩm — an toàn, không lo xoá nhầm).
update categories
set group_slug = 'phu-kien',
    name = 'Cáp & Sạc (cũ — chuyển sản phẩm sang Cóc sạc / Dây sạc rồi xoá)'
where slug = 'cap-sac';

update categories
set group_slug = 'phu-kien',
    name = 'Loa & Tai nghe (cũ — chuyển sản phẩm sang Tai nghe / Loa rồi xoá)'
where slug = 'loa-tai-nghe';

-- Nếu trước đó đã lỡ chạy migration_004 tạo danh mục "phu-kien" (Phụ kiện) chung chung — xoá nó đi
-- (an toàn: chỉ xoá khi danh mục đó CHƯA có sản phẩm nào), vì bên dưới đã có "phu-kien-khac" thay thế.
delete from categories
where slug = 'phu-kien'
  and not exists (select 1 from products where products.category = 'phu-kien');

-- 3) Nhóm LINH KIỆN — danh mục con
insert into categories (slug, code, name, group_slug) values
  ('cum-sac', 'LK-08', 'Cụm sạc', 'linh-kien'),
  ('chan-sac', 'LK-09', 'Chân sạc', 'linh-kien'),
  ('cap-noi-main', 'LK-10', 'Cáp nối main', 'linh-kien'),
  ('loa-chuong', 'LK-11', 'Loa - Chuông', 'linh-kien'),
  ('day-nut-nguon', 'LK-12', 'Dãy nút nguồn', 'linh-kien'),
  ('mat-lung', 'LK-13', 'Mặt lưng', 'linh-kien'),
  ('linh-kien-khac', 'LK-07', 'Linh kiện khác', 'linh-kien')
on conflict (slug) do update set
  code = excluded.code, name = excluded.name, group_slug = excluded.group_slug;

-- 4) Nhóm PHỤ KIỆN — danh mục con
insert into categories (slug, code, name, group_slug) values
  ('op-lung', 'PK-01', 'Ốp lưng', 'phu-kien'),
  ('coc-sac', 'PK-03', 'Cóc sạc', 'phu-kien'),
  ('day-sac', 'PK-04', 'Dây sạc', 'phu-kien'),
  ('sac-du-phong', 'PK-05', 'Sạc dự phòng', 'phu-kien'),
  ('tai-nghe', 'PK-06', 'Tai nghe', 'phu-kien'),
  ('loa', 'PK-07', 'Loa', 'phu-kien'),
  ('phu-kien-khac', 'PK-08', 'Phụ kiện khác (giá đỡ...)', 'phu-kien')
on conflict (slug) do update set
  code = excluded.code, name = excluded.name, group_slug = excluded.group_slug;

-- 5) Nhóm ĐỒ NGHỀ
insert into categories (slug, code, name, group_slug) values
  ('do-nghe', 'DC-01', 'Đồ nghề', 'do-nghe')
on conflict (slug) do update set
  code = excluded.code, name = excluded.name, group_slug = excluded.group_slug;

-- 6) Thêm cột "brand" (hãng) cho sản phẩm — dùng để lọc theo hãng điện thoại tương thích
--    (với linh kiện) hoặc hãng phụ kiện như Hoco, Baseus... (với phụ kiện).
alter table products add column if not exists brand text;
create index if not exists idx_products_brand on products (brand);
create index if not exists idx_categories_group on categories (group_slug);

notify pgrst, 'reload schema';
