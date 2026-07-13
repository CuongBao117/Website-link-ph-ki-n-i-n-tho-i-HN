import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import NhapNhanhForm from "@/components/NhapNhanhForm";

export const dynamic = "force-dynamic";

export default async function NhapNhanhPage() {
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
        <h2>Nhập nhanh nhiều dòng máy</h2>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/products" style={{ color: "var(--teal)", fontWeight: 600, fontSize: 13.5 }}>
          ← Quay lại danh sách sản phẩm
        </Link>
      </div>

      <div className="empty-state" style={{ textAlign: "left", marginBottom: 24 }}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Dùng khi nào?</p>
        <p>
          Khi 1 mặt hàng có nhiều dòng máy, mỗi dòng máy 1 giá khác nhau (vd “Cáp sạc WEIBI” — iPhone 11
          giá khác, iPhone 11 Pro Max giá khác) — dán cả bảng giá vào 1 ô, hệ thống tự tách thành nhiều
          sản phẩm riêng biệt, mỗi dòng máy 1 thẻ sản phẩm với giá đúng của nó.
        </p>
        <p style={{ marginBottom: 0 }}>
          Định dạng dán vào: dòng đầu là tên mặt hàng chung, các dòng sau mỗi dòng 1 “tên dòng máy → giá”
          (chấp nhận cả <code>→</code>, <code>-</code>, <code>:</code> làm dấu ngăn cách, giá có thể viết
          tắt <code>103k</code> = 103.000đ).
        </p>
      </div>

      <NhapNhanhForm categoryGroups={categoryGroups} />
    </main>
  );
}
