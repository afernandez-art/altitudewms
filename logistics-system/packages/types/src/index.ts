// ============================================================
// LOGISTICS SYSTEM - COMPLETE TYPE DEFINITIONS
// Sistema WMS/TMS para Media y Última Milla
// ============================================================

// ============================================================
// CORE - Entidades Base
// ============================================================

/** Empresa/Organización que usa el sistema */
export interface Organization {
  id: string;
  name: string;
  legal_name: string;
  cuit: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  logo_url?: string;

  // Configuración AFIP
  afip_environment: 'testing' | 'production';
  afip_certificate?: string;
  afip_private_key?: string;
  punto_venta?: number;

  // Configuración operativa
  default_warehouse_id?: string;
  timezone: string; // 'America/Argentina/Buenos_Aires'

  created_at: string;
  updated_at: string;
}

/** Usuario del sistema */
export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;

  // Si es conductor
  driver_id?: string;

  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export type UserRole =
  | 'admin'           // Acceso total
  | 'operations'      // WMS + TMS operativo
  | 'warehouse'       // Solo WMS
  | 'transport'       // Solo TMS
  | 'dispatcher'      // Planificación de rutas
  | 'viewer';         // Solo lectura

// ============================================================
// CLIENTES (B2B)
// ============================================================

/** Cliente B2B */
export interface Customer {
  id: string;
  organization_id: string;

  // Datos básicos
  code: string;              // Código interno (ej: CLI-0001)
  name: string;              // Nombre comercial
  legal_name: string;        // Razón social
  cuit: string;

  // Categorización
  customer_type: CustomerType;
  segment?: string;          // VIP, Regular, Nuevo, etc.
  price_list_id?: string;    // Lista de precios asignada

  // Contacto principal
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;

  // Financiero
  credit_limit: number;
  current_balance: number;   // Saldo cuenta corriente
  payment_terms: number;     // Días de pago (0 = contado)

  // Portal de cliente
  portal_enabled: boolean;
  portal_user_id?: string;   // Usuario para acceso al portal

  // Estado
  is_active: boolean;
  notes?: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  addresses?: CustomerAddress[];
  contacts?: CustomerContact[];
}

export type CustomerType =
  | 'distributor'     // Distribuidor
  | 'retailer'        // Comercio minorista
  | 'wholesale'       // Mayorista
  | 'chain'           // Cadena
  | 'direct';         // Venta directa

/** Dirección de entrega del cliente */
export interface CustomerAddress {
  id: string;
  customer_id: string;

  name: string;              // Nombre/alias de la dirección
  address_type: 'delivery' | 'billing' | 'both';

  street: string;
  number: string;
  floor?: string;
  apartment?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;

  // Geolocalización
  latitude?: number;
  longitude?: number;

  // Restricciones de entrega
  delivery_window_start?: string;  // HH:mm
  delivery_window_end?: string;    // HH:mm
  delivery_days?: number[];        // 0=Dom, 1=Lun, ..., 6=Sab
  requires_appointment: boolean;

  // Acceso
  access_instructions?: string;
  contact_name?: string;
  contact_phone?: string;

  // Equipamiento necesario
  requires_forklift: boolean;      // Autoelevador
  requires_pallet_jack: boolean;   // Zorra
  has_loading_dock: boolean;       // Dársena de descarga

  is_default: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

/** Contacto adicional del cliente */
export interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  receives_notifications: boolean;
  created_at: string;
}

// ============================================================
// PRODUCTOS
// ============================================================

/** Producto */
export interface Product {
  id: string;
  organization_id: string;

  sku: string;
  barcode?: string;
  name: string;
  description?: string;

  // Categorización
  category_id?: string;
  brand?: string;

  // Dimensiones y peso (para cubicaje)
  weight: number;              // kg
  length: number;              // cm
  width: number;               // cm
  height: number;              // cm
  volume: number;              // m³ (calculado)

  // Unidades de manejo
  base_unit: string;           // 'unidad', 'caja', 'pack', etc.
  units_per_box?: number;      // Unidades por caja
  boxes_per_pallet?: number;   // Cajas por pallet

  // Precios
  cost: number;
  price: number;
  currency: 'ARS' | 'USD';

  // Control de lotes
  requires_lot_control: boolean;
  requires_expiry_control: boolean;
  shelf_life_days?: number;    // Vida útil en días

  // Stock
  min_stock: number;           // Alerta de stock bajo
  max_stock?: number;          // Stock máximo
  reorder_point?: number;      // Punto de reorden

  // Estado
  is_active: boolean;
  image_url?: string;

  created_at: string;
  updated_at: string;
}

/** Categoría de producto */
export interface ProductCategory {
  id: string;
  organization_id: string;
  name: string;
  parent_id?: string;
  description?: string;
  created_at: string;
}

// ============================================================
// WMS - WAREHOUSE MANAGEMENT SYSTEM
// ============================================================

/** Almacén/Depósito */
export interface Warehouse {
  id: string;
  organization_id: string;

  code: string;
  name: string;

  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;

  // Capacidad total
  total_area: number;          // m²
  storage_area: number;        // m² útiles
  max_pallets?: number;

  // Operación
  operating_hours_start: string;  // HH:mm
  operating_hours_end: string;    // HH:mm

  // Tipo
  warehouse_type: WarehouseType;
  is_active: boolean;

  created_at: string;
  updated_at: string;

  zones?: WarehouseZone[];
}

export type WarehouseType =
  | 'main'           // Principal
  | 'distribution'   // Centro de distribución
  | 'transit'        // Tránsito
  | 'cross_dock';    // Cross-docking

/** Zona dentro del almacén */
export interface WarehouseZone {
  id: string;
  warehouse_id: string;

  code: string;
  name: string;
  zone_type: ZoneType;

  // Capacidad
  area: number;               // m²
  max_pallets?: number;

  // Condiciones especiales
  is_refrigerated: boolean;
  min_temp?: number;
  max_temp?: number;

  is_active: boolean;
  created_at: string;
  updated_at: string;

  locations?: WarehouseLocation[];
}

export type ZoneType =
  | 'receiving'      // Recepción
  | 'storage'        // Almacenamiento
  | 'picking'        // Picking
  | 'packing'        // Packing/Empaque
  | 'staging'        // Staging (preparación)
  | 'shipping'       // Despacho
  | 'returns'        // Devoluciones
  | 'quarantine'     // Cuarentena
  | 'damaged';       // Dañados

/** Ubicación específica (bin/rack) */
export interface WarehouseLocation {
  id: string;
  warehouse_id: string;
  zone_id?: string;

  // Código de ubicación: PASILLO-RACK-NIVEL-POSICION (ej: A-01-02-03)
  code: string;
  barcode?: string;

  aisle: string;              // Pasillo
  rack: string;               // Rack/Estantería
  level: string;              // Nivel (altura)
  position: string;           // Posición

  location_type: LocationType;

  // Capacidad
  max_weight: number;         // kg
  max_volume: number;         // m³
  max_pallets: number;

  // Estado actual
  current_weight: number;
  current_volume: number;
  current_pallets: number;

  // Configuración de picking
  is_pickable: boolean;       // ¿Se puede pickear desde acá?
  pick_sequence?: number;     // Orden de pickeo

  is_active: boolean;
  is_blocked: boolean;        // Bloqueado temporalmente
  block_reason?: string;

  created_at: string;
  updated_at: string;
}

export type LocationType =
  | 'rack'           // Rack estándar
  | 'shelf'          // Estante
  | 'floor'          // Piso
  | 'pallet'         // Posición de pallet
  | 'bin'            // Contenedor/Bin
  | 'bulk';          // A granel

/** Inventario por ubicación */
export interface LocationInventory {
  id: string;
  location_id: string;
  product_id: string;
  lot_id?: string;

  quantity: number;
  reserved_quantity: number;  // Reservado para picking
  available_quantity: number; // = quantity - reserved

  // Para FIFO/FEFO
  received_at: string;
  expiry_date?: string;

  created_at: string;
  updated_at: string;
}

/** Lote de producto */
export interface Lot {
  id: string;
  organization_id: string;
  product_id: string;

  lot_number: string;

  manufacture_date?: string;
  expiry_date?: string;
  received_date: string;

  supplier_id?: string;
  purchase_order_id?: string;

  initial_quantity: number;
  current_quantity: number;

  status: LotStatus;
  notes?: string;

  created_at: string;
  updated_at: string;
}

export type LotStatus =
  | 'available'      // Disponible
  | 'quarantine'     // En cuarentena
  | 'hold'           // Retenido
  | 'expired'        // Vencido
  | 'consumed';      // Consumido

// ============================================================
// WMS - OPERACIONES
// ============================================================

/** Orden de recepción */
export interface ReceivingOrder {
  id: string;
  organization_id: string;
  warehouse_id: string;

  // Referencia
  receiving_number: string;   // REC-2024-00001
  purchase_order_id?: string;
  supplier_id?: string;

  // Cita de recepción
  expected_date: string;
  expected_time_start?: string;
  expected_time_end?: string;

  // Ejecución
  actual_arrival_date?: string;
  started_at?: string;
  completed_at?: string;

  // Vehículo de entrada
  vehicle_plate?: string;
  driver_name?: string;

  // Documentación
  remito_number?: string;
  invoice_number?: string;

  status: ReceivingStatus;
  priority: Priority;

  notes?: string;
  created_by: string;

  created_at: string;
  updated_at: string;

  items?: ReceivingOrderItem[];
}

export type ReceivingStatus =
  | 'scheduled'      // Programada
  | 'arrived'        // Llegó el camión
  | 'in_progress'    // En proceso de descarga
  | 'completed'      // Completada
  | 'cancelled';     // Cancelada

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

/** Ítem de orden de recepción */
export interface ReceivingOrderItem {
  id: string;
  receiving_order_id: string;
  product_id: string;

  // Cantidades
  expected_quantity: number;
  received_quantity: number;
  damaged_quantity: number;
  rejected_quantity: number;

  // Lote
  lot_id?: string;
  lot_number?: string;
  expiry_date?: string;

  // Ubicación de destino sugerida
  suggested_location_id?: string;

  status: 'pending' | 'partial' | 'completed';
  notes?: string;

  created_at: string;
  updated_at: string;
}

/** Tarea de almacenamiento (Put-away) */
export interface PutawayTask {
  id: string;
  organization_id: string;
  receiving_order_item_id?: string;

  product_id: string;
  lot_id?: string;
  quantity: number;

  // Origen y destino
  source_location_id: string;
  target_location_id: string;

  status: TaskStatus;
  priority: Priority;

  assigned_to?: string;       // user_id
  started_at?: string;
  completed_at?: string;

  notes?: string;

  created_at: string;
  updated_at: string;
}

export type TaskStatus =
  | 'pending'        // Pendiente
  | 'assigned'       // Asignada
  | 'in_progress'    // En progreso
  | 'completed'      // Completada
  | 'cancelled';     // Cancelada

/** Orden de picking */
export interface PickingOrder {
  id: string;
  organization_id: string;
  warehouse_id: string;

  picking_number: string;     // PICK-2024-00001

  // Origen
  sales_order_id?: string;    // Orden de venta
  shipment_id?: string;       // Envío

  picking_type: PickingType;
  status: PickingStatus;
  priority: Priority;

  // Ejecución
  assigned_to?: string;
  started_at?: string;
  completed_at?: string;

  // Métricas
  total_lines: number;
  completed_lines: number;
  total_units: number;
  picked_units: number;

  notes?: string;
  created_by: string;

  created_at: string;
  updated_at: string;

  items?: PickingOrderItem[];
}

export type PickingType =
  | 'single'         // Una orden
  | 'batch'          // Varias órdenes
  | 'wave'           // Por ola
  | 'cluster';       // Por cluster/zona

export type PickingStatus =
  | 'pending'        // Pendiente
  | 'assigned'       // Asignada
  | 'in_progress'    // En progreso
  | 'completed'      // Completada
  | 'short'          // Completada con faltantes
  | 'cancelled';     // Cancelada

/** Ítem de orden de picking */
export interface PickingOrderItem {
  id: string;
  picking_order_id: string;
  sales_order_item_id?: string;

  product_id: string;
  lot_id?: string;
  location_id: string;

  // Cantidades
  quantity_required: number;
  quantity_picked: number;
  quantity_short: number;     // Faltante

  status: TaskStatus;

  // Ejecución
  picked_at?: string;
  picked_by?: string;

  notes?: string;

  created_at: string;
}

/** Tarea de packing */
export interface PackingTask {
  id: string;
  organization_id: string;

  picking_order_id: string;
  shipment_id?: string;

  status: TaskStatus;

  // Paquete resultante
  package_type?: string;      // Caja, sobre, pallet, etc.
  package_weight?: number;    // kg
  package_length?: number;    // cm
  package_width?: number;     // cm
  package_height?: number;    // cm

  // Etiqueta
  tracking_label?: string;
  label_url?: string;

  assigned_to?: string;
  started_at?: string;
  completed_at?: string;

  notes?: string;

  created_at: string;
  updated_at: string;
}

/** Conteo de inventario */
export interface InventoryCount {
  id: string;
  organization_id: string;
  warehouse_id: string;

  count_number: string;       // COUNT-2024-00001
  count_type: CountType;

  // Alcance
  zone_id?: string;           // Si es por zona específica
  category_id?: string;       // Si es por categoría

  status: CountStatus;

  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;

  // Resultados
  total_locations: number;
  counted_locations: number;
  discrepancies_found: number;

  reviewed_by?: string;
  approved_by?: string;

  notes?: string;
  created_by: string;

  created_at: string;
  updated_at: string;

  items?: InventoryCountItem[];
}

export type CountType =
  | 'full'           // Completo
  | 'cycle'          // Cíclico (ABC)
  | 'spot'           // Puntual
  | 'blind';         // A ciegas

export type CountStatus =
  | 'scheduled'      // Programado
  | 'in_progress'    // En progreso
  | 'pending_review' // Pendiente revisión
  | 'approved'       // Aprobado
  | 'completed';     // Completado (ajustes aplicados)

/** Ítem de conteo de inventario */
export interface InventoryCountItem {
  id: string;
  inventory_count_id: string;

  location_id: string;
  product_id: string;
  lot_id?: string;

  system_quantity: number;    // Cantidad en sistema
  counted_quantity?: number;  // Cantidad contada
  variance: number;           // Diferencia
  variance_percentage: number;

  status: 'pending' | 'counted' | 'recounted' | 'approved';

  variance_reason?: string;

  counted_by?: string;
  counted_at?: string;

  created_at: string;
}

// ============================================================
// TMS - TRANSPORTATION MANAGEMENT SYSTEM
// ============================================================

/** Transportista/Carrier */
export interface Carrier {
  id: string;
  organization_id: string;

  code: string;
  name: string;
  legal_name?: string;
  cuit?: string;

  carrier_type: CarrierType;

  // Contacto
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;

  // Tracking
  tracking_url_template?: string;  // https://carrier.com/track/{tracking}

  // Integración API
  api_enabled: boolean;
  api_endpoint?: string;
  api_key?: string;

  // Costos por defecto
  cost_per_km?: number;
  cost_per_delivery?: number;

  is_active: boolean;
  notes?: string;

  created_at: string;
  updated_at: string;
}

export type CarrierType =
  | 'own_fleet'      // Flota propia
  | 'dedicated'      // Tercero dedicado
  | 'courier'        // Courier (Andreani, OCA)
  | 'freight'        // Transporte de carga
  | 'crowdsource';   // Crowdsource (Rappi, Pedidos Ya)

/** Vehículo */
export interface Vehicle {
  id: string;
  organization_id: string;
  carrier_id?: string;

  // Identificación
  plate: string;
  internal_code?: string;     // Código interno (ej: CAM-001)

  vehicle_type: VehicleType;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;

  // Capacidades (CRÍTICO para cubicaje)
  max_weight: number;         // kg
  max_volume: number;         // m³
  max_pallets: number;        // Cantidad de pallets
  max_packages: number;       // Cantidad de bultos

  // Dimensiones de caja
  cargo_length: number;       // cm
  cargo_width: number;        // cm
  cargo_height: number;       // cm

  // Equipamiento
  has_refrigeration: boolean;
  has_tail_lift: boolean;     // Plataforma elevadora
  has_gps: boolean;
  gps_device_id?: string;

  // Documentación
  insurance_expiry?: string;
  vtv_expiry?: string;        // VTV/RTO
  permit_expiry?: string;

  // Estado
  status: VehicleStatus;
  current_driver_id?: string;
  current_location_lat?: number;
  current_location_lng?: number;
  last_location_update?: string;

  fuel_type: 'diesel' | 'gasoline' | 'gas' | 'electric';
  avg_consumption?: number;   // litros/100km

  notes?: string;

  created_at: string;
  updated_at: string;
}

export type VehicleType =
  | 'motorcycle'     // Moto
  | 'car'            // Auto
  | 'van'            // Utilitario/Fiorino
  | 'van_large'      // Utilitario grande/Sprinter
  | 'truck_3500'     // Camión hasta 3500kg
  | 'truck_7000'     // Camión hasta 7000kg
  | 'truck_10000'    // Camión hasta 10000kg
  | 'truck_semi'     // Semi-remolque
  | 'truck_trailer'; // Con acoplado

export type VehicleStatus =
  | 'available'      // Disponible
  | 'in_route'       // En ruta
  | 'maintenance'    // En mantenimiento
  | 'out_of_service';// Fuera de servicio

/** Conductor */
export interface Driver {
  id: string;
  organization_id: string;
  carrier_id?: string;
  user_id?: string;           // Para acceso a la app

  // Datos personales
  name: string;
  dni: string;
  phone: string;
  email?: string;
  photo_url?: string;

  // Licencia
  license_number: string;
  license_category: string;   // A, B, C, D, E
  license_expiry: string;

  // Documentación
  psychophysical_expiry?: string;  // Psicofísico
  art_number?: string;        // ART

  // Estado
  status: DriverStatus;
  current_vehicle_id?: string;
  current_route_id?: string;

  // Métricas
  total_deliveries: number;
  successful_deliveries: number;
  average_rating?: number;

  notes?: string;

  created_at: string;
  updated_at: string;
}

export type DriverStatus =
  | 'available'      // Disponible
  | 'in_route'       // En ruta
  | 'break'          // En descanso
  | 'off_duty'       // Fuera de servicio
  | 'inactive';      // Inactivo

// ============================================================
// ÓRDENES Y ENVÍOS
// ============================================================

/** Orden de venta */
export interface SalesOrder {
  id: string;
  organization_id: string;

  order_number: string;       // ORD-2024-00001

  // Origen
  channel: SalesChannel;
  external_order_id?: string; // ID de MELI, TiendaNube, etc.

  // Cliente
  customer_id: string;
  customer_address_id: string;

  // Almacén de origen
  warehouse_id: string;

  // Tipo de entrega
  delivery_type: DeliveryType;
  service_level: ServiceLevel;

  // Fechas
  order_date: string;
  promised_date?: string;     // Fecha prometida al cliente

  // Montos
  subtotal: number;
  tax: number;
  shipping_cost: number;
  discount: number;
  total: number;
  currency: 'ARS' | 'USD';

  // Pago
  payment_status: PaymentStatus;
  payment_method?: string;

  // Facturación
  invoice_status: InvoiceStatus;
  invoice_type?: 'A' | 'B' | 'C' | 'E';
  invoice_number?: string;
  cae?: string;
  cae_expiry?: string;

  // Estado
  status: SalesOrderStatus;

  // Notas
  customer_notes?: string;    // Notas del cliente
  internal_notes?: string;    // Notas internas

  created_by?: string;

  created_at: string;
  updated_at: string;

  items?: SalesOrderItem[];
  customer?: Customer;
  shipment?: Shipment;
}

export type SalesChannel =
  | 'portal'         // Portal B2B
  | 'phone'          // Telefónico
  | 'email'          // Email
  | 'sales_rep'      // Vendedor
  | 'meli'           // MercadoLibre
  | 'tiendanube'     // TiendaNube
  | 'woocommerce'    // WooCommerce
  | 'other';

export type DeliveryType =
  | 'delivery'       // Entrega a domicilio
  | 'pickup'         // Retiro en depósito
  | 'cross_dock';    // Cross-dock

export type ServiceLevel =
  | 'standard'       // Estándar (48-72hs)
  | 'express'        // Express (24hs)
  | 'same_day'       // Mismo día
  | 'scheduled';     // Programada

export type PaymentStatus =
  | 'pending'        // Pendiente
  | 'partial'        // Parcial
  | 'paid'           // Pagado
  | 'refunded';      // Reembolsado

export type InvoiceStatus =
  | 'pending'        // Pendiente de facturar
  | 'invoiced'       // Facturada
  | 'cancelled';     // Anulada

export type SalesOrderStatus =
  | 'draft'          // Borrador
  | 'confirmed'      // Confirmada
  | 'processing'     // En preparación (WMS)
  | 'ready'          // Lista para despacho
  | 'shipped'        // Despachada
  | 'delivered'      // Entregada
  | 'cancelled';     // Cancelada

/** Ítem de orden de venta */
export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;

  sku: string;
  product_name: string;

  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  total: number;

  // Para picking
  picked_quantity: number;

  notes?: string;

  created_at: string;
}

/** Envío */
export interface Shipment {
  id: string;
  organization_id: string;

  shipment_number: string;    // ENV-2024-00001

  // Origen
  sales_order_id?: string;
  warehouse_id: string;

  // Tipo de envío
  shipment_type: ShipmentType;
  service_level: ServiceLevel;

  // Transportista
  carrier_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  route_id?: string;

  // Tracking
  tracking_number?: string;
  external_tracking_url?: string;

  // Destino
  customer_id?: string;
  delivery_address: DeliveryAddress;

  // Paquetes
  package_count: number;
  total_weight: number;       // kg
  total_volume: number;       // m³
  total_pallets: number;

  // Valor
  declared_value?: number;
  insurance_value?: number;

  // Costos
  shipping_cost: number;
  carrier_cost?: number;      // Costo del carrier

  // Fechas
  created_date: string;
  pickup_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;

  // Estado
  status: ShipmentStatus;

  // POD - Proof of Delivery
  pod_status: 'pending' | 'captured' | 'confirmed';
  pod_signature_url?: string;
  pod_photo_url?: string;
  pod_notes?: string;
  pod_captured_at?: string;
  pod_captured_by?: string;

  // Geolocalización de entrega
  delivery_latitude?: number;
  delivery_longitude?: number;

  notes?: string;
  internal_notes?: string;

  created_by?: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  sales_order?: SalesOrder;
  carrier?: Carrier;
  vehicle?: Vehicle;
  driver?: Driver;
  tracking_events?: ShipmentTrackingEvent[];
  packages?: ShipmentPackage[];
}

export type ShipmentType =
  | 'full_truckload'    // Camión completo
  | 'ltl'               // Less than truckload (parcial)
  | 'parcel'            // Paquetería
  | 'express';          // Express

export type ShipmentStatus =
  | 'draft'             // Borrador
  | 'pending_pickup'    // Pendiente de retiro
  | 'picked_up'         // Retirado
  | 'in_transit'        // En tránsito
  | 'out_for_delivery'  // En reparto
  | 'delivered'         // Entregado
  | 'partial_delivery'  // Entrega parcial
  | 'failed_attempt'    // Intento fallido
  | 'returned'          // Devuelto
  | 'cancelled';        // Cancelado

export interface DeliveryAddress {
  name: string;
  street: string;
  number: string;
  floor?: string;
  apartment?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude?: number;
  longitude?: number;

  contact_name: string;
  contact_phone: string;
  contact_email?: string;

  delivery_instructions?: string;

  // Ventana de entrega
  delivery_window_start?: string;
  delivery_window_end?: string;
}

/** Paquete/Bulto de un envío */
export interface ShipmentPackage {
  id: string;
  shipment_id: string;

  package_number: number;     // 1, 2, 3...
  barcode?: string;

  package_type: 'box' | 'pallet' | 'envelope' | 'tube' | 'other';

  weight: number;             // kg
  length: number;             // cm
  width: number;              // cm
  height: number;             // cm

  description?: string;

  created_at: string;
}

/** Evento de tracking del envío */
export interface ShipmentTrackingEvent {
  id: string;
  shipment_id: string;

  status: ShipmentStatus;
  description: string;

  location?: string;
  latitude?: number;
  longitude?: number;

  event_date: string;

  created_by?: string;
  source: 'system' | 'driver' | 'carrier_api' | 'manual';

  created_at: string;
}

// ============================================================
// RUTAS Y PLANIFICACIÓN
// ============================================================

/** Ruta de entrega */
export interface DeliveryRoute {
  id: string;
  organization_id: string;

  route_number: string;       // RUTA-2024-00001
  route_date: string;

  // Asignación
  vehicle_id?: string;
  driver_id?: string;

  // Tipo
  route_type: RouteType;

  // Planificación
  planned_start_time: string;
  planned_end_time: string;

  // Ejecución
  actual_start_time?: string;
  actual_end_time?: string;

  // Origen (depósito de salida)
  origin_warehouse_id: string;
  origin_address: string;
  origin_latitude: number;
  origin_longitude: number;

  // Métricas planificadas
  planned_distance: number;   // km
  planned_duration: number;   // minutos
  planned_stops: number;
  planned_packages: number;
  planned_weight: number;     // kg
  planned_volume: number;     // m³

  // Ocupación del vehículo
  weight_utilization: number; // % de capacidad de peso usada
  volume_utilization: number; // % de capacidad de volumen usada

  // Métricas reales
  actual_distance?: number;
  actual_duration?: number;
  completed_stops: number;
  failed_stops: number;

  status: RouteStatus;

  notes?: string;

  created_by: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  vehicle?: Vehicle;
  driver?: Driver;
  stops?: RouteStop[];
}

export type RouteType =
  | 'delivery'       // Entrega
  | 'pickup'         // Recolección
  | 'mixed';         // Mixta

export type RouteStatus =
  | 'draft'          // Borrador (en planificación)
  | 'planned'        // Planificada
  | 'assigned'       // Asignada a vehículo/conductor
  | 'in_progress'    // En ejecución
  | 'completed'      // Completada
  | 'cancelled';     // Cancelada

/** Parada de ruta */
export interface RouteStop {
  id: string;
  route_id: string;
  shipment_id: string;

  // Secuencia
  sequence: number;           // Orden de visita

  stop_type: 'delivery' | 'pickup';

  // Dirección
  address: string;
  city: string;
  latitude: number;
  longitude: number;

  // Cliente
  customer_id?: string;
  customer_name: string;
  contact_name?: string;
  contact_phone?: string;

  // Planificación
  planned_arrival: string;
  planned_departure: string;
  planned_service_time: number;  // minutos

  // Ventana de entrega
  time_window_start?: string;
  time_window_end?: string;

  // Carga
  packages: number;
  weight: number;
  volume: number;
  pallets: number;

  // Ejecución
  actual_arrival?: string;
  actual_departure?: string;

  // Resultado
  status: StopStatus;
  failure_reason?: FailureReason;
  failure_notes?: string;

  // POD
  signature_url?: string;
  photo_url?: string;
  pod_notes?: string;

  notes?: string;

  created_at: string;
  updated_at: string;
}

export type StopStatus =
  | 'pending'        // Pendiente
  | 'in_progress'    // Llegó, en proceso
  | 'completed'      // Completada
  | 'partial'        // Entrega parcial
  | 'failed'         // Fallida
  | 'skipped';       // Salteada

export type FailureReason =
  | 'absent'            // Ausente
  | 'refused'           // Rechazado
  | 'wrong_address'     // Dirección incorrecta
  | 'access_denied'     // Sin acceso
  | 'closed'            // Cerrado
  | 'damaged_goods'     // Mercadería dañada
  | 'incomplete_order'  // Pedido incompleto
  | 'reschedule'        // Reprogramar
  | 'other';            // Otro

// ============================================================
// INTEGRACIONES
// ============================================================

/** Configuración de integración externa */
export interface Integration {
  id: string;
  organization_id: string;

  integration_type: IntegrationType;
  name: string;

  is_active: boolean;

  // Credenciales (encriptadas)
  credentials: Record<string, string>;

  // Configuración
  config: Record<string, any>;

  // Última sincronización
  last_sync_at?: string;
  last_sync_status?: 'success' | 'error';
  last_sync_error?: string;

  created_at: string;
  updated_at: string;
}

export type IntegrationType =
  | 'afip'           // AFIP facturación
  | 'meli'           // MercadoLibre
  | 'tiendanube'     // TiendaNube
  | 'woocommerce'    // WooCommerce
  | 'carrier_api';   // API de carrier

/** Log de sincronización */
export interface SyncLog {
  id: string;
  integration_id: string;

  sync_type: 'full' | 'incremental';
  direction: 'inbound' | 'outbound';

  started_at: string;
  completed_at?: string;

  status: 'running' | 'success' | 'error';

  records_processed: number;
  records_success: number;
  records_error: number;

  error_message?: string;
  error_details?: Record<string, any>;

  created_at: string;
}

// ============================================================
// AUDITORÍA Y LOGS
// ============================================================

/** Log de auditoría */
export interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;

  entity_type: string;        // 'shipment', 'order', etc.
  entity_id: string;

  action: 'create' | 'update' | 'delete' | 'status_change';

  old_values?: Record<string, any>;
  new_values?: Record<string, any>;

  ip_address?: string;
  user_agent?: string;

  created_at: string;
}

// ============================================================
// NOTIFICACIONES
// ============================================================

/** Notificación */
export interface Notification {
  id: string;
  organization_id: string;
  user_id?: string;           // Si es para usuario específico
  customer_id?: string;       // Si es para cliente

  notification_type: NotificationType;
  channel: 'email' | 'sms' | 'push' | 'whatsapp';

  subject?: string;
  message: string;

  // Referencia
  entity_type?: string;
  entity_id?: string;

  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;

  created_at: string;
}

export type NotificationType =
  | 'order_confirmed'
  | 'order_shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'delivery_rescheduled';

// ============================================================
// DASHBOARDS Y MÉTRICAS
// ============================================================

export interface DashboardMetrics {
  // Órdenes
  orders_today: number;
  orders_pending: number;
  orders_processing: number;

  // WMS
  receiving_pending: number;
  picking_pending: number;
  packing_pending: number;

  // TMS
  shipments_today: number;
  shipments_in_transit: number;
  shipments_delivered: number;
  shipments_failed: number;

  // Rutas
  routes_active: number;
  vehicles_in_route: number;
  drivers_available: number;

  // KPIs
  on_time_delivery_rate: number;      // %
  first_attempt_success_rate: number; // %
  average_delivery_time: number;      // horas
  vehicle_utilization: number;        // %
  warehouse_occupancy: number;        // %
}

export interface WMSMetrics {
  // Inventario
  total_skus: number;
  total_locations: number;
  occupied_locations: number;
  occupancy_rate: number;

  // Lotes
  lots_expiring_7d: number;
  lots_expiring_30d: number;
  lots_in_quarantine: number;

  // Operaciones hoy
  receivings_completed: number;
  putaways_completed: number;
  pickings_completed: number;
  packings_completed: number;

  // Productividad
  picks_per_hour: number;
  units_picked_today: number;
  orders_shipped_today: number;
}

export interface TMSMetrics {
  // Flota
  total_vehicles: number;
  vehicles_available: number;
  vehicles_in_route: number;
  vehicles_maintenance: number;

  // Conductores
  total_drivers: number;
  drivers_active: number;

  // Entregas hoy
  deliveries_planned: number;
  deliveries_completed: number;
  deliveries_failed: number;

  // KPIs
  on_time_rate: number;
  success_rate: number;
  avg_stops_per_route: number;
  avg_km_per_route: number;

  // Costos
  cost_per_delivery: number;
  cost_per_km: number;
}
