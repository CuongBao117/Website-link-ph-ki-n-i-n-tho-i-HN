-- Migration 011: dọn nền tảng danh mục cho trang quản trị.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.
--
-- Vấn đề đang sửa:
-- 1) "4 nhóm lớn" (Linh kiện/Phụ kiện/Đồ nghề/Đồ chơi công nghệ) trước đây bị hardcode
--    ở 3 nơi trong code (MegaMenu.js, CategoryForm.js, data/products.js) — giờ chuyển
--    thành 1 bảng thật trong DB, code chỉ đọc từ đây.
-- 2) Thứ tự hiển thị danh mục trước đây dựa vào cách đặt chuỗi "code" (LK-01, LK-02...)
--    — giờ có cột display_order riêng, chỉnh số là đổi thứ tự, không phải sửa code nữa.

-- 1) Bảng nhóm danh mục lớn
create table if not exists category_groups (
  slug text primary key,
  name text not null,
  display_order integer not null default 0
);

insert into category_groups (slug, name, display_order) values
  ('linh-kien', 'Linh kiện', 1),
  ('phu-kien', 'Phụ kiện', 2),
  ('do-nghe', 'Đồ nghề sửa chữa', 3),
  ('do-choi-cong-nghe', 'Đồ chơi công nghệ', 4)
on conflict (slug) do update set
  name = excluded.name, display_order = excluded.display_order;

-- 2) Cột thứ tự hiển thị cho danh mục con
alter table categories add column if not exists display_order integer not null default 0;

-- Backfill thứ tự ban đầu = thứ tự "code" hiện tại (giữ nguyên menu y như đang thấy,
-- không bị xáo trộn khi chuyển đổi) — chỉ chạy khi display_order còn đang mặc định 0 hết,
-- tránh ghi đè nếu bro đã tự chỉnh tay display_order rồi chạy lại file này.
do $$
begin
  if (select count(*) from categories where display_order <> 0) = 0 then
    with ranked as (
      select slug, row_number() over (partition by group_slug order by code) as rn
      from categories
    )
    update categories c set display_order = ranked.rn
    from ranked
    where c.slug = ranked.slug;
  end if;
end $$;

-- 3) Ràng buộc group_slug phải là 1 nhóm có thật (hoặc NULL với danh mục "mồ côi" đã gỡ khỏi menu)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_group_slug_fkey'
  ) then
    alter table categories
      add constraint categories_group_slug_fkey
      foreign key (group_slug) references category_groups(slug);
  end if;
end $$;

create index if not exists idx_categories_group_order on categories (group_slug, display_order);

notify pgrst, 'reload schema';
