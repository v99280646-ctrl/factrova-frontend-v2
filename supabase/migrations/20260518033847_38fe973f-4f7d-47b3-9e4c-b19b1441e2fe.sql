
-- Services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'sheet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_all" ON public.services FOR ALL USING (true) WITH CHECK (true);

-- Staff
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'worker',
  access_level TEXT NOT NULL DEFAULT 'view',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON public.staff FOR ALL USING (true) WITH CHECK (true);

-- Integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_all" ON public.integrations FOR ALL USING (true) WITH CHECK (true);

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  state TEXT,
  district TEXT,
  pincode TEXT,
  gstin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_all" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- Vendors
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  materials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_all" ON public.vendors FOR ALL USING (true) WITH CHECK (true);

-- Seed services
INSERT INTO public.services (name, price, unit) VALUES
  ('Lamination Pressing', 180, 'sheet'),
  ('Veneer Pressing', 250, 'sheet'),
  ('Acrylic Pressing', 320, 'sheet'),
  ('Cutting', 90, 'sheet'),
  ('Edge Banding', 11, 'meter'),
  ('Boring', 78, 'hole');

-- Seed customers
INSERT INTO public.customers (company, contact, phone, email, address) VALUES
  ('Sterling Interiors', 'Rohit Mehta', '9876543210', 'rohit@sterling.in', 'Andheri, Mumbai'),
  ('Urban Living Co.', 'Priya Shah', '9988776655', 'priya@urbanliving.in', 'Koramangala, Bangalore'),
  ('Modular Spaces', 'Arjun Kapoor', '9123456780', 'arjun@modular.in', 'Saket, Delhi'),
  ('Decor Hub', 'Neha Iyer', '9012345678', 'neha@decorhub.in', 'T. Nagar, Chennai');

-- Seed vendors
INSERT INTO public.vendors (name, contact, materials) VALUES
  ('Greenply Industries', '9001112233', 'MDF, Plywood'),
  ('Century Laminates', '9002223344', 'Laminates, Veneer'),
  ('Acrylic World', '9003334455', 'Acrylic Sheets'),
  ('EdgeBand Pro', '9004445566', 'Edge Banding Tape');

-- Seed staff
INSERT INTO public.staff (name, phone, role, access_level) VALUES
  ('Ramesh Kumar', '9871112222', 'Floor Manager', 'admin'),
  ('Sunita Verma', '9872223333', 'Accountant', 'finance'),
  ('Akash Singh', '9873334444', 'Machine Operator', 'view');

-- Seed integrations
INSERT INTO public.integrations (name, description, status) VALUES
  ('WhatsApp Business', 'Send order updates to customers via WhatsApp', 'disconnected'),
  ('Razorpay', 'Accept online payments from customers', 'disconnected');
