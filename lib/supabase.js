import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Next.js patches "fetch" toàn cục để tự cache request theo mặc định — ép mọi request
// của Supabase client này bỏ qua cache đó (cache: "no-store"), đảm bảo trang chủ luôn
// lấy đúng danh mục/sản phẩm mới nhất từ database, không bị kẹt lại dữ liệu cũ.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }),
  },
});