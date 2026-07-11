import Link from "next/link";
import CategoryShowcase from "@/components/CategoryShowcase";

export default function Hero() {
  return (
    <section className="hero-simple">
      <CategoryShowcase />
      <div className="hero-promo">
        <div className="hero-intro">
          <img src="/logo.png" alt="Linh Phụ Kiện Điện Thoại Hoài Nam" className="hero-logo" />
          <h1>Linh Phụ Kiện Điện Thoại Hoài Nam</h1>
          <p>
            Linh kiện thay thế chính hãng, phụ kiện đa dạng, đồ nghề sửa chữa đầy đủ —
            giao hàng thu tiền (COD) toàn quốc, kiểm tra kỹ trước khi giao.
          </p>
          <div className="hero-ctas">
            <Link href="#danh-muc" className="btn-primary">
              Xem danh mục sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
