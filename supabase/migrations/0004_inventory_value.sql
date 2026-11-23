-- =====================================================================
-- View tổng hợp giá trị tồn kho (số lượng tồn × giá vốn bình quân) theo
-- biến thể, cộng dồn tất cả các kho — phục vụ trang Báo cáo giá trị tồn
-- kho và thẻ "Giá trị tồn kho" ở Tổng quan. An toàn để chạy lại nhiều lần.
-- =====================================================================

create or replace view inventory_value with (security_invoker = true) as
select
  v.id as variant_id,
  v.product_id,
  v.sku,
  v.attributes,
  v.cost_price,
  v.low_stock_threshold,
  v.is_active,
  coalesce(s.total_quantity, 0) as total_quantity,
  coalesce(s.total_quantity, 0) * v.cost_price as stock_value
from product_variants v
left join variant_total_stock s on s.variant_id = v.id;
