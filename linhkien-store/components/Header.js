import Link from "next/link";
import { getCategoriesGrouped } from "@/data/products";
import CartBadge from "@/components/CartBadge";
import MegaMenu from "@/components/MegaMenu";
import SearchBox from "@/components/SearchBox";

export default async function Header() {
  const groups = await getCategoriesGrouped();

  return (
    <>
      <div className="topbar">
        <div>
          <span className="copper">CHUYÊN SỈ LINH PHỤ KIỆN ĐIỆN THOẠI</span>
        </div>
        <div>
          Miễn phí giao hàng nội thành cho đơn hàng từ <span className="copper">2.000.000đ</span>
        </div>
        <div>
          Hotline: <span className="copper">0357 105 530</span> · 8:00 – 21:00 mỗi ngày
        </div>
      </div>

      <header className="site-header">
        <Link href="/" className="logo" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 42, height: 42, objectFit: "contain" }} />
          <span style={{ lineHeight: 1.15 }}>
            LINH PHỤ KIỆN
            <br />
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.04em" }}>
              CÔNG NGHỆ &amp; THIẾT BỊ
            </span>
          </span>
        </Link>

        <SearchBox />

        <div className="header-actions">
          {/* Tạm ẩn "Tra cứu đơn hàng": bản cũ cho khớp SĐT theo kiểu "chứa" (ilike %...%),
              không giới hạn số lần thử -> có thể bị dò để xem tên/SĐT/địa chỉ người khác.
              Sẽ làm lại sau khi có đăng nhập khách hàng, để chỉ xem được đơn của chính mình. */}
          <CartBadge className="header-action-btn header-action-btn--primary" />
        </div>
      </header>

      <MegaMenu groups={groups} />
    </>
  );
}
