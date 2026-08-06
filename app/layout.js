import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/siteUrl";

// subsets: "latin" KHÔNG chứa ký tự có dấu tiếng Việt (subset "vietnamese" tách riêng trên Google
// Fonts) — thiếu nó khiến mọi chữ có dấu fallback sang font hệ thống, lệch hẳn so với chữ không
// dấu trong cùng một từ. Phải khai báo cả hai.
const display = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LinhKien.Store — Linh kiện điện thoại & phụ kiện điện tử",
    template: "%s | LinhKien.Store",
  },
  description:
    "Linh kiện thay thế điện thoại (màn hình, pin, camera...) và phụ kiện điện tử (loa, tai nghe, sạc, cáp). Giao hàng COD toàn quốc.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable}`}
        style={{ fontFamily: "var(--font-body), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
