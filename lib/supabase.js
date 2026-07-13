import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Không ép "cache: no-store" ở đây nữa — để từng route tự quyết định độ tươi của dữ liệu qua
// "export const dynamic"/"export const revalidate" của chính nó (San phẩm/danh mục/tìm kiếm
// đều đã tự khai "force-dynamic" nên không đổi hành vi). Nhờ vậy trang chủ ("export const
// revalidate = 60") mới thật sự tận dụng được Next.js Data Cache thay vì luôn query DB.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);