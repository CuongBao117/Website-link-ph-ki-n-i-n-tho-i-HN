import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import GanAnhBatch from "@/components/GanAnhBatch";

export const dynamic = "force-dynamic";

export default async function GanAnhPage() {
  const [{ data: groups }, { data: categories }] = await Promise.all([
    supabaseAdmin.from("category_groups").select("*").order("display_order"),
    supabaseAdmin.from("categories").select("*").order("display_order"),
  ]);

  const categoryGroups = (groups || []).map((g) => ({
    slug: g.slug,
    name: g.name,
    categories: (categories || []).filter((c) => c.group_slug === g.slug),
  }));

  return (
    <main>
      <div className="section-head">
        <h2>Gán ảnh hàng loạt</h2>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/products" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          ← Quay lại danh sách sản phẩm
        </Link>
      </div>

      <div className="empty-state" style={{ textAlign: "left", marginBottom: 24 }}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Cách dùng:</p>
        <p>
          1. Mở song song 1 cửa sổ Zalo để đọc tên sản phẩm ghi trong caption từng bài đăng.
        </p>
        <p>
          2. Chọn hoặc kéo-thả 1 lô ảnh đã lưu từ Zalo vào ô bên dưới (chọn được nhiều ảnh cùng lúc).
        </p>
        <p>
          3. Với mỗi ảnh: gõ tên sản phẩm (đọc từ caption Zalo) vào ô tìm kiếm — nếu ra đúng sản phẩm đã
          có sẵn, bấm chọn để gắn ảnh. Nếu không tìm thấy (sản phẩm mới, chưa từng nhập), bấm{" "}
          <b>“Không thấy — tạo sản phẩm mới”</b> để nhập nhanh tên/giá/danh mục kèm luôn ảnh này.
        </p>
        <p style={{ marginBottom: 0 }}>
          Ảnh nào không cần dùng (ảnh nhóm nhiều sản phẩm, ảnh mờ...) bấm <b>“Bỏ qua”</b> để chuyển ảnh
          tiếp theo.
        </p>
      </div>

      <GanAnhBatch categoryGroups={categoryGroups} />
    </main>
  );
}
