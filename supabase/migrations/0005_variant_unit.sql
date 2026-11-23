-- =====================================================================
-- Thêm đơn vị tính (Cái, Kg, Mét, Cây, Bịch...) cho từng biến thể sản phẩm.
-- An toàn để chạy lại nhiều lần.
-- =====================================================================

alter table product_variants add column if not exists unit text not null default 'Cái';
