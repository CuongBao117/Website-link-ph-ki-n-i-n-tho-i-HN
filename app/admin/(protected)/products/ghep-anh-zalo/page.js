import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import GhepAnhZaloBatch from "@/components/GhepAnhZaloBatch";

export const dynamic = "force-dynamic";

export default async function GhepAnhZaloPage() {
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
        <h2>Ghép ảnh từ ảnh chụp màn hình Zalo</h2>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/products" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          ← Quay lại danh sách sản phẩm
        </Link>
      </div>

      <div className="empty-state" style={{ textAlign: "left", marginBottom: 24 }}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Dùng khi nào:</p>
        <p>
          Chỉ có ảnh chụp màn hình bài đăng Zalo (cả ảnh sản phẩm lẫn caption tên/giá đều nằm
          trong 1 ảnh) — công cụ đọc chữ trong caption để tự tìm/tạo đúng sản phẩm, đỡ phải gõ tay.
        </p>
        <p style={{ fontWeight: 600 }}>Cách thao tác:</p>
        <p>
          1. Chụp màn hình từng bài đăng (mỗi bài = 1 sản phẩm). 1 bài có thể có nhiều ảnh (nhiều
          góc chụp) — chụp hết các ảnh của bài đó rồi mới sang bài tiếp theo.
        </p>
        <p style={{ marginBottom: 0 }}>
          2. Tải hết ảnh chụp màn hình lên bên dưới (không cần đổi tên file). Công cụ tự gộp các
          ảnh liền kề có CÙNG caption thành 1 nhóm = 1 sản phẩm, rồi{" "}
          <b>chưa có sản phẩm đó thì tự tạo mới</b>, <b>đã có sẵn thì cập nhật thêm ảnh</b> — nếu
          giá đọc được khác giá đang lưu, công cụ sẽ hỏi lại để tự chọn giá trước khi lưu.
        </p>
      </div>

      <GhepAnhZaloBatch categoryGroups={categoryGroups} />
    </main>
  );
}
