// Bỏ dấu tiếng Việt + viết thường — dùng để chuẩn hoá từ khoá tìm kiếm phía người dùng nhập,
// khớp với các cột "..._unaccent" (tính sẵn bằng Postgres, xem migration_013) trong database.
// \p{Diacritic} là Unicode property escape (ES2018+) — khớp mọi dấu kết hợp (combining mark)
// sau khi .normalize("NFD") tách chữ cái ra khỏi dấu, gọn hơn liệt kê dải mã ̀-ͯ.
export function normalizeSearchText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}

// Bỏ các ký tự có thể phá cú pháp bộ lọc .or()/.ilike() của PostgREST:
// "%" và "," phá cú pháp OR, "()" dùng để nhóm điều kiện trong PostgREST nên gõ vào
// từ khoá sẽ làm sai cấu trúc câu lọc (lỗi 400 -> âm thầm ra 0 kết quả), "_" là ký tự
// đại diện 1 ký tự bất kỳ của ILIKE nên bỏ luôn cho khớp đúng nghĩa người dùng gõ.
export function escapeSearchTerm(term) {
  return (term || "").replace(/[%,()_]/g, "");
}
