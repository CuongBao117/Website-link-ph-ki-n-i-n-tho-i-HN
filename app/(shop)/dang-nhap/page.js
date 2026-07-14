import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import { login } from "./actions";

export default function LoginPage({ searchParams }) {
  const hasError = searchParams?.error;
  const justRegistered = searchParams?.registered;
  const next = searchParams?.next || "/";

  return (
    <main style={{ maxWidth: 420, margin: "60px auto" }}>
      <div className="section-head">
        <h2>Đăng nhập</h2>
      </div>

      {justRegistered && !hasError && (
        <div className="empty-state" style={{ color: "#2f6f62", marginBottom: 20, padding: 16 }}>
          Đăng ký thành công! Nếu cửa hàng yêu cầu xác nhận email, hãy kiểm tra hộp thư trước khi
          đăng nhập. Nếu không, bạn đăng nhập luôn được.
        </div>
      )}

      {hasError && (
        <div className="empty-state" style={{ color: "var(--copper-dark)", marginBottom: 20, padding: 16 }}>
          {decodeURIComponent(hasError)}
        </div>
      )}

      <form action={login} className="checkout-form">
        <input type="hidden" name="next" value={next} />

        <label>Email</label>
        <input type="email" name="email" required autoFocus placeholder="ban@email.com" />

        <label>Mật khẩu</label>
        <PasswordInput name="password" required placeholder="Mật khẩu" autoComplete="current-password" />

        <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
          Đăng nhập
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 13.5 }}>
        Chưa có tài khoản?{" "}
        <Link href="/dang-ky" style={{ color: "var(--teal)", fontWeight: 600 }}>
          Đăng ký ngay
        </Link>
      </div>
    </main>
  );
}
