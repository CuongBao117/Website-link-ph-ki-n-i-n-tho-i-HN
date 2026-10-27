-- Migration 020: Ưu tiên đưa sản phẩm đã có ảnh lên đầu trang web (trang chủ, danh mục, tìm kiếm)
-- Chạy file này trong Supabase Dashboard > SQL Editor.
-- File này an toàn để chạy lại nhiều lần (idempotent) — không lo lỗi nếu chạy nhiều lần.

-- 1) Thêm cột has_image (mặc định false)
alter table products add column if not exists has_image boolean not null default false;

-- 2) Cập nhật giá trị ban đầu cho các sản phẩm hiện có
-- Sản phẩm được tính là có ảnh nếu image_url không rỗng HOẶC mảng images có ít nhất 1 ảnh hợp lệ
update products
set has_image = (
  (image_url is not null and trim(image_url) <> '')
  or (
    images is not null
    and jsonb_typeof(images) = 'array'
    and jsonb_array_length(images) > 0
  )
);

-- 3) Tạo Index để truy vấn sắp xếp theo has_image siêu nhanh, không tốn tài nguyên
create index if not exists idx_products_has_image on products (has_image desc);

-- 4) Tạo trigger tự động cập nhật has_image mỗi khi thêm mới hoặc sửa sản phẩm
-- Nhờ trigger này, khi admin thêm ảnh mới cho sản phẩm (hoặc nhập từ Zalo/CSV),
-- sản phẩm đó sẽ tự động được gán has_image = true và đẩy lên đầu web.
create or replace function trg_update_product_has_image()
returns trigger as $$
begin
  new.has_image := (
    (new.image_url is not null and trim(new.image_url) <> '')
    or (
      new.images is not null
      and jsonb_typeof(new.images) = 'array'
      and jsonb_array_length(new.images) > 0
    )
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_product_has_image on products;
create trigger set_product_has_image
before insert or update on products
for each row execute function trg_update_product_has_image();

-- 5) Báo cho PostgREST nạp lại schema cache ngay lập tức
notify pgrst, 'reload schema';
