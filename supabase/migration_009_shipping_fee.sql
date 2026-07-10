-- Migration 009: thêm phí vận chuyển đồng giá 30.000đ, MIỄN PHÍ khi tạm tính đơn hàng (chưa gồm
-- ship) trên 2.000.000đ. Đồng thời khoá lại lỗ hổng: trang /dat-hang bản cũ chèn đơn hàng THẲNG
-- từ trình duyệt (giá lấy từ giỏ hàng trong localStorage của khách, không qua kiểm tra) — khách
-- có thể sửa giá qua DevTools trước khi đặt. Từ bản code đi kèm, /dat-hang chuyển hẳn sang gọi
-- place_order() — hàm này LUÔN tính lại giá + phí ship từ dữ liệu thật trong database.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.

alter table orders add column if not exists shipping_fee numeric not null default 0;

create or replace function place_order(
  p_items jsonb,           -- [{ "slug": "...", "variant": "...", "qty": 2 }, ...]
  p_customer_name text,
  p_phone_number text,
  p_address text,
  p_note text
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

  -- Phí ship đồng giá, miễn phí nếu TẠM TÍNH (chưa gồm ship) vượt ngưỡng.
  v_shipping_fee := case when v_subtotal > c_free_ship_threshold then 0 else c_shipping_fee end;
  v_total := v_subtotal + v_shipping_fee;

  v_order_code := 'DH' || to_char(now(), 'YYMMDDHH24MISS');

  insert into orders (order_code, customer_name, phone_number, address, note, total_price, shipping_fee, cart_items, status)
  values (
    v_order_code, trim(p_customer_name), trim(p_phone_number), trim(p_address),
    nullif(trim(coalesce(p_note, '')), ''), v_total, v_shipping_fee, v_line_items, 'Chờ xác nhận'
  )
  returning id into v_order_id;

  return query select v_order_id, v_order_code, v_subtotal, v_shipping_fee, v_total;
end;
$$;

-- Khoá lại đường chèn đơn hàng trực tiếp qua anon key — phòng trường hợp trước đây
-- migration_006 chưa từng được chạy (nên policy này có thể vẫn còn tồn tại).
drop policy if exists "Public insert orders" on orders;

notify pgrst, 'reload schema';
