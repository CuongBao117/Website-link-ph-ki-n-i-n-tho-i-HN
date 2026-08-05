-- Migration 016: phân loại CÓ GIÁ RIÊNG cho 1 sản phẩm (vd cùng "Vỏ bộ Full A57-4G" nhưng
-- "Vỏ" 100k / "Xương" 45k) — hiển thị trên trang sản phẩm giống chọn size quần áo, mỗi lựa
-- chọn 1 giá khác nhau. Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.
--
-- KHÁC với cột "variants" đã có sẵn ("dòng máy tương thích" — vd iPhone 12, iPhone 12 Pro — dùng
-- CHUNG 1 giá, và đang được lọc/tìm kiếm dùng ở nhiều nơi qua variants_text/.contains()) — cố tình
-- KHÔNG đụng vào "variants" để không phá lọc/tìm kiếm sẵn có. "price_options" là cột MỚI, hoàn
-- toàn độc lập: rỗng ('[]', mặc định) thì sản phẩm hoạt động y hệt trước giờ.

alter table products add column if not exists price_options jsonb not null default '[]';
-- Dạng: [{"name": "Vỏ", "price": 100000}, {"name": "Xương", "price": 45000}]

-- Cập nhật place_order() — nhận thêm "priceOption" (tên lựa chọn) trong mỗi dòng giỏ hàng, tính
-- GIÁ THẬT theo lựa chọn đó (tra trong price_options của sản phẩm), vẫn bỏ qua hoàn toàn giá
-- client gửi lên như trước (xem migration_006/010) — không tin tưởng giá từ trình duyệt.
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
  v_price_option text;
  v_unit_price numeric;
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
    v_price_option := v_item ->> 'priceOption';
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

    -- Có chọn 1 phân loại VÀ sản phẩm có price_options -> tra giá đúng phân loại đó; khớp tên nào
    -- không thấy (dữ liệu cũ/tên đổi) thì rơi về giá gốc products.price, không để null/lỗi đơn hàng.
    v_unit_price := v_product.price;
    if v_price_option is not null and jsonb_array_length(v_product.price_options) > 0 then
      select (opt ->> 'price')::numeric into v_unit_price
      from jsonb_array_elements(v_product.price_options) as opt
      where opt ->> 'name' = v_price_option
      limit 1;
      if v_unit_price is null then
        v_unit_price := v_product.price;
      end if;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
    v_line_items := v_line_items || jsonb_build_object(
      'slug', v_product.slug,
      'name', v_product.name,
      'code', v_product.code,
      'variant', v_variant,
      'priceOption', v_price_option,
      'price', v_unit_price,
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

notify pgrst, 'reload schema';
