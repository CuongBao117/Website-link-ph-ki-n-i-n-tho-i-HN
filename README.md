# LinhKien.Store

Khung code Next.js cho web bán linh kiện điện thoại & phụ kiện điện tử (loa, tai nghe, sạc, cáp...). Không có sửa chữa, không bán sim số.

## Cấu trúc thư mục

```
linhkien-store/
├── app/
│   ├── layout.js                          # Layout gốc: load font, bọc CartProvider/Header/Footer
│   ├── page.js                             # Trang chủ (đọc sản phẩm/danh mục từ Supabase)
│   ├── globals.css                         # Toàn bộ style + design tokens
│   ├── san-pham/[slug]/page.js            # Trang chi tiết sản phẩm
│   ├── danh-muc/[slug]/page.js            # Trang danh mục
│   ├── gio-hang/page.js                    # Trang giỏ hàng
│   ├── dat-hang/page.js                    # Trang đặt hàng COD (lưu vào Supabase)
│   └── admin/
│       ├── page.js                         # Tự chuyển hướng vào /admin/orders
│       ├── login/                          # Đăng nhập admin bằng mật khẩu
│       └── (protected)/                    # Mọi trang trong đây yêu cầu đăng nhập
│           ├── layout.js                   # Kiểm tra đăng nhập + thanh điều hướng admin
│           ├── orders/                     # Xem đơn hàng, đổi trạng thái
│           └── products/                   # Quản lý sản phẩm (thêm/sửa/xoá)
│               ├── page.js                 # Danh sách sản phẩm
│               ├── new/page.js             # Form thêm mới
│               ├── [slug]/edit/page.js     # Form sửa
│               └── actions.js              # Server Actions: create/update/delete
├── components/
│   ├── Header.js                           # Server Component, lấy danh mục từ Supabase
│   ├── CartBadge.js                        # Client Component: số lượng giỏ hàng
│   ├── ProductForm.js                      # Form dùng chung cho thêm/sửa sản phẩm
│   ├── DeleteProductButton.js              # Nút xoá sản phẩm (có xác nhận)
│   ├── OrderStatusSelect.js                # Dropdown đổi trạng thái đơn hàng
│   ├── ProductPurchasePanel.js             # Chọn dòng máy/số lượng, khoá khi hết hàng
│   └── ... (Footer, Hero, TrustStrip, CategoryGrid, ProductGrid, CategoryProductList)
├── context/
│   └── CartContext.js                      # State giỏ hàng, lưu localStorage
├── lib/
│   ├── supabase.js                         # Khoá anon — dùng ở trang bán hàng (chỉ đọc)
│   └── supabaseAdmin.js                    # Khoá service_role — CHỈ dùng trong trang admin
├── data/
│   └── products.js                         # Hàm đọc sản phẩm/danh mục từ Supabase
└── supabase/
    └── products_schema.sql                 # Script tạo bảng categories + products (chạy 1 lần)
```

## Cách chạy thử trên máy của bạn

Cần cài **Node.js** (bản 18 trở lên): https://nodejs.org

```bash
cd linhkien-store
npm install
npm run dev
```

Mở trình duyệt tại: http://localhost:3000

## Thiết lập database (làm 1 lần)

### 1. Tạo bảng `products` và `categories`

Vào Supabase Dashboard → **SQL Editor** → **New query** → dán toàn bộ nội dung file `supabase/products_schema.sql` → bấm **Run**.

Script này tự tạo bảng, bật bảo vệ dữ liệu (RLS — chỉ cho đọc công khai, không cho ai ghi/sửa/xoá qua API ngoại trừ trang admin), và chèn sẵn 4 sản phẩm mẫu để bạn test ngay (có 1 sản phẩm cố tình để tồn kho = 0 để bạn thấy trạng thái "Hết hàng" hoạt động).

### 2. Điền `.env.local`

Nếu bạn đã làm phần trang quản trị đơn hàng trước đó thì 2 biến này chắc đã có sẵn — chỉ cần đảm bảo tồn tại:

```
SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings → API → "service_role"
ADMIN_PASSWORD=...              # mật khẩu bạn tự đặt
```

⚠️ `service_role` có toàn quyền trên database — không thêm tiền tố `NEXT_PUBLIC_`, không đưa lên GitHub công khai.

Sau khi chạy xong SQL và điền `.env.local`, tắt server (`Ctrl+C`) → `npm run dev` lại → vào `http://localhost:3000/admin/products`.

## Trạng thái hiện tại

- ✅ Trang chủ, danh mục, chi tiết sản phẩm, giỏ hàng, đặt hàng COD — **toàn bộ đã đọc/ghi từ Supabase thật**, không còn dữ liệu mẫu trong code
- ✅ **`/admin/orders`**: xem đơn hàng, **tìm kiếm** (mã đơn/tên/SĐT), **lọc theo trạng thái**, **phân trang**, đổi trạng thái
- ✅ **`/admin/orders/history`**: lịch sử đơn **Đã giao / Đã huỷ**, lọc theo khoảng ngày, hiện tổng doanh thu của bộ lọc
- ✅ **Thông báo đơn hàng mới**: khi có đơn "Chờ xác nhận" mới xuất hiện (kiểm tra mỗi 20 giây), admin sẽ nghe tiếng "beep", thấy toast nổi góc màn hình, tiêu đề tab đổi thành "(N) LinhKien.Store", và huy hiệu số đơn chờ hiện ngay trên thanh điều hướng
- ✅ **`/admin/categories`**: xem danh sách kèm số sản phẩm mỗi danh mục, **thêm/sửa/xoá danh mục** (không cho xoá nếu còn sản phẩm thuộc danh mục đó)
- ✅ **`/admin/products`**: xem danh sách (tìm kiếm/lọc/phân trang), **thêm sản phẩm mới**, **sửa**, **xoá** — hỗ trợ **nhiều ảnh cho 1 sản phẩm** (xoá bớt ảnh cũ, thêm ảnh mới, ảnh đầu tiên là ảnh đại diện); trang chi tiết sản phẩm hiện gallery thật, bấm vào thumbnail để đổi ảnh chính
- ✅ **Báo hết hàng tự động**: khi tồn kho = 0, trang sản phẩm hiện badge "HẾT HÀNG", khoá nút mua; ở lưới sản phẩm cũng hiện badge; khi tồn kho ≤ 5 hiện cảnh báo "Chỉ còn X sản phẩm"
- ⏳ Tìm kiếm ở header (phía khách hàng) vẫn là giao diện, chưa hoạt động thật
- ⏳ Đặt hàng **chưa tự động trừ tồn kho** khi khách đặt/khi admin xác nhận đơn — vẫn cần admin tự cập nhật tồn kho trong `/admin/products`
- ⏳ Giá & tồn kho khi đặt hàng vẫn lấy từ giỏ hàng phía trình duyệt (localStorage), chưa được đối chiếu lại với database — nên xử lý sớm để tránh rủi ro

## ⚠️ Cần chạy SQL migration mới nhất

Vào Supabase Dashboard → SQL Editor → chạy lần lượt (nếu chưa chạy trước đó):
1. `supabase/migration_003_admin_upgrades.sql`
2. `supabase/migration_005_category_groups.sql` (đã bao gồm và sửa lại nội dung của migration_004 — chỉ cần chạy 005, không bắt buộc phải chạy 004 trước)

File `migration_005` sẽ: tạo cấu trúc danh mục 2 cấp (Linh kiện / Phụ kiện / Đồ nghề + các danh mục con), và thêm cột `brand` (hãng) cho sản phẩm để phục vụ bộ lọc.

## Những gì vừa cập nhật ở trang chủ & mua hàng

- **Danh mục 2 cấp**: menu đầu trang giờ là "mega menu" — bấm/hover vào Linh kiện / Phụ kiện / Đồ nghề để xổ ra danh mục con
- **Trang chủ chia sản phẩm theo từng danh mục** (mỗi danh mục có sản phẩm mới hiện 1 khối riêng, có link "Xem tất cả")
- **Tìm kiếm hoạt động thật** ở `/tim-kiem` — khớp theo tên sản phẩm, mã sản phẩm, và cả tên máy/dòng máy (variants)
- **Bộ lọc sản phẩm**: hãng, dòng máy/màu, khoảng giá, sắp xếp — có ở cả trang danh mục và trang tìm kiếm, kèm phân trang
- **Hiệu ứng hover ảnh sản phẩm**: di chuột vào hiện 2 nút "Thêm vào giỏ" / "Xem chi tiết"
- **Logo + banner nhiều ảnh xoay vòng** ở đầu trang, đã bỏ sơ đồ linh kiện cũ
- **Nút + phím tắt (gõ phím H) quay lại trang chủ** ở mọi trang (trừ trang chủ)
- Dòng chữ đầu trang đổi thành "Miễn phí giao hàng nội thành cho đơn hàng từ 2.000.000đ"
- Tạm ẩn "Tài khoản" / "Đơn hàng của tôi" ở header — sẽ làm ở đợt sau (đăng ký/đăng nhập)

⚠️ Vì "Cáp & Sạc" và "Loa & Tai nghe" cũ được tách thành nhiều danh mục con mới, sản phẩm ĐANG có trong 2 danh mục cũ này sẽ KHÔNG tự động chuyển — vào `/admin/products`, lọc theo từng danh mục cũ, sửa lại từng sản phẩm sang đúng danh mục con mới (Cóc sạc / Dây sạc / Tai nghe / Loa...). Sau khi chuyển hết, có thể xoá 2 danh mục cũ ở `/admin/categories`.

## Gợi ý các bước tiếp theo

1. **Đăng ký/đăng nhập tài khoản khách hàng** + xem lịch sử đơn đã đặt (đã hoãn lại theo yêu cầu)
2. Trừ tồn kho tự động khi xác nhận đơn, đối chiếu lại giá/tồn kho phía server khi đặt hàng
3. Trang chi tiết đơn hàng, in phiếu giao hàng — ĐÃ XONG
4. Thống kê dạng biểu đồ cho admin

Cứ nói với Claude bước nào bạn muốn làm tiếp.
