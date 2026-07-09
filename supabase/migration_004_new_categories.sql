-- Migration 004: thêm danh mục mới, giữ nguyên toàn bộ danh mục gốc và sản phẩm cũ.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.

insert into categories (slug, code, name) values
  ('op-lung', 'PK-01', 'Ốp lưng'),
  ('phu-kien', 'PK-02', 'Phụ kiện'),
  ('do-nghe', 'DC-01', 'Đồ nghề'),
  ('linh-kien-khac', 'LK-07', 'Linh kiện khác')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
