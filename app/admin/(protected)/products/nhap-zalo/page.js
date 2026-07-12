import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NhapZaloForm from "@/components/NhapZaloForm";

export const dynamic = "force-dynamic";

export default async function NhapZaloPage() {
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
        <h2>Nhập từ bài đăng Zalo</h2>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/products" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          ← Quay lại danh sách sản phẩm
        </Link>
      </div>

      <div className="empty-state" style={{ textAlign: "left", marginBottom: 24 }}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Dùng khi nào?</p>
        <p>
          Khi mỗi sản phẩm là 1 bài đăng riêng trên Zalo, với 1 giá sỉ áp dụng chung cho nhiều dòng
          máy tương thích. Khác với <b>"Nhập nhanh nhiều dòng máy"</b> — công cụ đó dùng khi mỗi
          dòng máy có 1 giá KHÁC nhau (VD cáp sạc: iPhone 11 giá khác, 11 Pro Max giá khác).
        </p>
        <p style={{ marginBottom: 0 }}>
          Copy caption từng bài (tên sản phẩm ở dòng đầu, dòng chứa <code>Sỉ ...k</code> ở dưới),
          dán tất cả vào ô bên dưới — mỗi bài cách nhau 1 dòng trống hoặc <code>---</code>. Sản
          phẩm tạo ra sẽ <b>chưa có ảnh</b> — dùng "Gán ảnh hàng loạt" ngay sau đó để gắn ảnh cho
          từng sản phẩm.
        </p>
      </div>

      <NhapZaloForm categoryGroups={categoryGroups} />
    </main>
  );
}
