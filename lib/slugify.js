// Chuẩn hoá slug: bỏ dấu tiếng Việt, viết thường, khoảng trắng/ký tự lạ -> gạch ngang.
// Dùng chung cho form thêm/sửa sản phẩm VÀ tính năng nhập hàng loạt, để slug luôn được tạo
// theo đúng 1 quy tắc dù nhập bằng cách nào.
export function slugify(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu (â -> a, ư -> u...)
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-") // khoảng trắng và ký tự lạ -> gạch ngang
    .replace(/^-+|-+$/g, ""); // bỏ gạch ngang thừa ở đầu/cuối
}
