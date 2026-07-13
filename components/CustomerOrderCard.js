"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/data/products";
import { cancelMyOrder } from "@/app/(shop)/don-hang-cua-toi/actions";

const STATUS_COLORS = {
  "Chờ xác nhận": "var(--copper-dark)",
  "Đang giao": "var(--teal)",
  "Đã giao": "#2f6f62",
  "Đã huỷ": "#9AA6A0",
};

export default function CustomerOrderCard({ order, productImages }) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelled, setCancelled] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canCancel = order.status === "Chờ xác nhận" && !cancelled;
  const items = order.cart_items || [];

  function handleCancel() {
    setCancelError(null);
    startTransition(async () => {
      const result = await cancelMyOrder(order.id);
      if (result.success) {
        setCancelled(true);
        setConfirming(false);
      } else {
        setCancelError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="order-card">
      <button
        type="button"
        className="order-card-head"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div>
          <strong>{order.order_code}</strong>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
            {new Date(order.created_at).toLocaleString("vi-VN")} · {items.length} sản phẩm
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong style={{ color: "var(--copper-dark)" }}>{formatPrice(order.total_price)}</strong>
          <span
            className="prod-code"
            style={{ color: STATUS_COLORS[cancelled ? "Đã huỷ" : order.status] || "var(--ink)" }}
          >
            {cancelled ? "Đã huỷ" : order.status}
          </span>
          <span aria-hidden style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="order-card-body">
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "12px 0" }}>
            <div>Giao tới: {order.address}</div>
            {order.phone_number && <div>Số điện thoại: {order.phone_number}</div>}
            {order.note && <div>Ghi chú: {order.note}</div>}
          </div>

          {items.map((item, i) => {
            const image = productImages?.[item.slug];
            const content = (
              <>
                {image ? (
                  <Image src={image} alt={item.name} width={40} height={40} className="order-item-thumb" />
                ) : (
                  <div className="order-item-thumb" aria-hidden />
                )}
                <div className="order-item-info">
                  <div>{item.name}</div>
                  <div>
                    {item.variant} × {item.qty}
                  </div>
                </div>
              </>
            );
            return (
              <div key={i} className="order-item-row">
                {item.slug ? (
                  <Link href={`/san-pham/${item.slug}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, textDecoration: "none" }}>
                    {content}
                  </Link>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>{content}</div>
                )}
                <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{formatPrice(item.price * item.qty)}</span>
              </div>
            );
          })}

          <div className="checkout-line" style={{ marginTop: 8 }}>
            <span>Phí vận chuyển</span>
            <span>{order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : "Miễn phí"}</span>
          </div>
          <div className="checkout-total">
            <span>Tổng thu (COD)</span>
            <strong>{formatPrice(order.total_price)}</strong>
          </div>

          {canCancel && (
            <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
              {!confirming ? (
                <button type="button" className="cart-remove" onClick={() => setConfirming(true)} disabled={isPending}>
                  Huỷ đơn hàng
                </button>
              ) : (
                <>
                  <span style={{ fontSize: 13 }}>Chắc chắn huỷ đơn này?</span>
                  <button type="button" className="btn-primary" onClick={handleCancel} disabled={isPending}>
                    {isPending ? "Đang huỷ..." : "Xác nhận huỷ"}
                  </button>
                  <button type="button" className="cart-remove" onClick={() => setConfirming(false)} disabled={isPending}>
                    Thôi
                  </button>
                </>
              )}
            </div>
          )}
          {cancelError && (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--copper-dark)" }}>{cancelError}</div>
          )}
          {cancelled && (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--teal)" }}>Đơn hàng đã được huỷ.</div>
          )}
        </div>
      )}
    </div>
  );
}
