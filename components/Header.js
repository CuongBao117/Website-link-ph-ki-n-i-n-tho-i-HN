import Link from "next/link";
import { getCategoriesGrouped } from "@/data/products";
import { getCustomerUser } from "@/lib/customerAuth";
import { logout } from "@/app/dang-nhap/actions";
import CartBadge from "@/components/CartBadge";
import MegaMenu from "@/components/MegaMenu";
import SearchBox from "@/components/SearchBox";

export default async function Header() {
  const [groups, user] = await Promise.all([getCategoriesGrouped(), getCustomerUser()]);

  return (
    <>
      <div className="topbar">
        <div>
          <span className="copper">CHUYÊN SỈ LINH PHỤ KIỆN ĐIỆN THOẠI</span>
        </div>
        <div>
          Miễn phí vận chuyển cho đơn hàng từ <span className="copper">2tr</span>
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
          {user ? (
            <>
              <span className="header-user-name">
                Xin chào, <b>{user.user_metadata?.full_name || user.email}</b>
              </span>
              <Link href="/don-hang-cua-toi" className="header-action-btn">
                Đơn hàng của tôi
              </Link>
              <form action={logout} style={{ display: "inline" }}>
                <button type="submit" className="header-action-btn" style={{ border: "none", background: "none", cursor: "pointer" }}>
                  Đăng xuất
                </button>
              </form>
            </>
          ) : (
            <Link href="/dang-nhap" className="header-action-btn">
              Đăng nhập
            </Link>
          )}
          <CartBadge className="header-action-btn header-action-btn--primary" />
        </div>
      </header>

      <MegaMenu groups={groups} />
    </>
  );
}
