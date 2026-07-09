import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="foot-grid">
        <div>
          <h4>LINH KIỆN.STORE</h4>
          <p>
            Chuyên linh kiện thay thế điện thoại &amp; phụ kiện điện tử: loa, tai
            nghe, sạc, cáp. Không sửa chữa, không bán sim số.
          </p>
        </div>
        <div>
          <h4>DANH MỤC</h4>
          <p>Linh kiện iPhone</p>
          <p>Linh kiện Samsung</p>
          <p>Loa &amp; Tai nghe</p>
        </div>
        <div>
          <h4>HỖ TRỢ</h4>
          <p>Chính sách bảo hành</p>
          <p>Chính sách đổi trả</p>
          <p>Hướng dẫn đặt hàng COD</p>
        </div>
        <div>
          <h4>LIÊN HỆ</h4>
          <p>Hotline: 1900 6868</p>
          <p>Email: hotro@linhkien.store</p>
        </div>
      </div>
      <div className="foot-bottom">
        © 2026 LINHKIEN.STORE — ĐANG TRONG QUÁ TRÌNH XÂY DỰNG ·{" "}
        <Link href="/admin" style={{ color: "inherit" }}>
          Quản trị
        </Link>
      </div>
    </footer>
  );
}
