"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory } from "@/app/admin/(protected)/categories/actions";

export default function DeleteCategoryButton({ slug, name }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const ok = confirm(`Xoá danh mục "${name}"? Hành động này không thể hoàn tác.`);
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteCategory(slug);
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
