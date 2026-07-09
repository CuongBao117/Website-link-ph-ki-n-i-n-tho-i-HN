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
          Miễn phí giao hàng nội thành cho đơn hàng từ <span className="copper">2.000.000đ</span>
        </div>
        <div>
          Hotline: <span className="copper">1900 6868</span> · 8:00 – 21:00 mỗi ngày
        </div>
      </div>

      <header className="site-header">
        <Link href="/" className="logo" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 42, height: 42, objectFit: "contain" }} />
          <span style={{ lineHeight: 1.15 }}>
            LINH PHỤ KIỆN
            <br />
            <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.04em" }}>
              ĐIỆN THOẠI HOÀI NAM
            </span>
          </span>
        </Link>

        <SearchBox />

        <div className="header-actions">
          <CartBadge />
        </div>
      </header>

      <MegaMenu groups={groups} />
    </>
  );
}
