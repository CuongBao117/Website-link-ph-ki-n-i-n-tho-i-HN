import ProductImageManager from "@/components/ProductImageManager";
import SlugField from "@/components/SlugField";

export default function ProductForm({ action, categories, defaultValues, isEdit }) {
  const v = defaultValues || {};
  const specsText = (v.specs || []).map(([label, value]) => `${label}|${value}`).join("\n");
  const variantsText = (v.variants || []).join(", ");

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
        defaultValue={v.category || (categories[0] && categories[0].slug)}
        required
        style={{
          border: "1.5px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: "11px 14px",
          fontSize: 14,
        }}
      >
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <label>Giá bán (đ)</label>
          <input type="number" name="price" defaultValue={v.price} placeholder="890000" required min="0" />
        </div>
        <div style={{ flex: 1 }}>
          <label>Giá gốc (đ) — để trống nếu không giảm giá</label>
          <input type="number" name="oldPrice" defaultValue={v.oldPrice || ""} placeholder="1050000" min="0" />
        </div>
        <div style={{ flex: 1 }}>
          <label>Tồn kho</label>
          <input type="number" name="stock" defaultValue={v.stock ?? 0} placeholder="10" required min="0" />
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
