import { redirect } from "next/navigation";
import { getCustomerUser } from "@/lib/customerAuth";
import CheckoutForm from "@/components/CheckoutForm";

export default async function CheckoutPage() {
  const user = await getCustomerUser();

  // Bắt buộc đăng nhập mới đặt hàng được — chưa đăng nhập thì chuyển sang trang đăng nhập,
  // đăng nhập xong quay lại đúng trang này (nhờ tham số "next").
  if (!user) {
    redirect("/dang-nhap?next=/dat-hang");
  }

  return <CheckoutForm userEmail={user.email} />;
}
