import Link from "next/link";
import { register } from "./actions";

export default function RegisterPage({ searchParams }) {
  const hasError = searchParams?.error;

  return (
    <main style={{ maxWidth: 420, margin: "60px auto" }}>
      <div className="section-head">
        <h2>Tạo tài khoản</h2>
      </div>

      {hasError && (
        <div className="empty-state" style={{ color: "var(--copper-dark)", marginBottom: 20, padding: 16 }}>
          {decodeURIComponent(hasError)}
        </div>
      )}

      <form action={register} className="checkout-form">
        <label>Họ và tên</label>
        <input name="name" required placeholder="Nguyễn Văn A" />

        <label>Email</label>
        <input type="email" name="email" required placeholder="ban@email.com" />

        <label>Mật khẩu</label>
        <input type="password" name="password" required minLength={6} placeholder="Ít nhất 6 ký tự" />

        <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
          Đăng ký
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 13.5 }}>
        Đã có tài khoản?{" "}
        <Link href="/dang-nhap" style={{ color: "var(--teal)", fontWeight: 600 }}>
          Đăng nhập
        </Link>
      </div>
    </main>
  );
}
