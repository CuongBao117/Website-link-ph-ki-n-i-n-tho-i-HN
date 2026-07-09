"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "@/app/admin/(protected)/products/actions";

export default function DeleteProductButton({ slug, name }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const ok = confirm(`Xoá sản phẩm "${name}"? Hành động này không thể hoàn tác.`);
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteProduct(slug);
      if (result?.success) {
        router.refresh();
      } else {
        alert("Xoá thất bại: " + (result?.error || "Lỗi không xác định"));
      }
    });
  }

  return (
    <button type="button" className="cart-remove" onClick={handleClick} disabled={isPending}>
      {isPending ? "Đang xoá..." : "Xoá"}
    </button>
  );
}
