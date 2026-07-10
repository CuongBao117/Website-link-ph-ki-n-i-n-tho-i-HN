# Hướng dẫn áp dụng bản vá bảo mật (mục 1 & 2)

## 1. Giải nén / copy đè vào project

Giải nén zip này, copy đè 8 file bên trong vào đúng vị trí tương ứng trong project
(giữ nguyên đường dẫn thư mục — kể cả thư mục có dấu ngoặc `(protected)`):

- `lib/adminAuth.js`
- `app/admin/login/actions.js`
- `app/admin/(protected)/layout.js`
- `app/admin/(protected)/orders/actions.js`
- `app/admin/(protected)/products/actions.js`
- `app/admin/(protected)/products/import/actions.js`
- `app/admin/(protected)/categories/actions.js`
- `components/Header.js`

## 2. XOÁ 2 mục sau (zip không tự xoá được, phải tự làm bằng tay)

- Xoá cả thư mục: `app/tra-cuu-don-hang/` (gồm `page.js` và `actions.js`)
- Xoá file: `components/OrderLookupForm.js`

Trong Git Bash:
```bash
rm -rf "app/tra-cuu-don-hang"
rm "components/OrderLookupForm.js"
```

## 3. Kiểm tra biến môi trường

`ADMIN_SESSION_SECRET` đã có trong `.env.local` của bạn rồi — không cần thêm lại ở máy local.
Nhưng **nhớ thêm biến này lên Vercel** (Project Settings → Environment Variables) nếu chưa
thêm, nếu không khi deploy admin sẽ không đăng nhập được (session không tạo ra được chữ ký hợp lệ).

## 4. Sau khi deploy — đăng nhập lại admin 1 lần

Tên cookie phiên đăng nhập đã đổi từ `admin_auth` sang `admin_session` (đúng ý đồ — để
cookie cũ, nếu từng bị lộ, không còn dùng lại được nữa). Vì vậy:

- Nếu bạn đang đăng nhập sẵn trên trình duyệt, sau khi deploy bản này bạn sẽ bị đá về
  trang `/admin/login` — **đây là điều bình thường, không phải lỗi**. Đăng nhập lại 1 lần
  bằng đúng `ADMIN_PASSWORD` như cũ là xong.

## 5. Tóm tắt đã sửa gì

**Mục 1 — mọi Server Action chỉnh sửa dữ liệu (sản phẩm, danh mục, nhập CSV) giờ đều tự
kiểm tra đăng nhập admin ngay trong thân hàm**, không còn dựa hoàn toàn vào layout bảo vệ
trang (vì Server Action gọi thẳng được, không bắt buộc phải "đi qua" layout).

**Mục 2 — `lib/adminAuth.js` (chữ ký HMAC) giờ mới thực sự được dùng**: đăng nhập, đăng
xuất, layout bảo vệ, và các Server Action ở trên đều dùng chung `isAdminAuthed()` /
`requireAdmin()`. Cookie không còn lưu thẳng mật khẩu nữa.

**Tra cứu đơn hàng — đã tạm gỡ hoàn toàn** (xoá route, xoá link ở header, xoá component
form) để không còn lỗ hổng dò số điện thoại. Sẽ làm lại sau khi có đăng nhập khách hàng.

## Chưa đụng tới (còn để nguyên, chưa phải phạm vi lần này)

- Link `/admin` vẫn còn ở Footer (chưa gỡ)
- Đăng nhập admin vẫn chưa có chống dò mật khẩu (rate limit / khoá tài khoản)
- Phần tồn kho: giữ nguyên cơ chế cũ (stock cố định 9999, không quản lý theo từng sản phẩm)
  theo đúng yêu cầu — không đổi gì ở đây.
