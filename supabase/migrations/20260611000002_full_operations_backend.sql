-- Stock
CREATE TABLE IF NOT EXISTS public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'sheets',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_items_all" ON public.stock_items;
CREATE POLICY "stock_items_all" ON public.stock_items FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.waste_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  material TEXT NOT NULL,
  project_id UUID,
  project_name TEXT,
  used_for_project_id UUID,
  used_for_project_name TEXT,
  size TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.waste_materials ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.waste_materials ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE public.waste_materials ADD COLUMN IF NOT EXISTS used_for_project_id UUID;
ALTER TABLE public.waste_materials ADD COLUMN IF NOT EXISTS used_for_project_name TEXT;
ALTER TABLE public.waste_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waste_materials_all" ON public.waste_materials;
CREATE POLICY "waste_materials_all" ON public.waste_materials FOR ALL USING (true) WITH CHECK (true);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  work_type TEXT NOT NULL DEFAULT 'own',
  status TEXT NOT NULL DEFAULT 'ongoing',
  progress INTEGER NOT NULL DEFAULT 0,
  delivery DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_all" ON public.projects;
CREATE POLICY "projects_all" ON public.projects FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'new-stock',
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  material_type TEXT NOT NULL,
  thickness TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'sheets',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_materials_all" ON public.project_materials;
CREATE POLICY "project_materials_all" ON public.project_materials FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.project_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_services_all" ON public.project_services;
CREATE POLICY "project_services_all" ON public.project_services FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.project_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  completed NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_workflow_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_workflow_stages_all" ON public.project_workflow_stages;
CREATE POLICY "project_workflow_stages_all" ON public.project_workflow_stages FOR ALL USING (true) WITH CHECK (true);

-- Finance
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_all" ON public.transactions;
CREATE POLICY "transactions_all" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  bill_to_address TEXT,
  design TEXT NOT NULL DEFAULT 'standard',
  logo_data_url TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_all" ON public.invoices;
CREATE POLICY "invoices_all" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_items_all" ON public.invoice_items;
CREATE POLICY "invoice_items_all" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

-- Settings and notifications
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_settings_all" ON public.app_settings;
CREATE POLICY "app_settings_all" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience TEXT NOT NULL,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audience, label)
);
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_settings_all" ON public.notification_settings;
CREATE POLICY "notification_settings_all" ON public.notification_settings FOR ALL USING (true) WITH CHECK (true);

-- Seed stock
INSERT INTO public.stock_items (material, type, quantity, unit)
SELECT * FROM (VALUES
  ('MDF Sheet 18mm', 'MDF', 120, 'sheets'),
  ('Plywood 19mm', 'Plywood', 85, 'sheets'),
  ('Laminate - Walnut', 'Laminate', 200, 'sheets'),
  ('Veneer - Teak', 'Veneer', 60, 'sheets'),
  ('Acrylic - Glossy White', 'Acrylic', 45, 'sheets'),
  ('Edge Band Tape 22mm', 'Edge Band', 320, 'rolls')
) AS seed(material, type, quantity, unit)
WHERE NOT EXISTS (SELECT 1 FROM public.stock_items);

INSERT INTO public.waste_materials (code, material, size, note)
SELECT * FROM (VALUES
  ('W001', 'MDF', '18mm offcuts', 'Reusable for small panels'),
  ('W002', 'Laminate', 'Walnut scraps', 'Keep for edge samples'),
  ('W003', 'Edge Band', '22mm trimming', 'Short roll balance')
) AS seed(code, material, size, note)
WHERE NOT EXISTS (SELECT 1 FROM public.waste_materials);

-- Seed notification settings
INSERT INTO public.notification_settings (audience, label, enabled)
VALUES
  ('admin', 'Project onboarding', true),
  ('admin', 'Project completion', true),
  ('admin', 'Daily reports', true),
  ('customer', 'Project status', true),
  ('customer', 'Invoice', true)
ON CONFLICT (audience, label) DO NOTHING;

-- Seed transactions
INSERT INTO public.transactions (transaction_date, description, type, amount)
SELECT * FROM (VALUES
  ('2026-04-28'::date, 'Payment from Sterling Interiors', 'credit', 150000),
  ('2026-04-26'::date, 'Greenply Industries - MDF order', 'debit', 85000),
  ('2026-04-22'::date, 'Payment from Modular Spaces', 'credit', 320000),
  ('2026-04-20'::date, 'Century Laminates - Laminate stock', 'debit', 42000),
  ('2026-04-18'::date, 'Payment from Urban Living Co.', 'credit', 200000),
  ('2026-04-15'::date, 'Workshop electricity bill', 'debit', 18500)
) AS seed(transaction_date, description, type, amount)
WHERE NOT EXISTS (SELECT 1 FROM public.transactions);

-- Seed projects
INSERT INTO public.projects (code, name, customer_name, status, progress, delivery, amount, work_type)
SELECT * FROM (VALUES
  ('P001', 'Sterling HQ Cabinets', 'Sterling Interiors', 'ongoing', 65, '2026-05-20'::date, 285000, 'own'),
  ('P002', 'Urban Living Wardrobes', 'Urban Living Co.', 'ongoing', 40, '2026-06-10'::date, 540000, 'own'),
  ('P003', 'Modular Kitchen - Saket', 'Modular Spaces', 'completed', 100, '2026-04-15'::date, 320000, 'job'),
  ('P004', 'Decor Hub Showroom', 'Decor Hub', 'hold', 25, '2026-07-01'::date, 180000, 'own'),
  ('P005', 'Sterling Boardroom', 'Sterling Interiors', 'completed', 100, '2026-03-28'::date, 410000, 'job')
) AS seed(code, name, customer_name, status, progress, delivery, amount, work_type)
WHERE NOT EXISTS (SELECT 1 FROM public.projects);
