"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProductVisibility } from "@/app/admin/(protected)/products/actions";

export default function ToggleVisibilityButton({ slug, name, isHidden }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const nextHidden = !isHidden;
    const ok = confirm(
      nextHidden
        ? `Ẩn tạm "${name}" khỏi trang khách? Sản phẩm vẫn còn trong admin, bật hiện lại bất kỳ lúc nào.`
        : `Hiện lại "${name}" cho khách xem/mua?`
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await toggleProductVisibility(slug, nextHidden);
      if (res?.success) {
        router.refresh();
      } else {
        alert("Có lỗi xảy ra: " + (res?.error || "Lỗi không xác định"));
      }
    });
  }

  return (
    <button type="button" className="cart-remove" onClick={handleClick} disabled={isPending}>
      {isPending ? "Đang lưu..." : isHidden ? "Hiện lại" : "Ẩn"}
    </button>
  );
}
