-- Migration 015: hàm so khớp mờ (fuzzy match) sản phẩm theo tên — dùng cho tính năng
-- "Ghép ảnh từ ảnh chụp màn hình Zalo" (OCR chữ trong ảnh chụp màn hình rồi tìm sản phẩm
-- gần đúng nhất trong database). Dựa trên pg_trgm đã bật sẵn từ migration_013.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.

create or replace function public.match_products_by_text(search_text text, match_limit int default 5)
returns table (slug text, code text, name text, price numeric, image_url text, score real)
language sql
stable
as $$
  select
    p.slug,
    p.code,
    p.name,
    p.price,
    p.image_url,
    similarity(p.name_unaccent, lower(public.immutable_unaccent(coalesce(search_text, '')))) as score
  from products p
  order by score desc
  limit greatest(match_limit, 1);
$$;

notify pgrst, 'reload schema';
