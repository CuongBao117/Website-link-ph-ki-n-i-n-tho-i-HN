-- Migration 010: đăng nhập khách hàng (email + mật khẩu, dùng Supabase Auth có sẵn).
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.
--
-- Trước khi chạy, nhớ VÀO Authentication > Providers > Email trong Supabase Dashboard,
-- kiểm tra "Confirm email":
--   - BẬT (mặc định): khách đăng ký xong phải bấm link trong email mới đăng nhập được.
--   - TẮT: đăng ký xong đăng nhập được luôn, không cần xác nhận email (đơn giản hơn cho
--     khách nhưng ai cũng đăng ký được bằng email bất kỳ, kể cả email không có thật).

-- 1) Thêm cột user_id — liên kết đơn hàng với tài khoản khách hàng (bảng auth.users có sẵn
--    của Supabase Auth, không cần tự tạo bảng users). Cho phép null vì các đơn hàng CŨ (đặt
--    trước khi có đăng nhập) không gắn với tài khoản nào.
alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_orders_user_id on orders (user_id);

-- 2) Cập nhật place_order() — nhận thêm p_user_id (lấy từ phiên đăng nhập ở SERVER, khách
--    không tự gửi lên được) và lưu vào đơn hàng.
create or replace function place_order(
  p_items jsonb,
  p_customer_name text,
  p_phone_number text,
  p_address text,
  p_note text,
  p_user_id uuid default null
)
returns table (
  out_order_id bigint,
  out_order_code text,
  out_subtotal numeric,
  out_shipping_fee numeric,
  out_total_price numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_slug text;
  v_variant text;
  v_qty integer;
  v_product products%rowtype;
  v_subtotal numeric := 0;
  v_shipping_fee numeric := 0;
  v_total numeric := 0;
  v_line_items jsonb := '[]'::jsonb;
  v_order_code text;
  v_order_id bigint;
  c_shipping_fee constant numeric := 30000;
  c_free_ship_threshold constant numeric := 2000000;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_phone_number), '') = ''
     or coalesce(trim(p_address), '') = '' then
    raise exception 'MISSING_CUSTOMER_INFO';
  end if;

  perform 1
  from products
  where slug in (select elem ->> 'slug' from jsonb_array_elements(p_items) as elem)
  order by slug
  for update;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_slug := v_item ->> 'slug';
    v_variant := v_item ->> 'variant';
    v_qty := greatest(1, coalesce((v_item ->> 'qty')::integer, 1));

    select * into v_product from products where slug = v_slug;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND' using detail = v_slug;
    end if;

    if v_product.stock < v_qty then
      raise exception 'OUT_OF_STOCK' using detail = jsonb_build_object(
        'slug', v_product.slug, 'name', v_product.name, 'stock', v_product.stock
      )::text;
    end if;

    update products set stock = stock - v_qty where slug = v_slug;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
    v_line_items := v_line_items || jsonb_build_object(
      'slug', v_product.slug,
      'name', v_product.name,
      'code', v_product.code,
      'variant', v_variant,
      'price', v_product.price,
      'qty', v_qty
    );
  end loop;

  v_shipping_fee := case when v_subtotal > c_free_ship_threshold then 0 else c_shipping_fee end;
  v_total := v_subtotal + v_shipping_fee;

  v_order_code := 'DH' || to_char(now(), 'YYMMDDHH24MISS');

  insert into orders (order_code, customer_name, phone_number, address, note, total_price, shipping_fee, cart_items, status, user_id)
  values (
    v_order_code, trim(p_customer_name), trim(p_phone_number), trim(p_address),
    nullif(trim(coalesce(p_note, '')), ''), v_total, v_shipping_fee, v_line_items, 'Chờ xác nhận', p_user_id
  )
  returning id into v_order_id;

  return query select v_order_id, v_order_code, v_subtotal, v_shipping_fee, v_total;
end;
$$;

-- 3) Cho phép khách ĐÃ ĐĂNG NHẬP tự xem đơn hàng của chính mình (phòng khi sau này có chỗ
--    đọc bằng anon key thay vì service_role key). Trang "Đơn hàng của tôi" hiện tại vẫn dùng
--    service_role key + tự lọc theo user_id ở Server Action, nên policy này chỉ là lớp an
--    toàn bổ sung, không phải điều kiện bắt buộc để trang đó hoạt động.
drop policy if exists "Customers can view own orders" on orders;
create policy "Customers can view own orders" on orders
  for select
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
