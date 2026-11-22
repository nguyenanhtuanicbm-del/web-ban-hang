# Website bán hàng (MVP)

Website bán lẻ cho cửa hàng của bạn: trang bán hàng online (xem sản phẩm, giỏ hàng, đặt hàng) +
trang quản trị (sản phẩm, danh mục, đơn hàng, bán tại cửa hàng). Build bằng Next.js, lưu dữ liệu
trên Supabase, deploy trên Netlify.

Thanh toán hiện tại: **COD / thanh toán tại cửa hàng** (chưa tích hợp cổng thanh toán online).

## 1. Tạo project Supabase (database + đăng nhập admin)

1. Vào https://supabase.com → **New project** (có free tier). Đặt tên và mật khẩu database tùy ý, chọn region gần Việt Nam (Singapore).
2. Sau khi project tạo xong, vào **SQL Editor** → **New query**, dán toàn bộ nội dung file [`supabase/schema.sql`](supabase/schema.sql) và bấm **Run**.
   - Script sẽ tạo đủ bảng `categories`, `products`, `orders`, `order_items`, thiết lập Row Level Security, tạo bucket ảnh `product-images`, và thêm vài danh mục/sản phẩm mẫu để bạn xem thử ngay.
3. Vào **Authentication → Users** → **Add user** → tạo tài khoản admin đầu tiên (email + mật khẩu). Đây là tài khoản bạn dùng để đăng nhập trang `/admin`.
4. Vào **Project Settings → API**, lấy 3 giá trị:
   - `Project URL` → dùng cho `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → dùng cho `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (bấm "Reveal") → dùng cho `SUPABASE_SERVICE_ROLE_KEY` — **giữ bí mật, không commit lên git, không lộ ra frontend**.

## 2. Chạy thử ở máy local

```bash
npm install
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
```

Mở `.env.local`, điền 3 giá trị Supabase vừa lấy ở bước 1, rồi:

```bash
npm run dev
```

Mở http://localhost:3000 để xem trang bán hàng, http://localhost:3000/admin/login để đăng nhập quản trị (dùng tài khoản đã tạo ở bước 1.3).

## 3. Deploy lên Netlify

### Cách 1 — qua Git (khuyên dùng, tự deploy lại mỗi khi push code)

1. Đẩy code lên một repo GitHub/GitLab của bạn.
2. Vào https://app.netlify.com → **Add new site → Import an existing project** → chọn repo.
3. Netlify tự nhận diện Next.js (nhờ `netlify.toml` + plugin `@netlify/plugin-nextjs` đã cấu hình sẵn), không cần sửa build command/publish directory.
4. Vào **Site configuration → Environment variables**, thêm 3 biến giống file `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (tùy chọn) `NEXT_PUBLIC_STORE_NAME` — tên cửa hàng hiển thị trên website
5. Bấm **Deploy site**.

### Cách 2 — Netlify CLI (deploy trực tiếp từ máy, không cần GitHub)

```bash
npm install -g netlify-cli
netlify login
netlify init      # tạo site mới trên Netlify, chọn theo hướng dẫn
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://xxxx.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "..."
netlify env:set SUPABASE_SERVICE_ROLE_KEY "..."
netlify deploy --prod
```

## 4. Dùng trang quản trị

- `/admin/login` — đăng nhập bằng tài khoản Supabase Auth đã tạo.
- `/admin` — tổng quan (đơn mới, doanh thu hôm nay, sản phẩm sắp hết hàng).
- `/admin/san-pham` — thêm/sửa/xóa sản phẩm, upload ảnh.
- `/admin/danh-muc` — thêm/sửa/xóa danh mục.
- `/admin/don-hang` — xem đơn hàng khách đặt online, cập nhật trạng thái (Mới / Đang xử lý / Hoàn thành / Đã hủy).
- `/admin/ban-tai-cua-hang` — tạo nhanh đơn hàng khi khách mua trực tiếp tại cửa hàng (tự trừ tồn kho, đánh dấu hoàn thành ngay).

## Giới hạn của bản MVP này

- Chưa tích hợp cổng thanh toán online (VNPay/Momo/Stripe...) — chỉ COD/thanh toán tại cửa hàng.
- Một tài khoản admin dùng chung (chưa phân quyền nhiều nhân viên).
- Chưa có báo cáo/thống kê nâng cao, chưa bán đa kênh (Facebook/Shopee/TikTok).

Những phần này có thể bổ sung sau khi MVP chạy ổn.
