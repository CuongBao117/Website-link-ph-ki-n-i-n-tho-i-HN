-- Migration 013: nâng cấp tìm kiếm — cho gõ không dấu, thêm index tăng tốc.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.

-- 1) unaccent: cần bật extension, NHƯNG hàm unaccent() gốc của Postgres không phải "immutable"
--    (phụ thuộc dictionary có thể đổi) nên KHÔNG dùng trực tiếp được trong generated column.
--    Bọc lại 1 hàm riêng tự đánh dấu immutable (cách làm chuẩn, dictionary "unaccent" trên thực
--    tế không đổi nên an toàn để coi là immutable).
create extension if not exists unaccent;

create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', coalesce($1, ''));
$$;

-- 2) Cột tính sẵn: chữ thường, không dấu — cho phép tìm "man hinh" ra "Màn hình".
alter table products
  add column if not exists name_unaccent text
  generated always as (lower(public.immutable_unaccent(name))) stored;

alter table products
  add column if not exists code_unaccent text
  generated always as (lower(public.immutable_unaccent(code))) stored;

alter table products
  add column if not exists variants_text_unaccent text
  generated always as (lower(public.immutable_unaccent(variants::text))) stored;

-- 3) pg_trgm: cho phép index ILIKE có %...% ở cả 2 đầu (Supabase thường đã bật sẵn).
create extension if not exists pg_trgm;

create index if not exists idx_products_name_unaccent_trgm
  on products using gin (name_unaccent gin_trgm_ops);
create index if not exists idx_products_code_unaccent_trgm
  on products using gin (code_unaccent gin_trgm_ops);
create index if not exists idx_products_variants_text_unaccent_trgm
  on products using gin (variants_text_unaccent gin_trgm_ops);

notify pgrst, 'reload schema';
