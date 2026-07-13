"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Lỗi trang:", error);
  }, [error]);

  return (
    <main style={{ maxWidth: 480, margin: "80px auto", textAlign: "center" }}>
      <div className="section-head" style={{ justifyContent: "center" }}>
        <h2>Đã có lỗi xảy ra</h2>
      </div>
      <div className="empty-state" style={{ marginBottom: 20 }}>
        Trang gặp sự cố khi tải. Vui lòng thử lại — nếu vẫn còn lỗi, hãy quay về trang chủ.
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button type="button" onClick={() => reset()} className="btn-primary">
          Thử lại
        </button>
        <Link href="/" className="cart-remove" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
