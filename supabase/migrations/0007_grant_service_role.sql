-- =====================================================================
-- service_role (dùng ở server cho các route cần bỏ qua RLS, vd đặt hàng công khai)
-- vẫn cần GRANT cấp bảng như mọi role khác — RLS bypass không thay thế quyền bảng.
-- An toàn để chạy lại nhiều lần.
-- =====================================================================

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
