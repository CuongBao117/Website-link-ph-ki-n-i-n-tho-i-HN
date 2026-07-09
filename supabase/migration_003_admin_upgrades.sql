-- Migration 003: nâng cấp trang admin
-- Chạy trong Supabase Dashboard > SQL Editor, SAU khi đã chạy products_schema.sql
-- và migration_002_product_images.sql. File này an toàn để chạy lại nhiều lần.

-- 1) Cho phép sản phẩm có NHIỀU ảnh (mảng URL), giữ image_url làm "ảnh đại diện" (= ảnh đầu tiên)
--    để không phải sửa lại những chỗ code cũ đang dùng image_url.
alter table products add column if not exists images jsonb not null default '[]';

-- Chuyển dữ liệu ảnh cũ (1 ảnh) sang mảng images, nếu chưa có
update products
set images = jsonb_build_array(image_url)
where image_url is not null
  and (images is null or images = '[]'::jsonb);

-- 2) Đảm bảo bảng orders tồn tại với đúng cấu trúc đang được code sử dụng.
--    "if not exists" nên sẽ KHÔNG đụng vào bảng orders nếu bạn đã tạo từ trước.
create table if not exists orders (
  id bigint generated always as identity primary key,
  order_code text not null,
  customer_name text not null,
  phone_number text not null,
  address text not null,
  note text,
  total_price numeric not null default 0,
  cart_items jsonb not null default '[]',
  status text not null default 'Chờ xác nhận',
  created_at timestamptz not null default now()
);

alter table orders enable row level security;

-- Khách hàng (dùng anon key) chỉ được TẠO đơn hàng mới, không được xem/sửa/xoá đơn hàng
-- của bất kỳ ai (kể cả đơn của chính họ) qua API công khai — chỉ trang admin (service_role) đọc được.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders'
      and policyname = 'Public insert orders'
  ) then
    create policy "Public insert orders" on orders for insert with check (true);
  end if;
end $$;

-- Nếu trước đây lỡ tạo policy cho phép đọc công khai bảng orders, xoá đi để tránh lộ
-- tên/SĐT/địa chỉ khách hàng qua anon key. Bỏ qua an toàn nếu policy không tồn tại.
drop policy if exists "Public read orders" on orders;
drop policy if exists "Enable read access for all users" on orders;

-- 3) Index phục vụ tìm kiếm & phân trang cho nhanh khi dữ liệu nhiều lên
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_products_category on products (category);

-- 4) Báo cho PostgREST nạp lại schema ngay (tránh lỗi "column not found in schema cache")
notify pgrst, 'reload schema';
