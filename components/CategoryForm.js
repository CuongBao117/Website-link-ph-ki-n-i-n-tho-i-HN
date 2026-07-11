import SlugField from "@/components/SlugField";

export default function CategoryForm({ action, defaultValues, groups, isEdit }) {
  const v = defaultValues || {};

  return (
    <form action={action} className="checkout-form" style={{ maxWidth: 480 }}>
      <label>Tên danh mục hiển thị</label>
      <input name="name" defaultValue={v.name} placeholder="Ốp lưng" required />

      <label>Mã danh mục (slug — dùng trong link) — gõ tiếng Việt bình thường, hệ thống tự bỏ dấu</label>
      <SlugField defaultValue={v.slug} disabled={isEdit} />

      <label>Mã nội bộ (code)</label>
      <input name="code" defaultValue={v.code} placeholder="PK-09" required />

      <label>Thuộc nhóm lớn</label>
      <select
        name="groupSlug"
        defaultValue={isEdit ? v.group_slug || "" : groups[0]?.slug || ""}
        style={{
          border: "1.5px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: "11px 14px",
          fontSize: 14,
        }}
      >
        {isEdit && <option value="">— Không thuộc nhóm nào (ẩn khỏi menu/trang chủ) —</option>}
        {groups.map((g) => (
          <option key={g.slug} value={g.slug}>
            {g.name}
          </option>
        ))}
      </select>
      {isEdit && !v.group_slug && (
        <div style={{ fontSize: 12, color: "#B0503A", marginTop: -8, marginBottom: 4 }}>
          Danh mục này hiện đang bị ẩn khỏi menu/trang chủ. Chọn 1 nhóm ở trên rồi lưu để hiện lại.
        </div>
      )}

      <label>Thứ tự hiển thị trong nhóm (số nhỏ hơn hiện trước — không cần liên tục, để trống khoảng hở cho dễ chèn thêm sau)</label>
      <input
        type="number"
        name="displayOrder"
        defaultValue={v.display_order ?? 0}
        placeholder="10"
      />

      <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
        {isEdit ? "Lưu thay đổi" : "Thêm danh mục"}
      </button>
    </form>
  );
}
