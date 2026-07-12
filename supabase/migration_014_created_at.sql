-- Migration 014: thêm cột "created_at" cho sản phẩm, dùng cho lựa chọn sắp xếp "Mới nhất".
-- Chạy trong Supabase Dashboard > SQL Editor. An toàn để chạy lại nhiều lần.
--
-- LƯU Ý: các sản phẩm ĐÃ CÓ TỪ TRƯỚC khi chạy migration này sẽ đều nhận cùng 1 thời điểm
-- (lúc chạy migration) làm created_at — không có cách nào biết chính xác chúng được nhập lúc
-- nào trong quá khứ. "Mới nhất" sẽ có ý nghĩa đúng dần theo thời gian, kể từ sản phẩm nào được
-- thêm SAU khi chạy file này.

alter table products
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_products_created_at on products (created_at desc);

notify pgrst, 'reload schema';
