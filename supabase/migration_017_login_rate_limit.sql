-- Migration 017: chống dò mật khẩu (brute-force) ở trang đăng nhập khách hàng — ghi lại mỗi
-- lần đăng nhập SAI theo email, khoá tạm 15 phút nếu 1 email bị nhập sai quá 5 lần liên tiếp.
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.
--
-- Chỉ Server Action (dùng supabaseAdmin/service_role, xem app/(shop)/dang-nhap/actions.js) mới
-- đọc/ghi bảng này — bật RLS nhưng KHÔNG tạo policy nào, mặc định chặn hết anon/authenticated.

create table if not exists login_attempts (
  id bigserial primary key,
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_attempts_email_created on login_attempts (email, created_at desc);

alter table login_attempts enable row level security;
