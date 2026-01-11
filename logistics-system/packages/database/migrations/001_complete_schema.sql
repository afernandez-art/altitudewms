-- ============================================================
-- LOGISTICS SYSTEM - COMPLETE DATABASE SCHEMA
-- Sistema WMS/TMS para Media y Última Milla
-- ============================================================
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PARTE 1: CORE - Organización y Usuarios
-- ============================================================

-- Organizaciones/Empresas
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  cuit TEXT NOT NULL UNIQUE,

  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,

  -- Configuración AFIP
  afip_environment TEXT DEFAULT 'testing' CHECK (afip_environment IN ('testing', 'production')),
  afip_certificate TEXT,
  afip_private_key TEXT,
  punto_venta INTEGER,

  -- Configuración operativa
  default_warehouse_id UUID,
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE public.user_profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,

  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'operations', 'warehouse', 'transport', 'dispatcher', 'viewer')),

  is_active BOOLEAN DEFAULT TRUE,
  driver_id UUID, -- Si es conductor

  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTE 2: CLIENTES B2B
-- ============================================================

-- Clientes
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  cuit TEXT,

  customer_type TEXT DEFAULT 'direct' CHECK (customer_type IN ('distributor', 'retailer', 'wholesale', 'chain', 'direct')),
  segment TEXT,
  price_list_id UUID,

  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  credit_limit NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 0,

  portal_enabled BOOLEAN DEFAULT FALSE,
  portal_user_id UUID,

  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, code)
);

-- Direcciones de cliente
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  address_type TEXT DEFAULT 'delivery' CHECK (address_type IN ('delivery', 'billing', 'both')),

  street TEXT NOT NULL,
  number TEXT,
  floor TEXT,
  apartment TEXT,
  city TEXT NOT NULL,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'Argentina',

  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  delivery_window_start TIME,
  delivery_window_end TIME,
  delivery_days INTEGER[], -- 0=Dom, 1=Lun...
  requires_appointment BOOLEAN DEFAULT FALSE,

  access_instructions TEXT,
  contact_name TEXT,
  contact_phone TEXT,

  requires_forklift BOOLEAN DEFAULT FALSE,
  requires_pallet_jack BOOLEAN DEFAULT FALSE,
  has_loading_dock BOOLEAN DEFAULT FALSE,

  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contactos de cliente
CREATE TABLE public.customer_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,

  is_primary BOOLEAN DEFAULT FALSE,
  receives_notifications BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTE 3: PRODUCTOS
-- ============================================================

-- Categorías de producto
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, name)
);

-- Productos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,

  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  brand TEXT,

  -- Dimensiones para cubicaje (CRÍTICO)
  weight NUMERIC(10,3) NOT NULL DEFAULT 0, -- kg
  length NUMERIC(10,2) NOT NULL DEFAULT 0, -- cm
  width NUMERIC(10,2) NOT NULL DEFAULT 0,  -- cm
  height NUMERIC(10,2) NOT NULL DEFAULT 0, -- cm
  volume NUMERIC(10,6) GENERATED ALWAYS AS ((length * width * height) / 1000000.0) STORED, -- m³

  -- Unidades de manejo
  base_unit TEXT DEFAULT 'unidad',
  units_per_box INTEGER,
  boxes_per_pallet INTEGER,

  -- Precios
  cost NUMERIC(12,2) DEFAULT 0,
  price NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),

  -- Control de lotes
  requires_lot_control BOOLEAN DEFAULT FALSE,
  requires_expiry_control BOOLEAN DEFAULT FALSE,
  shelf_life_days INTEGER,

  -- Stock
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER,
  reorder_point INTEGER,

  is_active BOOLEAN DEFAULT TRUE,
  image_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, sku)
);

-- ============================================================
-- PARTE 4: WMS - ALMACENES Y UBICACIONES
-- ============================================================

-- Almacenes
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,

  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  total_area NUMERIC(10,2), -- m²
  storage_area NUMERIC(10,2), -- m² útiles
  max_pallets INTEGER,

  operating_hours_start TIME DEFAULT '08:00',
  operating_hours_end TIME DEFAULT '18:00',

  warehouse_type TEXT DEFAULT 'main' CHECK (warehouse_type IN ('main', 'distribution', 'transit', 'cross_dock')),
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, code)
);

-- Zonas de almacén
CREATE TABLE public.warehouse_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('receiving', 'storage', 'picking', 'packing', 'staging', 'shipping', 'returns', 'quarantine', 'damaged')),

  area NUMERIC(10,2),
  max_pallets INTEGER,

  is_refrigerated BOOLEAN DEFAULT FALSE,
  min_temp NUMERIC(5,2),
  max_temp NUMERIC(5,2),

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(warehouse_id, code)
);

-- Ubicaciones (racks/bins)
CREATE TABLE public.warehouse_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES public.warehouse_zones(id) ON DELETE SET NULL,

  code TEXT NOT NULL, -- A-01-02-03
  barcode TEXT,

  aisle TEXT NOT NULL,
  rack TEXT NOT NULL,
  level TEXT NOT NULL,
  position TEXT NOT NULL,

  location_type TEXT DEFAULT 'rack' CHECK (location_type IN ('rack', 'shelf', 'floor', 'pallet', 'bin', 'bulk')),

  -- Capacidad
  max_weight NUMERIC(10,2) DEFAULT 1000, -- kg
  max_volume NUMERIC(10,4) DEFAULT 1, -- m³
  max_pallets INTEGER DEFAULT 1,

  -- Estado actual
  current_weight NUMERIC(10,2) DEFAULT 0,
  current_volume NUMERIC(10,4) DEFAULT 0,
  current_pallets INTEGER DEFAULT 0,

  is_pickable BOOLEAN DEFAULT TRUE,
  pick_sequence INTEGER,

  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(warehouse_id, code)
);

-- Lotes
CREATE TABLE public.lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  lot_number TEXT NOT NULL,

  manufacture_date DATE,
  expiry_date DATE,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,

  supplier_id UUID,
  purchase_order_id UUID,

  initial_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,

  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'quarantine', 'hold', 'expired', 'consumed')),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, product_id, lot_number)
);

-- Inventario por ubicación
CREATE TABLE public.location_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,

  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,

  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único para location_inventory (permite lot_id NULL)
CREATE UNIQUE INDEX idx_location_inventory_unique
ON public.location_inventory(location_id, product_id, COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- ============================================================
-- PARTE 5: WMS - OPERACIONES
-- ============================================================

-- Órdenes de recepción
CREATE TABLE public.receiving_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,

  receiving_number TEXT NOT NULL,
  purchase_order_id UUID,
  supplier_id UUID,

  expected_date DATE,
  expected_time_start TIME,
  expected_time_end TIME,

  actual_arrival_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  vehicle_plate TEXT,
  driver_name TEXT,

  remito_number TEXT,
  invoice_number TEXT,

  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'arrived', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, receiving_number)
);

-- Items de recepción
CREATE TABLE public.receiving_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receiving_order_id UUID NOT NULL REFERENCES public.receiving_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  expected_quantity INTEGER NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  damaged_quantity INTEGER DEFAULT 0,
  rejected_quantity INTEGER DEFAULT 0,

  lot_id UUID REFERENCES public.lots(id),
  lot_number TEXT,
  expiry_date DATE,

  suggested_location_id UUID REFERENCES public.warehouse_locations(id),

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed')),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tareas de put-away
CREATE TABLE public.putaway_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receiving_order_item_id UUID REFERENCES public.receiving_order_items(id) ON DELETE SET NULL,

  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots(id),
  quantity INTEGER NOT NULL,

  source_location_id UUID REFERENCES public.warehouse_locations(id),
  target_location_id UUID NOT NULL REFERENCES public.warehouse_locations(id),

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  assigned_to UUID REFERENCES public.user_profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Órdenes de picking
CREATE TABLE public.picking_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,

  picking_number TEXT NOT NULL,

  sales_order_id UUID,
  shipment_id UUID,

  picking_type TEXT DEFAULT 'single' CHECK (picking_type IN ('single', 'batch', 'wave', 'cluster')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'short', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  assigned_to UUID REFERENCES public.user_profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  total_lines INTEGER DEFAULT 0,
  completed_lines INTEGER DEFAULT 0,
  total_units INTEGER DEFAULT 0,
  picked_units INTEGER DEFAULT 0,

  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, picking_number)
);

-- Items de picking
CREATE TABLE public.picking_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  picking_order_id UUID NOT NULL REFERENCES public.picking_orders(id) ON DELETE CASCADE,
  sales_order_item_id UUID,

  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots(id),
  location_id UUID NOT NULL REFERENCES public.warehouse_locations(id),

  quantity_required INTEGER NOT NULL,
  quantity_picked INTEGER DEFAULT 0,
  quantity_short INTEGER DEFAULT 0,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),

  picked_at TIMESTAMPTZ,
  picked_by UUID REFERENCES public.user_profiles(id),

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tareas de packing
CREATE TABLE public.packing_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  picking_order_id UUID NOT NULL REFERENCES public.picking_orders(id) ON DELETE CASCADE,
  shipment_id UUID,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),

  package_type TEXT,
  package_weight NUMERIC(10,2),
  package_length NUMERIC(10,2),
  package_width NUMERIC(10,2),
  package_height NUMERIC(10,2),

  tracking_label TEXT,
  label_url TEXT,

  assigned_to UUID REFERENCES public.user_profiles(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conteos de inventario
CREATE TABLE public.inventory_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,

  count_number TEXT NOT NULL,
  count_type TEXT NOT NULL CHECK (count_type IN ('full', 'cycle', 'spot', 'blind')),

  zone_id UUID REFERENCES public.warehouse_zones(id),
  category_id UUID REFERENCES public.product_categories(id),

  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'pending_review', 'approved', 'completed')),

  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  total_locations INTEGER DEFAULT 0,
  counted_locations INTEGER DEFAULT 0,
  discrepancies_found INTEGER DEFAULT 0,

  reviewed_by UUID REFERENCES public.user_profiles(id),
  approved_by UUID REFERENCES public.user_profiles(id),

  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, count_number)
);

-- Items de conteo
CREATE TABLE public.inventory_count_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,

  location_id UUID NOT NULL REFERENCES public.warehouse_locations(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  lot_id UUID REFERENCES public.lots(id),

  system_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  variance INTEGER GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) - system_quantity) STORED,
  variance_percentage NUMERIC(10,2),

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'counted', 'recounted', 'approved')),
  variance_reason TEXT,

  counted_by UUID REFERENCES public.user_profiles(id),
  counted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTE 6: TMS - TRANSPORTISTAS, VEHÍCULOS, CONDUCTORES
-- ============================================================

-- Transportistas
CREATE TABLE public.carriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  cuit TEXT,

  carrier_type TEXT DEFAULT 'own_fleet' CHECK (carrier_type IN ('own_fleet', 'dedicated', 'courier', 'freight', 'crowdsource')),

  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,

  tracking_url_template TEXT,

  api_enabled BOOLEAN DEFAULT FALSE,
  api_endpoint TEXT,
  api_key TEXT,

  cost_per_km NUMERIC(10,2),
  cost_per_delivery NUMERIC(10,2),

  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, code)
);

-- Vehículos
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE SET NULL,

  plate TEXT NOT NULL,
  internal_code TEXT,

  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'van_large', 'truck_3500', 'truck_7000', 'truck_10000', 'truck_semi', 'truck_trailer')),
  brand TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,

  -- CAPACIDADES (CRÍTICO PARA CUBICAJE)
  max_weight NUMERIC(10,2) NOT NULL, -- kg
  max_volume NUMERIC(10,4) NOT NULL, -- m³
  max_pallets INTEGER DEFAULT 0,
  max_packages INTEGER,

  -- Dimensiones de caja
  cargo_length NUMERIC(10,2), -- cm
  cargo_width NUMERIC(10,2),  -- cm
  cargo_height NUMERIC(10,2), -- cm

  -- Equipamiento
  has_refrigeration BOOLEAN DEFAULT FALSE,
  has_tail_lift BOOLEAN DEFAULT FALSE,
  has_gps BOOLEAN DEFAULT FALSE,
  gps_device_id TEXT,

  -- Documentación
  insurance_expiry DATE,
  vtv_expiry DATE,
  permit_expiry DATE,

  -- Estado
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_route', 'maintenance', 'out_of_service')),
  current_driver_id UUID,
  current_location_lat NUMERIC(10,7),
  current_location_lng NUMERIC(10,7),
  last_location_update TIMESTAMPTZ,

  fuel_type TEXT DEFAULT 'diesel' CHECK (fuel_type IN ('diesel', 'gasoline', 'gas', 'electric')),
  avg_consumption NUMERIC(5,2),

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, plate)
);

-- Conductores
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.user_profiles(id),

  name TEXT NOT NULL,
  dni TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,

  license_number TEXT NOT NULL,
  license_category TEXT NOT NULL,
  license_expiry DATE NOT NULL,

  psychophysical_expiry DATE,
  art_number TEXT,

  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_route', 'break', 'off_duty', 'inactive')),
  current_vehicle_id UUID REFERENCES public.vehicles(id),
  current_route_id UUID,

  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, dni)
);

-- Actualizar FK de vehicles
ALTER TABLE public.vehicles
  ADD CONSTRAINT fk_vehicles_current_driver
  FOREIGN KEY (current_driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;

-- ============================================================
-- PARTE 7: ÓRDENES DE VENTA Y ENVÍOS
-- ============================================================

-- Órdenes de venta
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  order_number TEXT NOT NULL,

  channel TEXT DEFAULT 'portal' CHECK (channel IN ('portal', 'phone', 'email', 'sales_rep', 'meli', 'tiendanube', 'woocommerce', 'other')),
  external_order_id TEXT,

  customer_id UUID NOT NULL REFERENCES public.customers(id),
  customer_address_id UUID REFERENCES public.customer_addresses(id),

  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),

  delivery_type TEXT DEFAULT 'delivery' CHECK (delivery_type IN ('delivery', 'pickup', 'cross_dock')),
  service_level TEXT DEFAULT 'standard' CHECK (service_level IN ('standard', 'express', 'same_day', 'scheduled')),

  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  promised_date DATE,

  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),

  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  payment_method TEXT,

  invoice_status TEXT DEFAULT 'pending' CHECK (invoice_status IN ('pending', 'invoiced', 'cancelled')),
  invoice_type TEXT CHECK (invoice_type IN ('A', 'B', 'C', 'E')),
  invoice_number TEXT,
  cae TEXT,
  cae_expiry DATE,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled')),

  customer_notes TEXT,
  internal_notes TEXT,

  created_by UUID REFERENCES public.user_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, order_number)
);

-- Items de orden
CREATE TABLE public.sales_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),

  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,

  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,

  picked_quantity INTEGER DEFAULT 0,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Envíos
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  shipment_number TEXT NOT NULL,

  sales_order_id UUID REFERENCES public.sales_orders(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),

  shipment_type TEXT DEFAULT 'parcel' CHECK (shipment_type IN ('full_truckload', 'ltl', 'parcel', 'express')),
  service_level TEXT DEFAULT 'standard' CHECK (service_level IN ('standard', 'express', 'same_day', 'scheduled')),

  carrier_id UUID REFERENCES public.carriers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  route_id UUID,

  tracking_number TEXT,
  external_tracking_url TEXT,

  customer_id UUID REFERENCES public.customers(id),

  -- Dirección destino (JSON)
  delivery_address JSONB NOT NULL,

  package_count INTEGER DEFAULT 1,
  total_weight NUMERIC(10,2) DEFAULT 0,
  total_volume NUMERIC(10,4) DEFAULT 0,
  total_pallets INTEGER DEFAULT 0,

  declared_value NUMERIC(12,2),
  insurance_value NUMERIC(12,2),

  shipping_cost NUMERIC(12,2) DEFAULT 0,
  carrier_cost NUMERIC(12,2),

  created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  pickup_date TIMESTAMPTZ,
  estimated_delivery_date DATE,
  actual_delivery_date TIMESTAMPTZ,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'partial_delivery', 'failed_attempt', 'returned', 'cancelled')),

  -- POD
  pod_status TEXT DEFAULT 'pending' CHECK (pod_status IN ('pending', 'captured', 'confirmed')),
  pod_signature_url TEXT,
  pod_photo_url TEXT,
  pod_notes TEXT,
  pod_captured_at TIMESTAMPTZ,
  pod_captured_by UUID REFERENCES public.user_profiles(id),

  delivery_latitude NUMERIC(10,7),
  delivery_longitude NUMERIC(10,7),

  notes TEXT,
  internal_notes TEXT,

  created_by UUID REFERENCES public.user_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, shipment_number)
);

-- Paquetes de envío
CREATE TABLE public.shipment_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,

  package_number INTEGER NOT NULL,
  barcode TEXT,

  package_type TEXT DEFAULT 'box' CHECK (package_type IN ('box', 'pallet', 'envelope', 'tube', 'other')),

  weight NUMERIC(10,2) NOT NULL,
  length NUMERIC(10,2) NOT NULL,
  width NUMERIC(10,2) NOT NULL,
  height NUMERIC(10,2) NOT NULL,

  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eventos de tracking
CREATE TABLE public.shipment_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,

  status TEXT NOT NULL,
  description TEXT NOT NULL,

  location TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_by UUID REFERENCES public.user_profiles(id),
  source TEXT DEFAULT 'system' CHECK (source IN ('system', 'driver', 'carrier_api', 'manual')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTE 8: RUTAS DE ENTREGA
-- ============================================================

-- Rutas
CREATE TABLE public.delivery_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  route_number TEXT NOT NULL,
  route_date DATE NOT NULL,

  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),

  route_type TEXT DEFAULT 'delivery' CHECK (route_type IN ('delivery', 'pickup', 'mixed')),

  planned_start_time TIME NOT NULL,
  planned_end_time TIME NOT NULL,

  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  origin_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  origin_address TEXT NOT NULL,
  origin_latitude NUMERIC(10,7),
  origin_longitude NUMERIC(10,7),

  -- Métricas planificadas
  planned_distance NUMERIC(10,2), -- km
  planned_duration INTEGER, -- minutos
  planned_stops INTEGER DEFAULT 0,
  planned_packages INTEGER DEFAULT 0,
  planned_weight NUMERIC(10,2) DEFAULT 0,
  planned_volume NUMERIC(10,4) DEFAULT 0,

  -- Utilización de capacidad
  weight_utilization NUMERIC(5,2) DEFAULT 0, -- %
  volume_utilization NUMERIC(5,2) DEFAULT 0, -- %

  -- Métricas reales
  actual_distance NUMERIC(10,2),
  actual_duration INTEGER,
  completed_stops INTEGER DEFAULT 0,
  failed_stops INTEGER DEFAULT 0,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'assigned', 'in_progress', 'completed', 'cancelled')),

  notes TEXT,

  created_by UUID REFERENCES public.user_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, route_number)
);

-- Actualizar FK de drivers y shipments
ALTER TABLE public.drivers
  ADD CONSTRAINT fk_drivers_current_route
  FOREIGN KEY (current_route_id) REFERENCES public.delivery_routes(id) ON DELETE SET NULL;

ALTER TABLE public.shipments
  ADD CONSTRAINT fk_shipments_route
  FOREIGN KEY (route_id) REFERENCES public.delivery_routes(id) ON DELETE SET NULL;

-- Paradas de ruta
CREATE TABLE public.route_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.delivery_routes(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id),

  sequence INTEGER NOT NULL,
  stop_type TEXT DEFAULT 'delivery' CHECK (stop_type IN ('delivery', 'pickup')),

  address TEXT NOT NULL,
  city TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,

  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,

  planned_arrival TIMESTAMPTZ,
  planned_departure TIMESTAMPTZ,
  planned_service_time INTEGER, -- minutos

  time_window_start TIME,
  time_window_end TIME,

  packages INTEGER DEFAULT 1,
  weight NUMERIC(10,2) DEFAULT 0,
  volume NUMERIC(10,4) DEFAULT 0,
  pallets INTEGER DEFAULT 0,

  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'partial', 'failed', 'skipped')),
  failure_reason TEXT CHECK (failure_reason IN ('absent', 'refused', 'wrong_address', 'access_denied', 'closed', 'damaged_goods', 'incomplete_order', 'reschedule', 'other')),
  failure_notes TEXT,

  signature_url TEXT,
  photo_url TEXT,
  pod_notes TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTE 9: INTEGRACIONES Y AUDITORÍA
-- ============================================================

-- Integraciones
CREATE TABLE public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  integration_type TEXT NOT NULL CHECK (integration_type IN ('afip', 'meli', 'tiendanube', 'woocommerce', 'carrier_api')),
  name TEXT NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,

  credentials JSONB,
  config JSONB,

  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error')),
  last_sync_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, integration_type)
);

-- Logs de sincronización
CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,

  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),

  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_error INTEGER DEFAULT 0,

  error_message TEXT,
  error_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoría
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id),

  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'status_change')),

  old_values JSONB,
  new_values JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notificaciones
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id),
  customer_id UUID REFERENCES public.customers(id),

  notification_type TEXT NOT NULL CHECK (notification_type IN ('order_confirmed', 'order_shipped', 'out_for_delivery', 'delivered', 'delivery_failed', 'delivery_rescheduled')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'whatsapp')),

  subject TEXT,
  message TEXT NOT NULL,

  entity_type TEXT,
  entity_id UUID,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTE 10: ÍNDICES PARA PERFORMANCE
-- ============================================================

-- Customers
CREATE INDEX idx_customers_org ON public.customers(organization_id);
CREATE INDEX idx_customers_code ON public.customers(organization_id, code);
CREATE INDEX idx_customer_addresses_customer ON public.customer_addresses(customer_id);

-- Products
CREATE INDEX idx_products_org ON public.products(organization_id);
CREATE INDEX idx_products_sku ON public.products(organization_id, sku);
CREATE INDEX idx_products_category ON public.products(category_id);

-- Warehouses
CREATE INDEX idx_warehouses_org ON public.warehouses(organization_id);
CREATE INDEX idx_warehouse_zones_warehouse ON public.warehouse_zones(warehouse_id);
CREATE INDEX idx_warehouse_locations_warehouse ON public.warehouse_locations(warehouse_id);
CREATE INDEX idx_warehouse_locations_zone ON public.warehouse_locations(zone_id);
CREATE INDEX idx_warehouse_locations_pickable ON public.warehouse_locations(warehouse_id) WHERE is_pickable = TRUE;

-- Inventory
CREATE INDEX idx_location_inventory_location ON public.location_inventory(location_id);
CREATE INDEX idx_location_inventory_product ON public.location_inventory(product_id);
CREATE INDEX idx_lots_product ON public.lots(product_id);
CREATE INDEX idx_lots_expiry ON public.lots(expiry_date) WHERE status = 'available';

-- WMS Operations
CREATE INDEX idx_receiving_orders_status ON public.receiving_orders(organization_id, status);
CREATE INDEX idx_putaway_tasks_status ON public.putaway_tasks(organization_id, status);
CREATE INDEX idx_picking_orders_status ON public.picking_orders(organization_id, status);
CREATE INDEX idx_packing_tasks_status ON public.packing_tasks(organization_id, status);

-- TMS
CREATE INDEX idx_carriers_org ON public.carriers(organization_id);
CREATE INDEX idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(organization_id, status);
CREATE INDEX idx_drivers_org ON public.drivers(organization_id);
CREATE INDEX idx_drivers_status ON public.drivers(organization_id, status);

-- Orders & Shipments
CREATE INDEX idx_sales_orders_org ON public.sales_orders(organization_id);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(organization_id, status);
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_shipments_org ON public.shipments(organization_id);
CREATE INDEX idx_shipments_status ON public.shipments(organization_id, status);
CREATE INDEX idx_shipments_route ON public.shipments(route_id);
CREATE INDEX idx_shipment_tracking_shipment ON public.shipment_tracking_events(shipment_id);

-- Routes
CREATE INDEX idx_delivery_routes_org ON public.delivery_routes(organization_id);
CREATE INDEX idx_delivery_routes_date ON public.delivery_routes(organization_id, route_date);
CREATE INDEX idx_delivery_routes_status ON public.delivery_routes(organization_id, status);
CREATE INDEX idx_route_stops_route ON public.route_stops(route_id);
CREATE INDEX idx_route_stops_sequence ON public.route_stops(route_id, sequence);

-- Audit
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- PARTE 11: FUNCIONES HELPER
-- ============================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar números secuenciales
CREATE OR REPLACE FUNCTION public.generate_sequence_number(
  p_organization_id UUID,
  p_prefix TEXT,
  p_table_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');

  EXECUTE format(
    'SELECT COUNT(*) + 1 FROM public.%I WHERE organization_id = $1 AND created_at >= date_trunc(''year'', CURRENT_DATE)',
    p_table_name
  ) INTO v_count USING p_organization_id;

  v_number := lpad(v_count::TEXT, 5, '0');

  RETURN p_prefix || '-' || v_year || '-' || v_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PARTE 12: TRIGGERS
-- ============================================================

-- Updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_zones_updated_at BEFORE UPDATE ON public.warehouse_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_locations_updated_at BEFORE UPDATE ON public.warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_inventory_updated_at BEFORE UPDATE ON public.location_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receiving_orders_updated_at BEFORE UPDATE ON public.receiving_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receiving_order_items_updated_at BEFORE UPDATE ON public.receiving_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_putaway_tasks_updated_at BEFORE UPDATE ON public.putaway_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_picking_orders_updated_at BEFORE UPDATE ON public.picking_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_packing_tasks_updated_at BEFORE UPDATE ON public.packing_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_counts_updated_at BEFORE UPDATE ON public.inventory_counts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_carriers_updated_at BEFORE UPDATE ON public.carriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_routes_updated_at BEFORE UPDATE ON public.delivery_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_route_stops_updated_at BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PARTE 13: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.putaway_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picking_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picking_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener organization_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Políticas RLS para organizations
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (id = public.get_user_organization_id());

-- Políticas RLS para user_profiles
CREATE POLICY "Users can view profiles in their organization" ON public.user_profiles
  FOR SELECT USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Macro para crear políticas estándar por organización
-- (Aplicar a cada tabla con organization_id)

-- Customers
CREATE POLICY "org_select_customers" ON public.customers FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_customers" ON public.customers FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_customers" ON public.customers FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_customers" ON public.customers FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Products
CREATE POLICY "org_select_products" ON public.products FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_products" ON public.products FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_products" ON public.products FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_products" ON public.products FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Warehouses
CREATE POLICY "org_select_warehouses" ON public.warehouses FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_warehouses" ON public.warehouses FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_warehouses" ON public.warehouses FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_warehouses" ON public.warehouses FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Carriers
CREATE POLICY "org_select_carriers" ON public.carriers FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_carriers" ON public.carriers FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_carriers" ON public.carriers FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_carriers" ON public.carriers FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Vehicles
CREATE POLICY "org_select_vehicles" ON public.vehicles FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_vehicles" ON public.vehicles FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_vehicles" ON public.vehicles FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_vehicles" ON public.vehicles FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Drivers
CREATE POLICY "org_select_drivers" ON public.drivers FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_drivers" ON public.drivers FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_drivers" ON public.drivers FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_drivers" ON public.drivers FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Sales Orders
CREATE POLICY "org_select_sales_orders" ON public.sales_orders FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_sales_orders" ON public.sales_orders FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_sales_orders" ON public.sales_orders FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_sales_orders" ON public.sales_orders FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Shipments
CREATE POLICY "org_select_shipments" ON public.shipments FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_shipments" ON public.shipments FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_shipments" ON public.shipments FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_shipments" ON public.shipments FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Delivery Routes
CREATE POLICY "org_select_routes" ON public.delivery_routes FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_routes" ON public.delivery_routes FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_routes" ON public.delivery_routes FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_routes" ON public.delivery_routes FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Lots
CREATE POLICY "org_select_lots" ON public.lots FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_lots" ON public.lots FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_lots" ON public.lots FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_lots" ON public.lots FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Receiving Orders
CREATE POLICY "org_select_receiving" ON public.receiving_orders FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_receiving" ON public.receiving_orders FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_receiving" ON public.receiving_orders FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_receiving" ON public.receiving_orders FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Picking Orders
CREATE POLICY "org_select_picking" ON public.picking_orders FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_picking" ON public.picking_orders FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_picking" ON public.picking_orders FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_picking" ON public.picking_orders FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Packing Tasks
CREATE POLICY "org_select_packing" ON public.packing_tasks FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_packing" ON public.packing_tasks FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_packing" ON public.packing_tasks FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_packing" ON public.packing_tasks FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Putaway Tasks
CREATE POLICY "org_select_putaway" ON public.putaway_tasks FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_putaway" ON public.putaway_tasks FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_putaway" ON public.putaway_tasks FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_putaway" ON public.putaway_tasks FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Inventory Counts
CREATE POLICY "org_select_counts" ON public.inventory_counts FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_counts" ON public.inventory_counts FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_counts" ON public.inventory_counts FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_counts" ON public.inventory_counts FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Integrations
CREATE POLICY "org_select_integrations" ON public.integrations FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_integrations" ON public.integrations FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_integrations" ON public.integrations FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_integrations" ON public.integrations FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Audit Logs
CREATE POLICY "org_select_audit" ON public.audit_logs FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_audit" ON public.audit_logs FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

-- Notifications
CREATE POLICY "org_select_notifications" ON public.notifications FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_notifications" ON public.notifications FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_notifications" ON public.notifications FOR UPDATE USING (organization_id = public.get_user_organization_id());

-- Product Categories
CREATE POLICY "org_select_categories" ON public.product_categories FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_insert_categories" ON public.product_categories FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "org_update_categories" ON public.product_categories FOR UPDATE USING (organization_id = public.get_user_organization_id());
CREATE POLICY "org_delete_categories" ON public.product_categories FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Políticas para tablas hijas (via foreign key a tabla padre)

-- Customer Addresses (via customer)
CREATE POLICY "select_customer_addresses" ON public.customer_addresses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_customer_addresses" ON public.customer_addresses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_customer_addresses" ON public.customer_addresses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_customer_addresses" ON public.customer_addresses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.get_user_organization_id()));

-- Customer Contacts (via customer)
CREATE POLICY "select_customer_contacts" ON public.customer_contacts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_customer_contacts" ON public.customer_contacts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_customer_contacts" ON public.customer_contacts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_customer_contacts" ON public.customer_contacts FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.organization_id = public.get_user_organization_id()));

-- Warehouse Zones (via warehouse)
CREATE POLICY "select_zones" ON public.warehouse_zones FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_zones" ON public.warehouse_zones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_zones" ON public.warehouse_zones FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_zones" ON public.warehouse_zones FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_id AND w.organization_id = public.get_user_organization_id()));

-- Warehouse Locations (via warehouse)
CREATE POLICY "select_locations" ON public.warehouse_locations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_locations" ON public.warehouse_locations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_locations" ON public.warehouse_locations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_locations" ON public.warehouse_locations FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_id AND w.organization_id = public.get_user_organization_id()));

-- Location Inventory (via location -> warehouse)
CREATE POLICY "select_inventory" ON public.location_inventory FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.warehouse_locations l JOIN public.warehouses w ON w.id = l.warehouse_id WHERE l.id = location_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_inventory" ON public.location_inventory FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.warehouse_locations l JOIN public.warehouses w ON w.id = l.warehouse_id WHERE l.id = location_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_inventory" ON public.location_inventory FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.warehouse_locations l JOIN public.warehouses w ON w.id = l.warehouse_id WHERE l.id = location_id AND w.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_inventory" ON public.location_inventory FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.warehouse_locations l JOIN public.warehouses w ON w.id = l.warehouse_id WHERE l.id = location_id AND w.organization_id = public.get_user_organization_id()));

-- Sales Order Items (via order)
CREATE POLICY "select_order_items" ON public.sales_order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_id AND o.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_order_items" ON public.sales_order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_id AND o.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_order_items" ON public.sales_order_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_id AND o.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_order_items" ON public.sales_order_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = sales_order_id AND o.organization_id = public.get_user_organization_id()));

-- Shipment Packages (via shipment)
CREATE POLICY "select_packages" ON public.shipment_packages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_packages" ON public.shipment_packages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_packages" ON public.shipment_packages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_packages" ON public.shipment_packages FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.organization_id = public.get_user_organization_id()));

-- Shipment Tracking Events (via shipment)
CREATE POLICY "select_tracking" ON public.shipment_tracking_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_tracking" ON public.shipment_tracking_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.organization_id = public.get_user_organization_id()));

-- Route Stops (via route)
CREATE POLICY "select_stops" ON public.route_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.delivery_routes r WHERE r.id = route_id AND r.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_stops" ON public.route_stops FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_routes r WHERE r.id = route_id AND r.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_stops" ON public.route_stops FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.delivery_routes r WHERE r.id = route_id AND r.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_stops" ON public.route_stops FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.delivery_routes r WHERE r.id = route_id AND r.organization_id = public.get_user_organization_id()));

-- Receiving Order Items (via receiving_order)
CREATE POLICY "select_receiving_items" ON public.receiving_order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.receiving_orders r WHERE r.id = receiving_order_id AND r.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_receiving_items" ON public.receiving_order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.receiving_orders r WHERE r.id = receiving_order_id AND r.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_receiving_items" ON public.receiving_order_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.receiving_orders r WHERE r.id = receiving_order_id AND r.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_receiving_items" ON public.receiving_order_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.receiving_orders r WHERE r.id = receiving_order_id AND r.organization_id = public.get_user_organization_id()));

-- Picking Order Items (via picking_order)
CREATE POLICY "select_picking_items" ON public.picking_order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.picking_orders p WHERE p.id = picking_order_id AND p.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_picking_items" ON public.picking_order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.picking_orders p WHERE p.id = picking_order_id AND p.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_picking_items" ON public.picking_order_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.picking_orders p WHERE p.id = picking_order_id AND p.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_picking_items" ON public.picking_order_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.picking_orders p WHERE p.id = picking_order_id AND p.organization_id = public.get_user_organization_id()));

-- Inventory Count Items (via inventory_count)
CREATE POLICY "select_count_items" ON public.inventory_count_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.inventory_counts c WHERE c.id = inventory_count_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_count_items" ON public.inventory_count_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.inventory_counts c WHERE c.id = inventory_count_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "update_count_items" ON public.inventory_count_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.inventory_counts c WHERE c.id = inventory_count_id AND c.organization_id = public.get_user_organization_id()));
CREATE POLICY "delete_count_items" ON public.inventory_count_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.inventory_counts c WHERE c.id = inventory_count_id AND c.organization_id = public.get_user_organization_id()));

-- Sync Logs (via integration)
CREATE POLICY "select_sync_logs" ON public.sync_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.integrations i WHERE i.id = integration_id AND i.organization_id = public.get_user_organization_id()));
CREATE POLICY "insert_sync_logs" ON public.sync_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.integrations i WHERE i.id = integration_id AND i.organization_id = public.get_user_organization_id()));

-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Schema de Logistics System creado exitosamente!';
  RAISE NOTICE '📊 Tablas creadas: 35+';
  RAISE NOTICE '🔐 RLS habilitado en todas las tablas';
  RAISE NOTICE '📝 Triggers de updated_at configurados';
END $$;
