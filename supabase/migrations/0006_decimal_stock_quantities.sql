-- =====================================================================
-- Cho phép số lượng tồn kho có phần thập phân (vd: 525.9 kg, 31.51 kg) —
-- cần thiết từ khi có đơn vị tính Kg/Mét. Trước đây các cột này là
-- "integer" nên nhập số lẻ sẽ báo lỗi "invalid input syntax for type
-- integer" và tồn kho của dòng đó bị bỏ qua (thành 0) một cách âm thầm.
-- An toàn để chạy lại nhiều lần.
-- =====================================================================

-- Phải xóa các view phụ thuộc trước khi đổi kiểu cột "quantity", vì Postgres
-- không cho alter column khi còn view tham chiếu đến nó.
drop view if exists inventory_value cascade;
drop view if exists low_stock_variants cascade;
drop view if exists variant_total_stock cascade;

alter table inventory_stock alter column quantity type numeric(14,3) using quantity::numeric(14,3);
alter table inventory_stock alter column quantity set default 0;

alter table stock_ledger alter column quantity_change type numeric(14,3) using quantity_change::numeric(14,3);
alter table stock_ledger alter column balance_after type numeric(14,3) using balance_after::numeric(14,3);

alter table purchase_order_items alter column quantity type numeric(14,3) using quantity::numeric(14,3);
alter table purchase_order_items drop constraint if exists purchase_order_items_quantity_check;
alter table purchase_order_items add constraint purchase_order_items_quantity_check check (quantity > 0);

alter table stock_count_items alter column system_quantity type numeric(14,3) using system_quantity::numeric(14,3);
alter table stock_count_items alter column counted_quantity type numeric(14,3) using counted_quantity::numeric(14,3);

alter table stock_transfer_items alter column quantity type numeric(14,3) using quantity::numeric(14,3);
alter table stock_transfer_items drop constraint if exists stock_transfer_items_quantity_check;
alter table stock_transfer_items add constraint stock_transfer_items_quantity_check check (quantity > 0);

alter table product_variants alter column low_stock_threshold type numeric(14,3) using low_stock_threshold::numeric(14,3);
alter table product_variants alter column low_stock_threshold set default 5;

alter table stock_lots alter column quantity type numeric(14,3) using quantity::numeric(14,3);

create view variant_total_stock with (security_invoker = true) as
select variant_id, sum(quantity)::numeric(14,3) as total_quantity
from inventory_stock
group by variant_id;

create view low_stock_variants with (security_invoker = true) as
select
  v.id as variant_id,
  v.product_id,
  v.sku,
  v.low_stock_threshold,
  coalesce(s.total_quantity, 0) as total_quantity
from product_variants v
left join variant_total_stock s on s.variant_id = v.id
where v.is_active and coalesce(s.total_quantity, 0) <= v.low_stock_threshold;

create view inventory_value with (security_invoker = true) as
select v.id as variant_id, v.product_id, v.sku, v.attributes, v.cost_price,
  v.low_stock_threshold, v.is_active,
  coalesce(s.total_quantity, 0) as total_quantity,
  coalesce(s.total_quantity, 0) * v.cost_price as stock_value
from product_variants v
left join variant_total_stock s on s.variant_id = v.id;
