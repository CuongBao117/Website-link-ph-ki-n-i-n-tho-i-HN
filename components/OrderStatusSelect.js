"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/admin/(protected)/orders/actions";

const STATUSES = ["Chờ xác nhận", "Đang giao", "Đã giao", "Đã huỷ"];

const STATUS_COLORS = {
  "Chờ xác nhận": "var(--copper-dark)",
  "Đang giao": "var(--teal)",
  "Đã giao": "#2f6f62",
  "Đã huỷ": "#9AA6A0",
};

export default function OrderStatusSelect({ orderId, currentStatus }) {
  const [status, setStatus] = useState(currentStatus || "Chờ xác nhận");
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const newStatus = e.target.value;
    setStatus(newStatus);
    startTransition(() => {
      updateOrderStatus(orderId, newStatus);
    });
  }

  return (
    <select
      className="sort-select"
      value={status}
      onChange={handleChange}
      disabled={isPending}
      style={{
        borderColor: STATUS_COLORS[status] || "var(--ink)",
        color: STATUS_COLORS[status] || "var(--ink)",
        fontWeight: 600,
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
