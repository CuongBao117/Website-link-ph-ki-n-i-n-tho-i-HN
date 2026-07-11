-- Migration 012: sửa lỗi Ô TÌM KIẾM bị "0 kết quả" với MỌI từ khoá.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.
--
-- NGUYÊN NHÂN: code cũ lọc từ khoá bằng "variants::text.ilike.%...%" ngay TRONG điều kiện
-- .or(...) — PostgREST (API mà Supabase dùng) KHÔNG cho phép ép kiểu (::) ngay trong điều
-- kiện lọc (chỉ cho phép khi CHỌN cột hiển thị), xem:
-- https://docs.postgrest.org/en/stable/references/api/tables_views.html (mục "Casting Columns")
-- => Supabase trả lỗi 400 cho MỌI lần tìm kiếm có nhập từ khoá, code bắt lỗi rồi âm thầm trả
-- về "0 sản phẩm" thay vì báo lỗi, nên nhìn giống như tìm không ra hàng.
--
-- CÁCH SỬA: thêm 1 cột "tính sẵn" (generated column) lưu sẵn nội dung variants dạng text ngay
-- khi ghi dữ liệu — lọc trên cột có sẵn này thì được phép, không phải ép kiểu lúc truy vấn nữa.

alter table products
  add column if not exists variants_text text
  generated always as (variants::text) stored;

-- Cột này tự động cập nhật mỗi khi variants đổi, không cần sửa code thêm/sửa sản phẩm hay
-- nhập CSV — Postgres tự tính lại, kể cả với 10.000 sản phẩm nhập hàng loạt sau này.

-- pg_trgm: cho phép đánh index tìm kiếm ILIKE (kể cả pattern có % ở đầu) — Supabase đã bật sẵn
-- sẵn cho hầu hết project, nhưng vẫn "create if not exists" cho chắc.
create extension if not exists pg_trgm;

create index if not exists idx_products_variants_text on products using gin (variants_text gin_trgm_ops);
