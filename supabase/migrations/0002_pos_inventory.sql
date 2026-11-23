-- =====================================================================
-- Giai đoạn 2A: nền tảng Kho hàng & Sản phẩm (biến thể, bảng giá, kho,
-- nhập/kiểm/chuyển kho, thẻ kho, khách hàng tối thiểu).
-- Chạy SAU khi đã chạy 0001_init.sql. An toàn để chạy lại nhiều lần.
-- =====================================================================

-- ========== BIẾN THỂ SẢN PHẨM ==========

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  barcode text unique,
  attributes jsonb not null default '{}'::jsonb,
  cost_price numeric(12,0) not null default 0,
  low_stock_threshold integer not null default 5,
  track_lot boolean not null default false,
  track_serial boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_variants_product on product_variants(product_id);

drop trigger if exists trg_variants_updated_at on product_variants;
create trigger trg_variants_updated_at
before update on product_variants
for each row execute function set_updated_at();

-- ========== BẢNG GIÁ ==========

create table if not exists price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

insert into price_lists (name, is_default)
select 'Giá bán lẻ', true
where not exists (select 1 from price_lists where is_default = true);

insert into price_lists (name, is_default)
select 'Giá bán sỉ', false
where not exists (select 1 from price_lists where name = 'Giá bán sỉ');

insert into price_lists (name, is_default)
select 'Giá đại lý', false
where not exists (select 1 from price_lists where name = 'Giá đại lý');

create table if not exists price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references price_lists(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  price numeric(12,0) not null check (price >= 0),
  unique (price_list_id, variant_id)
);

create index if not exists idx_price_list_items_variant on price_list_items(variant_id);

-- ========== KHO ==========

create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

insert into warehouses (name, is_default)
select 'Kho chính', true
where not exists (select 1 from warehouses where is_default = true);

create table if not exists inventory_stock (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  quantity integer not null default 0,
  unique (variant_id, warehouse_id)
);

create index if not exists idx_inventory_stock_variant on inventory_stock(variant_id);
create index if not exists idx_inventory_stock_warehouse on inventory_stock(warehouse_id);

create table if not exists stock_ledger (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  change_type text not null check (change_type in
    ('purchase', 'sale', 'sale_return', 'transfer_out', 'transfer_in', 'count_adjustment', 'manual')),
  quantity_change integer not null,
  balance_after integer not null,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_ledger_variant on stock_ledger(variant_id, created_at desc);
create index if not exists idx_stock_ledger_reference on stock_ledger(reference_type, reference_id);

create table if not exists stock_lots (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  lot_code text not null,
  expiry_date date,
  quantity integer not null default 0,
  cost_price numeric(12,0) not null default 0,
  received_at timestamptz not null default now()
);

create index if not exists idx_stock_lots_variant on stock_lots(variant_id);
create index if not exists idx_stock_lots_expiry on stock_lots(expiry_date);

create table if not exists stock_serials (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  warehouse_id uuid references warehouses(id) on delete set null,
  serial_no text not null unique,
  status text not null default 'in_stock' check (status in ('in_stock', 'sold', 'returned')),
  lot_id uuid references stock_lots(id) on delete set null,
  order_item_id uuid references order_items(id) on delete set null,
  received_at timestamptz not null default now()
);

create index if not exists idx_stock_serials_variant on stock_serials(variant_id);

-- ========== NHÀ CUNG CẤP & PHIẾU NHẬP HÀNG ==========

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  supplier_id uuid references suppliers(id) on delete set null,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'received', 'cancelled')),
  other_cost numeric(12,0) not null default 0,
  total_amount numeric(12,0) not null default 0,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  received_at timestamptz
);

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,0) not null check (unit_cost >= 0),
  lot_code text,
  expiry_date date
);

create index if not exists idx_po_items_po on purchase_order_items(purchase_order_id);

-- ========== KIỂM KHO ==========

create table if not exists stock_counts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists stock_count_items (
  id uuid primary key default gen_random_uuid(),
  stock_count_id uuid not null references stock_counts(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete restrict,
  system_quantity integer not null,
  counted_quantity integer not null
);

create index if not exists idx_count_items_count on stock_count_items(stock_count_id);

-- ========== ĐIỀU CHUYỂN KHO ==========

create table if not exists stock_transfers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  from_warehouse_id uuid not null references warehouses(id) on delete restrict,
  to_warehouse_id uuid not null references warehouses(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (from_warehouse_id <> to_warehouse_id)
);

create table if not exists stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  stock_transfer_id uuid not null references stock_transfers(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0)
);

create index if not exists idx_transfer_items_transfer on stock_transfer_items(stock_transfer_id);

-- ========== KHÁCH HÀNG (tối thiểu — CRM đầy đủ làm ở giai đoạn sau) ==========

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_phone on customers(phone);

-- ========== DI CHUYỂN DỮ LIỆU CŨ SANG MODEL MỚI ==========
-- Mỗi sản phẩm hiện có (từ 0001_init.sql) -> 1 biến thể mặc định, giá cũ vào
-- bảng giá mặc định, tồn kho cũ vào kho mặc định. Phải làm TRƯỚC khi xoá cột
-- price/compare_at_price/stock khỏi products ở cuối file.

do $$
declare
  default_price_list_id uuid;
  default_warehouse_id uuid;
begin
  select id into default_price_list_id from price_lists where is_default = true limit 1;
  select id into default_warehouse_id from warehouses where is_default = true limit 1;

  insert into product_variants (product_id, sku, attributes, cost_price, is_active)
  select p.id, upper(p.slug), '{}'::jsonb, 0, p.is_active
  from products p
  where not exists (select 1 from product_variants v where v.product_id = p.id);

  insert into price_list_items (price_list_id, variant_id, price)
  select default_price_list_id, v.id, p.price
  from product_variants v
  join products p on p.id = v.product_id
  where not exists (
    select 1 from price_list_items pli
    where pli.price_list_id = default_price_list_id and pli.variant_id = v.id
  );

  insert into inventory_stock (variant_id, warehouse_id, quantity)
  select v.id, default_warehouse_id, p.stock
  from product_variants v
  join products p on p.id = v.product_id
  where not exists (
    select 1 from inventory_stock s
    where s.warehouse_id = default_warehouse_id and s.variant_id = v.id
  );
end $$;

-- ========== CẬP NHẬT ORDERS / ORDER_ITEMS ==========

alter table order_items add column if not exists variant_id uuid references product_variants(id) on delete set null;

update order_items oi
set variant_id = v.id
from product_variants v
where oi.variant_id is null and oi.product_id is not null and v.product_id = oi.product_id;

alter table order_items drop column if exists product_id;

alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
alter table orders add column if not exists paid_amount numeric(12, 0) not null default 0;
alter table orders add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table orders add column if not exists payment_method text not null default 'cash';

alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('cash', 'card', 'transfer', 'credit'));

-- ========== XOÁ CỘT GIÁ/TỒN CŨ KHỎI PRODUCTS ==========
-- Giờ nằm ở product_variants (giá vốn) / price_list_items (giá bán) / inventory_stock (tồn).

alter table products drop column if exists price;
alter table products drop column if exists compare_at_price;
alter table products drop column if exists stock;

-- ========== VIEW TIỆN ÍCH ==========

create or replace view variant_total_stock with (security_invoker = true) as
select variant_id, sum(quantity)::int as total_quantity
from inventory_stock
group by variant_id;

create or replace view low_stock_variants with (security_invoker = true) as
select
  v.id as variant_id,
  v.product_id,
  v.sku,
  v.low_stock_threshold,
  coalesce(s.total_quantity, 0) as total_quantity
from product_variants v
left join variant_total_stock s on s.variant_id = v.id
where v.is_active and coalesce(s.total_quantity, 0) <= v.low_stock_threshold;

-- ========== ROW LEVEL SECURITY ==========
-- Nguyên tắc giữ nguyên từ 0001: anon chỉ đọc những gì cần hiển thị công khai
-- (biến thể/giá bán lẻ/tồn kho của sản phẩm active); mọi thứ nội bộ (kho vận,
-- nhập hàng, kiểm/chuyển kho, nhà cung cấp, khách hàng) chỉ "authenticated".

alter table product_variants enable row level security;
alter table price_lists enable row level security;
alter table price_list_items enable row level security;
alter table warehouses enable row level security;
alter table inventory_stock enable row level security;
alter table stock_ledger enable row level security;
alter table stock_lots enable row level security;
alter table stock_serials enable row level security;
alter table suppliers enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
alter table stock_counts enable row level security;
alter table stock_count_items enable row level security;
alter table stock_transfers enable row level security;
alter table stock_transfer_items enable row level security;
alter table customers enable row level security;

drop policy if exists "variants_select_active_or_admin" on product_variants;
create policy "variants_select_active_or_admin" on product_variants for select
  using (
    auth.role() = 'authenticated'
    or (is_active = true and exists (
      select 1 from products p where p.id = product_variants.product_id and p.is_active = true
    ))
  );

drop policy if exists "variants_write_admin" on product_variants;
create policy "variants_write_admin" on product_variants for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "price_lists_select_all" on price_lists;
create policy "price_lists_select_all" on price_lists for select
  using (true);

drop policy if exists "price_lists_write_admin" on price_lists;
create policy "price_lists_write_admin" on price_lists for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "price_list_items_select_default_or_admin" on price_list_items;
create policy "price_list_items_select_default_or_admin" on price_list_items for select
  using (
    auth.role() = 'authenticated'
    or exists (select 1 from price_lists pl where pl.id = price_list_items.price_list_id and pl.is_default = true)
  );

drop policy if exists "price_list_items_write_admin" on price_list_items;
create policy "price_list_items_write_admin" on price_list_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "warehouses_admin_only" on warehouses;
create policy "warehouses_admin_only" on warehouses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "inventory_stock_select_active_or_admin" on inventory_stock;
create policy "inventory_stock_select_active_or_admin" on inventory_stock for select
  using (
    auth.role() = 'authenticated'
    or exists (
      select 1 from product_variants v
      join products p on p.id = v.product_id
      where v.id = inventory_stock.variant_id and v.is_active and p.is_active
    )
  );

drop policy if exists "inventory_stock_write_admin" on inventory_stock;
create policy "inventory_stock_write_admin" on inventory_stock for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "stock_ledger_admin_only" on stock_ledger;
create policy "stock_ledger_admin_only" on stock_ledger for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "stock_lots_admin_only" on stock_lots;
create policy "stock_lots_admin_only" on stock_lots for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "stock_serials_admin_only" on stock_serials;
create policy "stock_serials_admin_only" on stock_serials for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "suppliers_admin_only" on suppliers;
create policy "suppliers_admin_only" on suppliers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "purchase_orders_admin_only" on purchase_orders;
create policy "purchase_orders_admin_only" on purchase_orders for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "purchase_order_items_admin_only" on purchase_order_items;
create policy "purchase_order_items_admin_only" on purchase_order_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "stock_counts_admin_only" on stock_counts;
create policy "stock_counts_admin_only" on stock_counts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "stock_count_items_admin_only" on stock_count_items;
create policy "stock_count_items_admin_only" on stock_count_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "stock_transfers_admin_only" on stock_transfers;
create policy "stock_transfers_admin_only" on stock_transfers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "stock_transfer_items_admin_only" on stock_transfer_items;
create policy "stock_transfer_items_admin_only" on stock_transfer_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "customers_admin_only" on customers;
create policy "customers_admin_only" on customers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
