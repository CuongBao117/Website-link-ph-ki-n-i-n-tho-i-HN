import { login } from "./actions";

export default function AdminLoginPage({ searchParams }) {
  const hasError = searchParams?.error;

  return (
    <main style={{ maxWidth: 380, margin: "80px auto" }}>
      <div className="section-head">
        <h2>Đăng nhập quản trị</h2>
      </div>

      {hasError && (
        <div
          className="empty-state"
          style={{ color: "var(--copper-dark)", marginBottom: 20, padding: 16 }}
        >
          Sai mật khẩu, vui lòng thử lại.
        </div>
      )}

      <form action={login} className="checkout-form">
        <label>Mật khẩu quản trị</label>
        <input type="password" name="password" required autoFocus />
        <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
          Đăng nhập
        </button>
      </form>
    </main>
  );
}
