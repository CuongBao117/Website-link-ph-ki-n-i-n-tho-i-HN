import ProductImageManager from "@/components/ProductImageManager";
import SlugField from "@/components/SlugField";

export default function ProductForm({ action, categoryGroups, defaultValues, isEdit }) {
  const v = defaultValues || {};
  const specsText = (v.specs || []).map(([label, value]) => `${label}|${value}`).join("\n");
  const variantsText = (v.variants || []).join(", ");

  // Sản phẩm đang sửa có thể đang thuộc 1 danh mục đã bị gỡ khỏi menu (mồ côi) — danh mục đó
  // không nằm trong categoryGroups nên sẽ không có option nào khớp. Phải tự thêm option cảnh
  // báo, nếu không trình duyệt sẽ ngầm chọn đại option đầu tiên và admin lưu lại sẽ vô tình
  // đổi category của sản phẩm mà không biết.
  const allListedSlugs = categoryGroups.flatMap((g) => g.categories.map((c) => c.slug));
  const currentCategoryIsOrphan = Boolean(v.category) && !allListedSlugs.includes(v.category);

  return (
    <form action={action} className="checkout-form" style={{ maxWidth: 640 }}>
      <label>Mã sản phẩm (slug — dùng trong link, không dấu, cách nhau bằng gạch ngang)</label>
      <SlugField defaultValue={v.slug} disabled={isEdit} />

      <label>Mã hàng nội bộ (code)</label>
      <input name="code" defaultValue={v.code} placeholder="LK-IP13-SCR-001" required />

      <label>Tên sản phẩm</label>
      <input name="name" defaultValue={v.name} placeholder="Màn hình iPhone 13 — Zin bóc máy" required />

      <label>Hình ảnh sản phẩm (có thể thêm nhiều ảnh)</label>
      <ProductImageManager initialImages={v.images || (v.imageUrl ? [v.imageUrl] : [])} />

      <label>Hãng (dùng để lọc — hãng điện thoại tương thích với linh kiện, hoặc hãng phụ kiện như Hoco, Baseus...)</label>
      <input name="brand" defaultValue={v.brand} placeholder="iPhone / Samsung / Hoco / Baseus..." />

      <label>Danh mục</label>
      <select
        name="category"
        defaultValue={v.category || categoryGroups[0]?.categories[0]?.slug}
        required
        style={{
          border: "1.5px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: "11px 14px",
          fontSize: 14,
        }}
      >
        {/* Chỉ liệt kê danh mục đang thuộc 1 nhóm lớn (còn hiện trên site) — danh mục đã bị
            gỡ khỏi menu (xem /admin/categories) không xuất hiện ở đây, tránh lỡ gán sản phẩm
            vào 1 danh mục mà khách không tài nào thấy được trên trang chủ/mega menu. */}
        {currentCategoryIsOrphan && (
          <option value={v.category}>⚠ {v.category} (đã gỡ khỏi menu — chọn danh mục khác bên dưới)</option>
        )}
        {categoryGroups.map((g) => (
          <optgroup key={g.slug} label={g.name}>
            {g.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {currentCategoryIsOrphan && (
        <div style={{ fontSize: 12, color: "#B0503A", marginTop: 4 }}>
          Sản phẩm này đang ở danh mục "{v.category}" — danh mục đó đã bị gỡ khỏi menu nên khách sẽ không
          thấy được qua trang chủ/mega menu. Nên chọn lại 1 danh mục đang hoạt động ở trên.
        </div>
      )}

      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <label>Giá bán (đ)</label>
          <input type="number" name="price" defaultValue={v.price} placeholder="890000" required min="0" />
        </div>
        <div style={{ flex: 1 }}>
          <label>Giá gốc (đ) — để trống nếu không giảm giá</label>
          <input type="number" name="oldPrice" defaultValue={v.oldPrice || ""} placeholder="1050000" min="0" />
        </div>
      </div>

      <label>Các dòng máy / phiên bản (cách nhau bằng dấu phẩy)</label>
      <input
        name="variants"
        defaultValue={variantsText}
        placeholder="iPhone 13, iPhone 13 Pro, iPhone 13 Pro Max"
      />

      <label>Dòng máy mặc định (phải khớp đúng 1 trong các dòng ở trên)</label>
      <input name="defaultVariant" defaultValue={v.defaultVariant} placeholder="iPhone 13" />

      <label>
        Thông số kỹ thuật — mỗi dòng 1 thông số, dạng <code>Tên|Giá trị</code>
      </label>
      <textarea
        name="specs"
        defaultValue={specsText}
        rows="5"
        placeholder={"Loại hàng|Zin bóc máy, đã kiểm tra\nBảo hành|3 tháng 1 đổi 1"}
      />

      <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
        {isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
      </button>
    </form>
  );
}
