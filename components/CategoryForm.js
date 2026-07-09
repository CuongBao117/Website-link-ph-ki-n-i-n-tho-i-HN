export default function CategoryForm({ action, defaultValues, isEdit }) {
  const v = defaultValues || {};

  return (
    <form action={action} className="checkout-form" style={{ maxWidth: 480 }}>
      <label>Mã danh mục (slug — dùng trong link, không dấu, cách nhau bằng gạch ngang)</label>
      <input
        name="slug"
        defaultValue={v.slug}
        placeholder="op-lung"
        required
        disabled={isEdit}
        style={isEdit ? { background: "#F0F2EF", color: "var(--ink-soft)" } : undefined}
      />

      <label>Mã nội bộ (code)</label>
      <input name="code" defaultValue={v.code} placeholder="PK-09" required />

      <label>Tên danh mục hiển thị</label>
      <input name="name" defaultValue={v.name} placeholder="Ốp lưng" required />

      <label>Thuộc nhóm lớn</label>
      <select
        name="groupSlug"
        defaultValue={v.group_slug || "linh-kien"}
        required
        style={{
          border: "1.5px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: "11px 14px",
          fontSize: 14,
        }}
      >
        <option value="linh-kien">Linh kiện</option>
        <option value="phu-kien">Phụ kiện</option>
        <option value="do-nghe">Đồ nghề</option>
      </select>

      <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
        {isEdit ? "Lưu thay đổi" : "Thêm danh mục"}
      </button>
    </form>
  );
}
