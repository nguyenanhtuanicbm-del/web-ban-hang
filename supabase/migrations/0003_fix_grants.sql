-- =====================================================================
-- Sửa lỗi "permission denied for table ..." (mã lỗi Postgres 42501).
-- Nguyên nhân: tạo bảng qua SQL Editor không tự cấp quyền SELECT/INSERT/...
-- ở mức bảng cho role anon/authenticated — RLS (đã cấu hình ở các migration
-- trước) chỉ lọc ĐƯỢC HÀNG NÀO sau khi role đã có quyền truy cập bảng đó.
-- An toàn để chạy lại nhiều lần.
-- =====================================================================

grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Áp dụng luôn cho các bảng được tạo sau này (không phải lặp lại bước này mỗi lần thêm bảng mới).
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
