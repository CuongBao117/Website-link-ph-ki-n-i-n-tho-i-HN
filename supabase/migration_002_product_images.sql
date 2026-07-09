-- Migration: thêm chức năng ảnh sản phẩm
-- Chạy file này trong Supabase Dashboard > SQL Editor (sau khi đã chạy products_schema.sql)
-- File này an toàn để chạy lại nhiều lần (idempotent) — không lo lỗi nếu đã chạy trước đó.

-- 1) Thêm cột lưu đường dẫn ảnh đại diện cho sản phẩm
alter table products add column if not exists image_url text;

-- 2) Tạo bucket lưu trữ ảnh sản phẩm (public = true để ảnh hiển thị trực tiếp ngoài trang web)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 3) Cho phép mọi người XEM ảnh trong bucket này (không có policy insert/update/delete công khai
--    -> chỉ trang admin, dùng SUPABASE_SERVICE_ROLE_KEY, mới tải/xoá ảnh được)
--    Bọc trong DO block để chạy lại nhiều lần không bị lỗi "policy already exists"
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public read product images'
  ) then
    create policy "Public read product images"
    on storage.objects for select
    using (bucket_id = 'product-images');
  end if;
end $$;

-- 4) Báo cho PostgREST nạp lại schema ngay lập tức (tránh lỗi "column not found in schema cache")
notify pgrst, 'reload schema';
