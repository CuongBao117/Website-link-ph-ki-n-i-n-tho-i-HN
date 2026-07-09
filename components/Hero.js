import Link from "next/link";
import HeroBanner from "@/components/HeroBanner";

export default function Hero() {
  return (
    <section className="hero-simple">
      <div className="hero-intro">
        <img src="/logo.png" alt="Linh Phụ Kiện Điện Thoại Hoài Nam" className="hero-logo" />
        <h1>Linh Phụ Kiện Điện Thoại Hoài Nam</h1>
        <p>
          Linh kiện thay thế chính hãng, phụ kiện đa dạng, đồ nghề sửa chữa đầy đủ —
          giao hàng thu tiền (COD) toàn quốc, kiểm tra kỹ trước khi giao.
        </p>
        <div className="hero-ctas">
          <Link href="/tim-kiem" className="btn-primary">
            Tìm sản phẩm theo tên máy
          </Link>
          <Link href="#danh-muc" className="btn-outline">
            Xem danh mục
          </Link>
        </div>
      </div>
      <HeroBanner />
    </section>
  );
}
