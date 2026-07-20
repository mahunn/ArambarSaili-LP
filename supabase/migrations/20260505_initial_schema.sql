-- Day 1 base schema for single-product landing + admin order workflow.

create extension if not exists "uuid-ossp";

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  short_description text,
  long_description text,
  base_price numeric(10,2) not null default 0,
  discount_type text not null default 'none' check (discount_type in ('none', 'flat', 'percent')),
  discount_value numeric(10,2) not null default 0,
  whatsapp_number text,
  call_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  color_name text not null,
  size_options text[] not null default '{}',
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default uuid_generate_v4(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order int not null default 0,
  is_hero_rotation_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  product_title text not null,
  selected_color text,
  selected_size text,
  unit_price numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  quantity int not null default 1,
  note text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key default uuid_generate_v4(),
  admin_id text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes for admin list pages
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders(created_at desc);
