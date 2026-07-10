-- Migration 008: sửa lại chính xác tên hiển thị danh mục con theo đúng mô tả gần nhất,
-- và thêm lại "Sạc dự phòng" vào nhóm Phụ kiện (migration 007 đã lỡ gỡ nhầm).
-- Chạy trong Supabase Dashboard > SQL Editor. AN TOÀN để chạy lại nhiều lần, và KHÔNG phụ
-- thuộc việc bạn đã chạy migration_007 hay chưa — file này tự đảm bảo đúng trạng thái cuối cùng.
--
-- Toàn bộ 20 danh mục con dưới đây dùng UPSERT (ghi đè đúng tên/mã/nhóm) nên dù danh mục đã
-- tồn tại (tên cũ/sai) hay chưa tồn tại, chạy xong đều ra đúng kết quả — không tạo trùng.

-- ========== NHÓM LINH KIỆN (11 danh mục con) ==========
insert into categories (slug, code, name, group_slug) values
  ('man-hinh',       'LK-01', 'Màn hình',        'linh-kien'),
  ('pin',            'LK-02', 'Pin máy',         'linh-kien'),
  ('camera',         'LK-03', 'Camera',          'linh-kien'),
  ('vo-khung',       'LK-06', 'Vỏ máy',          'linh-kien'),
  ('linh-kien-khac', 'LK-07', 'Linh kiện khác',  'linh-kien'),
  ('cum-sac',        'LK-08', 'Cụm',             'linh-kien'),
  ('chan-sac',       'LK-09', 'Chân sạc',        'linh-kien'),
  ('cap-noi-main',   'LK-10', 'Cáp',             'linh-kien'),
  ('loa-chuong',     'LK-11', 'Loa',             'linh-kien'),
  ('mat-lung',       'LK-13', 'Lưng máy',        'linh-kien'),
  ('mic',            'LK-14', 'Mic',             'linh-kien')
on conflict (slug) do update set
  code = excluded.code, name = excluded.name, group_slug = excluded.group_slug;

-- ========== NHÓM PHỤ KIỆN (9 danh mục con) ==========
insert into categories (slug, code, name, group_slug) values
  ('op-lung',            'PK-01', 'Ốp lưng',            'phu-kien'),
  ('coc-sac',            'PK-03', 'Củ sạc',             'phu-kien'),
  ('day-sac',            'PK-04', 'Cáp sạc',            'phu-kien'),
  ('sac-du-phong',       'PK-05', 'Sạc dự phòng',       'phu-kien'),
  ('tai-nghe',           'PK-06', 'Tai nghe dây',       'phu-kien'),
  ('loa',                'PK-07', 'Loa',                'phu-kien'),
  ('cuong-luc',          'PK-09', 'Cường lực',          'phu-kien'),
  ('bo-sac',             'PK-10', 'Bộ sạc',             'phu-kien'),
  ('tai-nghe-bluetooth', 'PK-11', 'Tai nghe Bluetooth', 'phu-kien')
on conflict (slug) do update set
  code = excluded.code, name = excluded.name, group_slug = excluded.group_slug;

-- ========== Dọn các danh mục KHÔNG có trong danh sách trên ==========
-- (day-nut-nguon, phu-kien-khac, và 2 danh mục "cũ" cap-sac/loa-tai-nghe từ migration 005).
-- Xoá nếu đang trống, còn nếu đã có sản phẩm thì chỉ gỡ khỏi menu (group_slug = null) —
-- không xoá dữ liệu, bạn tự xử lý tiếp trong /admin/categories nếu cần.
do $$
declare
  s text;
begin
  foreach s in array array['day-nut-nguon', 'phu-kien-khac', 'cap-sac', 'loa-tai-nghe']
  loop
    if not exists (select 1 from products where products.category = s) then
      delete from categories where slug = s;
    else
      update categories set group_slug = null where slug = s;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
