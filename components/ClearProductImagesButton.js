"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearProductImages } from "@/app/admin/(protected)/products/duyet-anh/actions";

export default function ClearProductImagesButton({ slug, name }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const ok = confirm(
      `Xoá toàn bộ ảnh hiện tại của "${name}"?\n\nSản phẩm KHÔNG bị xoá, chỉ mất ảnh — gắn lại ảnh đúng sau qua "Gán ảnh hàng loạt" hoặc sửa trực tiếp.`
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await clearProductImages(slug);
      if (res?.success) {
        router.refresh();
      } else {
        alert("Xoá ảnh thất bại: " + (res?.error || "Lỗi không xác định"));
      }
    });
  }

  return (
    <button type="button" className="cart-remove" onClick={handleClick} disabled={isPending}>
      {isPending ? "Đang xoá..." : "Xoá ảnh sai"}
    </button>
  );
}
