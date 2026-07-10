import ImportProductsForm from "@/components/ImportProductsForm";

export const dynamic = "force-dynamic";
// File CSV vài nghìn dòng cần nhiều thời gian xử lý hơn giới hạn mặc định (10 giây) —
// nâng lên 60 giây (route segment config này chỉ khai báo được ở Server Component).
export const maxDuration = 60;

export default function ImportProductsPage() {
  return <ImportProductsForm />;
}
