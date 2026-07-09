"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getPendingOrdersSnapshot } from "@/app/admin/(protected)/orders/actions";

const POLL_INTERVAL_MS = 20000;
const BASE_TITLE = "LinhKien.Store — Quản trị";

// Phát 1 tiếng "beep" ngắn bằng Web Audio API — không cần file âm thanh riêng.
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Trình duyệt chặn autoplay âm thanh trước khi người dùng tương tác — bỏ qua, không quan trọng.
  }
}

// Component này không hiển thị gì trong luồng bố cục — chỉ chạy nền để theo dõi đơn hàng mới
// và hiện 1 toast nổi ở góc màn hình. Đặt trong layout admin để hoạt động trên mọi trang quản trị.
export default function AdminLiveOrders() {
  const [toast, setToast] = useState(null); // { count, orders }
  const knownIdsRef = useRef(null); // null = chưa có baseline; Set = đã biết các id đang chờ

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const snapshot = await getPendingOrdersSnapshot();
      if (cancelled || !snapshot) return;

      const currentIds = new Set(snapshot.latestIds || []);

      if (knownIdsRef.current === null) {
        // Lần kiểm tra đầu tiên sau khi vào trang admin — chỉ lấy baseline, KHÔNG báo động
        // (tránh giật mình vì các đơn cũ đã có sẵn từ trước khi admin đăng nhập).
        knownIdsRef.current = currentIds;
      } else {
        const newOnes = (snapshot.latestOrders || []).filter((o) => !knownIdsRef.current.has(o.id));
        if (newOnes.length > 0) {
          playBeep();
          setToast({ orders: newOnes, count: snapshot.count });
        }
        knownIdsRef.current = currentIds;
      }

      // Cập nhật tiêu đề tab + phát sự kiện cho AdminNav hiển thị số huy hiệu
      document.title = snapshot.count > 0 ? `(${snapshot.count}) ${BASE_TITLE}` : BASE_TITLE;
      window.dispatchEvent(new CustomEvent("admin-pending-count", { detail: snapshot.count }));
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.title = BASE_TITLE;
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        background: "var(--ink)",
        color: "#fff",
        borderRadius: "var(--radius)",
        padding: "16px 18px",
        maxWidth: 320,
        boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        fontSize: 13.5,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#E3A06D" }}>
        🔔 {toast.orders.length === 1 ? "Có đơn hàng mới!" : `Có ${toast.orders.length} đơn hàng mới!`}
      </div>
      {toast.orders.slice(0, 3).map((o) => (
        <div key={o.id} style={{ fontSize: 12.5, color: "#DDE6E1", marginBottom: 2 }}>
          {o.order_code} — {o.customer_name}
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <Link
          href="/admin/orders"
          onClick={() => setToast(null)}
          style={{
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 12.5,
            borderBottom: "1px solid #E3A06D",
          }}
        >
          Xem đơn hàng →
        </Link>
        <button
          type="button"
          onClick={() => setToast(null)}
          style={{
            background: "transparent",
            border: "none",
            color: "#9AAFA6",
            cursor: "pointer",
            fontSize: 12.5,
            marginLeft: "auto",
          }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
