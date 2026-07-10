import { redirect } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import { isAdminAuthed } from "@/lib/adminAuth";
import AdminNav from "@/components/AdminNav";
import AdminLiveOrders from "@/components/AdminLiveOrders";

export default function ProtectedAdminLayout({ children }) {
  if (!isAdminAuthed()) {
    redirect("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        className="no-print"
        style={{
          background: "var(--ink)",
          color: "#fff",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 12,
        }}
      >
        <AdminNav />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#DDE6E1", textDecoration: "none" }}
          >
            Xem cửa hàng ↗
          </a>
          <form action={logout}>
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "1px solid #566962",
                color: "#fff",
                padding: "5px 12px",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11,
              }}
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
      {children}
      <AdminLiveOrders />
    </div>
  );
}
