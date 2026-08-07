"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import SuccessModal from "@/components/SuccessModal";

// createProduct/updateProduct (xem actions.js) redirect về đây kèm ?created=1 hoặc ?updated=1 sau
// khi lưu xong — hiện modal "Hoàn tất" bắt admin bấm OK xác nhận, rồi xoá tham số khỏi URL (để
// tải lại trang hoặc bấm Quay lại từ trình duyệt không hiện lại modal cũ).
export default function ProductSavedNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const created = searchParams.get("created");
  const updated = searchParams.get("updated");

  function handleClose() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("created");
    params.delete("updated");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <SuccessModal open={Boolean(created || updated)} success title="Hoàn tất! ✓" onClose={handleClose}>
      <p style={{ margin: 0 }}>
        {created ? "Đã thêm sản phẩm mới thành công." : "Đã lưu thay đổi sản phẩm thành công."}
      </p>
    </SuccessModal>
  );
}
