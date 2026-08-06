import "./globals.css";
import { SITE_URL } from "@/lib/siteUrl";

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
      <body>{children}</body>
    </html>
  );
}
