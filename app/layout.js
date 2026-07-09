import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChromeGate from "@/components/ChromeGate";
import { CartProvider } from "@/context/CartContext";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "LinhKien.Store — Linh kiện điện thoại & phụ kiện điện tử",
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
        <CartProvider>
          <ChromeGate header={<Header />} footer={<Footer />}>
            {children}
          </ChromeGate>
        </CartProvider>
      </body>
    </html>
  );
}
