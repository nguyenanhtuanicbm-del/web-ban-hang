-- =====================================================================
-- Schema cho website bán lẻ (MVP)
-- Cách dùng: vào Supabase Dashboard > SQL Editor > New query, dán toàn bộ
-- nội dung file này và chạy (Run). An toàn để chạy lại nhiều lần.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ========== BẢNG ==========

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,0) not null check (price >= 0),
  compare_at_price numeric(12,0) check (compare_at_price is null or compare_at_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  category_id uuid references categories(id) on delete set null,
  images jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text not null,
  phone text not null,
  address text,
  note text,
  status text not null default 'new' check (status in ('new', 'processing', 'completed', 'cancelled')),
  source text not null default 'online' check (source in ('online', 'in_store')),
  total numeric(12,0) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,0) not null,
  quantity integer not null check (quantity > 0)
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_is_active on products(is_active);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_orders_created_at on orders(created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

-- ========== ROW LEVEL SECURITY ==========
-- Nguyên tắc: khách vãng lai (role "anon") chỉ được ĐỌC sản phẩm/danh mục đang
-- active. Tạo đơn hàng chỉ được thực hiện qua API route (dùng service role key,
-- bỏ qua RLS) để server tự tính lại giá/trừ tồn kho — khách không insert trực
-- tiếp vào orders/order_items được. Admin đăng nhập (role "authenticated") có
-- toàn quyền trên mọi bảng.

alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "categories_select_all" on categories;
create policy "categories_select_all" on categories for select
  using (true);

drop policy if exists "categories_write_admin" on categories;
create policy "categories_write_admin" on categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "products_select_active_or_admin" on products;
create policy "products_select_active_or_admin" on products for select
  using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "products_insert_admin" on products;
create policy "products_insert_admin" on products for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "products_update_admin" on products;
create policy "products_update_admin" on products for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "products_delete_admin" on products;
create policy "products_delete_admin" on products for delete
  using (auth.role() = 'authenticated');

-- orders/order_items: không có policy insert cho anon -> đơn hàng từ khách online
-- chỉ tạo được qua service role (server, bỏ qua RLS). Admin đăng nhập thì có toàn
-- quyền, bao gồm insert để tạo đơn "bán tại cửa hàng" trực tiếp từ phiên đăng nhập.
drop policy if exists "orders_insert_admin" on orders;
create policy "orders_insert_admin" on orders for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "orders_select_admin" on orders;
create policy "orders_select_admin" on orders for select
  using (auth.role() = 'authenticated');

drop policy if exists "orders_update_admin" on orders;
create policy "orders_update_admin" on orders for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "orders_delete_admin" on orders;
create policy "orders_delete_admin" on orders for delete
  using (auth.role() = 'authenticated');

drop policy if exists "order_items_select_admin" on order_items;
create policy "order_items_select_admin" on order_items for select
  using (auth.role() = 'authenticated');

drop policy if exists "order_items_write_admin" on order_items;
create policy "order_items_write_admin" on order_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ========== STORAGE (ảnh sản phẩm) ==========

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- ========== DỮ LIỆU MẪU (xoá phần này nếu không cần demo) ==========

insert into categories (name, slug) values
  ('Áo', 'ao'),
  ('Quần', 'quan'),
  ('Phụ kiện', 'phu-kien')
on conflict (slug) do nothing;

insert into products (name, slug, description, price, compare_at_price, stock, category_id, is_active)
select 'Áo thun cotton basic', 'ao-thun-cotton-basic',
  'Áo thun chất liệu cotton 100%, thoáng mát, nhiều màu sắc.',
  150000, 199000, 50, c.id, true
from categories c where c.slug = 'ao'
on conflict (slug) do nothing;

insert into products (name, slug, description, price, compare_at_price, stock, category_id, is_active)
select 'Quần jean slimfit', 'quan-jean-slimfit',
  'Quần jean dáng slimfit, co giãn nhẹ, dễ phối đồ.',
  350000, null, 30, c.id, true
from categories c where c.slug = 'quan'
on conflict (slug) do nothing;

insert into products (name, slug, description, price, compare_at_price, stock, category_id, is_active)
select 'Nón lưỡi trai', 'non-luoi-trai',
  'Nón lưỡi trai unisex, điều chỉnh size dễ dàng.',
  99000, null, 80, c.id, true
from categories c where c.slug = 'phu-kien'
on conflict (slug) do nothing;
