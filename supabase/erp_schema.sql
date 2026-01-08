-- ==========================================
-- ERP SYSTEM SCHEMA - ESTILO APPLE SJ
-- ==========================================

-- 1. Suppliers Table (Proveedores)
create table if not exists suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  contact_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Payment Methods (Medios de Pago)
create table if not exists payment_methods (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed Payment Methods
insert into payment_methods (name) values 
  ('Efectivo'), 
  ('Transferencia'), 
  ('USDT'), 
  ('MercadoPago')
on conflict do nothing;

-- 3. Transaction Categories (Categorías de Ingresos y Gastos)
create table if not exists transaction_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null check (type in ('INCOME', 'EXPENSE')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed Dimensions
insert into transaction_categories (name, type) values
  -- Ingresos
  ('Venta de Equipos', 'INCOME'),
  ('Venta de Accesorios', 'INCOME'),
  ('Servicio Tecnico', 'INCOME'),
  -- Gastos
  ('Proveedores', 'EXPENSE'),
  ('Comisiones', 'EXPENSE'),
  ('Envios', 'EXPENSE'),
  ('Alquiler', 'EXPENSE'),
  ('Servicios', 'EXPENSE'),
  ('Herramientas', 'EXPENSE'),
  ('Empleados local', 'EXPENSE'),
  ('Pago Prestamos', 'EXPENSE'),
  ('Contador / Abogado', 'EXPENSE'),
  ('Mantenimiento', 'EXPENSE'),
  ('Marketing', 'EXPENSE'),
  ('Impuestos', 'EXPENSE'),
  ('Limpieza', 'EXPENSE'),
  ('Publicidad', 'EXPENSE'),
  ('Otros', 'EXPENSE'),
  ('Distribucion Ganancias Socios', 'EXPENSE')
on conflict do nothing;

-- 4. Transactions (Movimientos Financieros)
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  
  description text,
  amount numeric not null,
  currency text not null check (currency in ('ARS', 'USD')),
  exchange_rate numeric not null default 1.0, -- Valor del dolar en ese momento
  
  type text not null check (type in ('INCOME', 'EXPENSE')),
  
  category_id uuid references transaction_categories(id),
  payment_method_id uuid references payment_methods(id),
  supplier_id uuid references suppliers(id), -- Opcional, para gastos a proveedores
  
  is_personal boolean default false, -- Para filtrar gastos personales
  
  related_product_id uuid references productos(id) -- Opcional, si es venta de equipo
);

-- 5. Update Products Table (Add Cost for CMV)
-- Check if column exists first or just add it (this might fail if exists provided safe implementation)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'productos' and column_name = 'costo_usd') then
        alter table productos add column costo_usd numeric default 0;
    end if;
end $$;

-- 6. Inventory Movements (Historial de Stock)
create table if not exists inventory_movements (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  product_id uuid references productos(id) not null,
  type text not null check (type in ('IN', 'OUT', 'ADJUSTMENT')),
  quantity integer not null,
  reason text
);

-- Enable RLS (Optional depending on current project setup, assuming public/anon access for now based on previous files)
alter table suppliers enable row level security;
alter table payment_methods enable row level security;
alter table transaction_categories enable row level security;
alter table transactions enable row level security;
alter table inventory_movements enable row level security;

-- Policies (Open access for authenticated/anon users for simplified local dev)
create policy "Enable all access for all users" on suppliers for all using (true) with check (true);
create policy "Enable all access for all users" on payment_methods for all using (true) with check (true);
create policy "Enable all access for all users" on transaction_categories for all using (true) with check (true);
create policy "Enable all access for all users" on transactions for all using (true) with check (true);
create policy "Enable all access for all users" on inventory_movements for all using (true) with check (true);
