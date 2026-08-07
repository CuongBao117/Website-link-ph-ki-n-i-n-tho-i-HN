-- Migration 018: thêm cột "updated_at" cho sản phẩm, tự động cập nhật MỖI LẦN sửa (kể cả sửa
-- 1 phần như attachZaloPhotos chỉ đổi ảnh/giá) — dùng để sắp "sửa gần đây nhất lên đầu" ở trang
-- /admin/products/duyet-anh. "created_at" (migration_014) KHÔNG dùng được cho việc này vì chỉ
-- ghi lúc TẠO sản phẩm — sản phẩm cũ bị Nhập từ bài đăng Zalo lỡ gắn nhầm ảnh vào (UPDATE, không
-- phải INSERT) vẫn giữ nguyên created_at cũ, không nổi lên đầu danh sách cần rà soát.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.

alter table products
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row
  execute function public.set_products_updated_at();

create index if not exists idx_products_updated_at on products (updated_at desc);

notify pgrst, 'reload schema';
