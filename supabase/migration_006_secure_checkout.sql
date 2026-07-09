-- Migration 006: đặt hàng an toàn — giá & tồn kho tính lại ở server, không tin dữ liệu từ trình duyệt.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.
--
-- VẤN ĐỀ ĐANG SỬA:
-- Trước đây trang /dat-hang chèn thẳng total_price + cart_items (lấy từ localStorage của khách)
-- lên bảng "orders" bằng anon key, với policy "for insert with check (true)" — nghĩa là API
-- công khai chấp nhận BẤT KỲ giá nào khách gửi lên. Khách có thể sửa localStorage hoặc gọi thẳng
-- API để đặt hàng với giá tuỳ ý. Đồng thời không có gì ngăn 2 khách cùng mua hết 1 sản phẩm
-- chỉ còn 1 cái trong kho cùng lúc (race condition).
--
-- CÁCH SỬA: mọi đơn hàng giờ đi qua hàm place_order() bên dưới, chạy TRONG database:
--   1) Khoá (lock) các dòng sản phẩm liên quan trước khi đọc tồn kho, tránh race condition.
--   2) Lấy GIÁ THẬT từ bảng products theo slug — bỏ qua hoàn toàn giá client gửi lên.
--   3) Kiểm tra đủ tồn kho, nếu không đủ thì huỷ toàn bộ (không tạo đơn nửa vời).
--   4) Trừ tồn kho và tạo đơn hàng trong CÙNG 1 transaction.
-- Hàm này chỉ được gọi từ Server Action (dùng SUPABASE_SERVICE_ROLE_KEY), không gọi trực tiếp
-- từ trình duyệt — nên bên dưới cũng khoá luôn đường chèn đơn hàng trực tiếp qua anon key.

create or replace function place_order(
  p_items jsonb,           -- [{ "slug": "...", "variant": "...", "qty": 2 }, ...]
  p_customer_name text,
  p_phone_number text,
  p_address text,
  p_note text
)
returns table (out_order_id bigint, out_order_code text, out_total_price numeric)
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
  v_total numeric := 0;
  v_line_items jsonb := '[]'::jsonb;
  v_order_code text;
  v_order_id bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_phone_number), '') = ''
     or coalesce(trim(p_address), '') = '' then
    raise exception 'MISSING_CUSTOMER_INFO';
  end if;

  -- Khoá trước toàn bộ các dòng sản phẩm liên quan (theo thứ tự cố định để tránh deadlock
  -- khi nhiều đơn hàng chạy song song), rồi mới đọc/trừ tồn kho từng sản phẩm bên dưới.
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

    -- Giá & tên lấy từ database tại thời điểm đặt hàng — KHÔNG dùng giá client gửi lên.
    v_total := v_total + (v_product.price * v_qty);
    v_line_items := v_line_items || jsonb_build_object(
      'slug', v_product.slug,
      'name', v_product.name,
      'code', v_product.code,
      'variant', v_variant,
      'price', v_product.price,
      'qty', v_qty
    );
  end loop;

  v_order_code := 'DH' || to_char(now(), 'YYMMDDHH24MISS');

  insert into orders (order_code, customer_name, phone_number, address, note, total_price, cart_items, status)
  values (v_order_code, trim(p_customer_name), trim(p_phone_number), trim(p_address), nullif(trim(coalesce(p_note, '')), ''), v_total, v_line_items, 'Chờ xác nhận')
  returning id into v_order_id;

  return query select v_order_id, v_order_code, v_total;
end;
$$;

-- Khoá đường chèn đơn hàng trực tiếp qua anon key — từ giờ MỌI đơn hàng phải đi qua place_order()
-- (gọi từ Server Action bằng service_role key), không còn cách nào để khách tự chèn giá tuỳ ý nữa.
drop policy if exists "Public insert orders" on orders;

notify pgrst, 'reload schema';
