-- Migration 007: tái cấu trúc danh mục con theo đúng menu 4 nhóm mới
-- (Linh kiện / Phụ kiện / Đồ nghề sửa chữa / Đồ chơi công nghệ).
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.
--
-- NGUYÊN TẮC: KHÔNG xoá thẳng danh mục nào có thể đã có sản phẩm — chỉ đổi tên/đổi
-- nhóm cho các danh mục có sẵn khớp nghĩa, thêm mới danh mục chưa có, và với các danh
-- mục KHÔNG còn nằm trong menu mới (sạc dự phòng, phụ kiện khác, dãy nút nguồn, các
-- danh mục "cũ" từ migration 005) thì: xoá nếu đang trống, còn nếu đã có sản phẩm thì
-- chỉ gỡ khỏi menu (group_slug = null) để bạn tự xử lý tiếp trong /admin/categories.

-- ========== 1) NHÓM LINH KIỆN (11 danh mục con) ==========
update categories set name = 'Cáp'        where slug = 'cap-noi-main';
update categories set name = 'Cụm sạc'    where slug = 'cum-sac';
update categories set name = 'Lưng máy'   where slug = 'mat-lung';
update categories set name = 'Vỏ máy'     where slug = 'vo-khung';
update categories set name = 'Pin máy'    where slug = 'pin';
update categories set name = 'Loa'        where slug = 'loa-chuong';
-- man-hinh (Màn hình), camera (Camera), chan-sac (Chân sạc), linh-kien-khac (Linh kiện khác) giữ nguyên tên.

-- "Dãy nút nguồn" không còn trong danh sách mới -> thay bằng "Mic".
insert into categories (slug, code, name, group_slug) values
  ('mic', 'LK-14', 'Mic', 'linh-kien')
on conflict (slug) do update set name = excluded.name, group_slug = excluded.group_slug;

delete from categories
where slug = 'day-nut-nguon'
  and not exists (select 1 from products where products.category = 'day-nut-nguon');
update categories set group_slug = null where slug = 'day-nut-nguon'; -- vẫn còn sản phẩm -> gỡ khỏi menu, không xoá

-- ========== 2) NHÓM PHỤ KIỆN (8 danh mục con) ==========
update categories set name = 'Cáp sạc'  where slug = 'day-sac';
update categories set name = 'Củ sạc'   where slug = 'coc-sac';
-- op-lung (Ốp lưng), loa (Loa) giữ nguyên tên.

-- "Tai nghe" cũ (gộp chung) -> đổi thành "Tai nghe dây", thêm mới "Tai nghe Bluetooth".
update categories set name = 'Tai nghe dây' where slug = 'tai-nghe';

insert into categories (slug, code, name, group_slug) values
  ('cuong-luc', 'PK-09', 'Cường lực', 'phu-kien'),
  ('bo-sac', 'PK-10', 'Bộ sạc', 'phu-kien'),
  ('tai-nghe-bluetooth', 'PK-11', 'Tai nghe Bluetooth', 'phu-kien')
on conflict (slug) do update set
  code = excluded.code, name = excluded.name, group_slug = excluded.group_slug;

-- "Sạc dự phòng" và "Phụ kiện khác" không còn trong danh sách mới -> gỡ khỏi menu nếu còn sản phẩm.
delete from categories
where slug = 'sac-du-phong'
  and not exists (select 1 from products where products.category = 'sac-du-phong');
update categories set group_slug = null where slug = 'sac-du-phong';

delete from categories
where slug = 'phu-kien-khac'
  and not exists (select 1 from products where products.category = 'phu-kien-khac');
update categories set group_slug = null where slug = 'phu-kien-khac';

-- Dọn luôn 2 danh mục "cũ" còn sót từ migration 005 (cap-sac, loa-tai-nghe) nếu vẫn còn.
delete from categories
where slug = 'cap-sac'
  and not exists (select 1 from products where products.category = 'cap-sac');
update categories set group_slug = null where slug = 'cap-sac';

delete from categories
where slug = 'loa-tai-nghe'
  and not exists (select 1 from products where products.category = 'loa-tai-nghe');
update categories set group_slug = null where slug = 'loa-tai-nghe';

-- ========== 3) NHÓM "ĐỒ CHƠI CÔNG NGHỆ" ==========
-- Đây là nhóm hoàn toàn mới, chưa có danh mục con nào. Nhóm sẽ tự xuất hiện trên mega
-- menu ngay khi bạn thêm danh mục đầu tiên có "Thuộc nhóm lớn" = Đồ chơi công nghệ
-- tại /admin/categories/new (không cần chạy thêm SQL cho bước này).

notify pgrst, 'reload schema';
