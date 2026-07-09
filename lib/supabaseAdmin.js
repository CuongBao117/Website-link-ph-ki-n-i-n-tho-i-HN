import { createClient } from "@supabase/supabase-js";

// CHÚ Ý: file này chỉ được import trong Server Component / Server Action.
// Không bao giờ import file này trong component có "use client",
// vì SUPABASE_SERVICE_ROLE_KEY là khoá toàn quyền, phải giữ bí mật tuyệt đối.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
