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
          Ảnh sản phẩm chỉ lấy được từ bài đăng Zalo (chỉ xem trên điện thoại), tên và giá bán nằm
          trong caption chứ không nằm trong ảnh — công cụ này đọc chữ trong caption để tự tìm ra
          đúng sản phẩm, đỡ phải gõ tay từng cái.
        </p>
        <p style={{ fontWeight: 600 }}>Cách thao tác trên điện thoại (mỗi bài đăng = 1 sản phẩm):</p>
        <p>
          1. Mở bài đăng → <b>chụp màn hình</b> cả bài (thấy được cả ảnh và caption tên/giá).
        </p>
        <p>
          2. Bấm <b>Lưu ảnh</b> để lưu (các) ảnh gốc của đúng bài đó — lưu ngay sau khi chụp màn
          hình, đừng làm việc khác xen giữa.
        </p>
        <p style={{ marginBottom: 0 }}>
          3. Sang bài tiếp theo, lặp lại. Xong thì đồng bộ cả 2 loại ảnh này về máy tính (Google
          Photos, hoặc gửi vào &quot;Cloud của tôi&quot; trên Zalo rồi tải về từ Zalo PC) — không cần đổi tên
          file gì cả, tải 2 lô ảnh (chụp màn hình / ảnh gốc) lên bên dưới, công cụ tự ghép theo
          đúng thời gian lưu.
        </p>
      </div>

      <GhepAnhZaloBatch categoryGroups={categoryGroups} />
    </main>
  );
}
