import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomeShortcut from "@/components/HomeShortcut";
import FloatingContact from "@/components/FloatingContact";
import PromoTicker from "@/components/PromoTicker";
import { CartProvider } from "@/context/CartContext";

// Layout riêng cho toàn bộ trang bán hàng (route group không đổi URL). Admin sống ở
// app/admin/* — NGOÀI route group này — nên Header/Footer/CartProvider ở đây không bao giờ
// nằm trong cây render của trang quản trị, thay vì trước đây bị ẩn muộn ở phía client
// (ChromeGate) sau khi Header đã fetch dữ liệu xong trên server.
export default function ShopLayout({ children }) {
  return (
    <CartProvider>
      <Header />
      <PromoTicker />
      {children}
      <Footer />
      <HomeShortcut />
      <FloatingContact />
    </CartProvider>
  );
}
