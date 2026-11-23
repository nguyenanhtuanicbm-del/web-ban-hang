# Website bán hàng + quản lý kho (Giai đoạn 2A)

Website bán lẻ cho cửa hàng của bạn: trang bán hàng online (xem sản phẩm, giỏ hàng, đặt hàng) +
trang quản trị (sản phẩm theo biến thể/giá, kho hàng, nhập/kiểm/chuyển kho, đơn hàng, khách hàng,
bán tại cửa hàng). Build bằng Next.js, lưu dữ liệu trên Supabase, deploy trên Netlify.

Thanh toán hiện tại: **Tiền mặt / Quẹt thẻ / Chuyển khoản / Bán chịu** (ghi nhận thủ công — chưa
tích hợp cổng thanh toán online hay mã VietQR động, phần đó nằm trong Giai đoạn 2B — màn hình POS).

## 1. Tạo project Supabase (database + đăng nhập admin)

1. Vào https://supabase.com → **New project** (có free tier). Đặt tên và mật khẩu database tùy ý, chọn region gần Việt Nam (Singapore).
2. Vào **SQL Editor** → **New query**, chạy **lần lượt theo đúng thứ tự** 2 file trong [`supabase/migrations/`](supabase/migrations):
   - [`0001_init.sql`](supabase/migrations/0001_init.sql) — tạo bảng cơ bản (danh mục, sản phẩm, đơn hàng), RLS, bucket ảnh, dữ liệu mẫu.
   - [`0002_pos_inventory.sql`](supabase/migrations/0002_pos_inventory.sql) — nâng cấp lên biến thể sản phẩm, nhiều bảng giá, kho hàng, phiếu nhập/kiểm kho/điều chuyển, thẻ kho, khách hàng.
   - Nếu bạn đã chạy `0001_init.sql` từ trước (bản MVP cũ), chỉ cần chạy thêm `0002_pos_inventory.sql` — script sẽ tự chuyển dữ liệu sản phẩm cũ sang model mới (tạo biến thể mặc định, giữ nguyên giá/tồn kho đã có).
   - Cả 2 file an toàn để chạy lại nhiều lần (idempotent).
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

**Bán hàng**
- `/admin` — tổng quan (đơn mới, doanh thu hôm nay, sản phẩm sắp hết hàng).
- `/admin/ban-tai-cua-hang` — tạo nhanh đơn khi khách mua trực tiếp tại cửa hàng (chọn biến thể, hình thức thanh toán kể cả "Bán chịu", tự trừ tồn kho).
- `/admin/don-hang` — xem đơn hàng (online + tại cửa hàng), cập nhật trạng thái, xem công nợ còn lại nếu bán chịu.

**Sản phẩm**
- `/admin/san-pham` — thêm/sửa/xóa sản phẩm; mỗi sản phẩm có thể có nhiều **biến thể** (ví dụ Size/Màu) với SKU, mã vạch, giá bán lẻ, giá vốn riêng; tồn kho ban đầu nhập khi tạo, sau đó chỉ chỉnh qua Nhập hàng/Kiểm kho/Điều chuyển.
- `/admin/danh-muc` — thêm/sửa/xóa danh mục.

**Kho hàng**
- `/admin/kho/kho-hang` — danh sách kho (mặc định có sẵn "Kho chính", có thể thêm kho khác).
- `/admin/kho/nha-cung-cap` — danh sách nhà cung cấp.
- `/admin/kho/phieu-nhap` — tạo phiếu nhập hàng (nhà cung cấp, kho nhập, giá nhập, chi phí khác); khi "Nhận hàng" hệ thống tự cập nhật tồn kho và **tính lại giá vốn bình quân gia quyền**.
- `/admin/kho/kiem-ke` — chọn kho, nhập số lượng kiểm thực tế, "Hoàn tất" để ghi chênh lệch vào tồn kho + thẻ kho.
- `/admin/kho/dieu-chuyen` — chuyển hàng giữa 2 kho (cần ≥ 2 kho).
- `/admin/kho/the-kho` — tra cứu toàn bộ lịch sử xuất/nhập/tồn theo sản phẩm (tìm theo tên hoặc SKU).

**Khách hàng**
- `/admin/khach-hang` — danh sách khách hàng (tên, điện thoại, địa chỉ); tự tạo khi khách đặt hàng online hoặc mua tại cửa hàng theo số điện thoại.

## Lộ trình tiếp theo (chưa làm trong giai đoạn này)

- **Giai đoạn 2B — Màn hình POS thật**: tìm kiếm/scan mã vạch, nhiều tab hóa đơn cùng lúc, giữ đơn nháp, chiết khấu, mã VietQR động, bán hàng offline + đồng bộ, in hóa đơn nhiệt.
- **Khách hàng/Khuyến mãi/Sổ quỹ/Báo cáo/Phân quyền**: phân nhóm khách (lẻ/sỉ/VIP), tích điểm, báo cáo công nợ chi tiết, chương trình khuyến mãi/voucher, sổ quỹ thu-chi, báo cáo lợi nhuận, phân quyền nhân viên theo vai trò.
- **Đa kênh & vận chuyển**: kết nối Shopee/TikTok Shop/Lazada, GHN/GHTK/Viettel Post/Ahamove, hóa đơn điện tử — cần bạn có tài khoản/API/hợp đồng với các bên đó trước.
- **F&B**: không áp dụng (cửa hàng bán lẻ, không chọn module này).

## Giới hạn/đơn giản hoá đã chọn ở Giai đoạn 2A

- Lô hàng/hạn sử dụng và IMEI/Serial: lưu được thông tin, nhưng việc trừ theo lô cụ thể khi bán là thao tác thủ công, chưa tự động theo FEFO.
- Tồn kho cập nhật theo kiểu "đọc — tính — ghi" đơn giản (không dùng transaction DB), phù hợp quy mô 1 cửa hàng, lưu lượng thấp; không đảm bảo tuyệt đối khi có nhiều giao dịch đồng thời cùng 1 sản phẩm.
- Một tài khoản admin dùng chung (chưa phân quyền Admin/Quản lý/Thu ngân/Thủ kho — nằm ở giai đoạn Sổ quỹ/Báo cáo/Phân quyền).
