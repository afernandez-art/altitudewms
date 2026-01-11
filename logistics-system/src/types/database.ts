// Tipos generados para Supabase
// Basados en el schema de logistics-system

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          legal_name: string
          cuit: string
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          afip_environment: 'testing' | 'production'
          afip_certificate: string | null
          afip_private_key: string | null
          punto_venta: number | null
          default_warehouse_id: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      user_profiles: {
        Row: {
          id: string
          organization_id: string | null
          email: string
          name: string
          phone: string | null
          avatar_url: string | null
          role: 'admin' | 'operations' | 'warehouse' | 'transport' | 'dispatcher' | 'viewer'
          is_active: boolean
          driver_id: string | null
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      customers: {
        Row: {
          id: string
          organization_id: string
          code: string
          name: string
          legal_name: string | null
          cuit: string | null
          customer_type: 'distributor' | 'retailer' | 'wholesale' | 'chain' | 'direct'
          segment: string | null
          price_list_id: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          credit_limit: number
          current_balance: number
          payment_terms: number
          portal_enabled: boolean
          portal_user_id: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at' | 'credit_limit' | 'current_balance' | 'payment_terms' | 'portal_enabled' | 'is_active'> & {
          id?: string
          created_at?: string
          updated_at?: string
          credit_limit?: number
          current_balance?: number
          payment_terms?: number
          portal_enabled?: boolean
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      customer_addresses: {
        Row: {
          id: string
          customer_id: string
          name: string
          address_type: 'delivery' | 'billing' | 'both'
          street: string
          number: string | null
          floor: string | null
          apartment: string | null
          city: string
          state: string | null
          zip_code: string | null
          country: string
          latitude: number | null
          longitude: number | null
          delivery_window_start: string | null
          delivery_window_end: string | null
          delivery_days: number[] | null
          requires_appointment: boolean
          access_instructions: string | null
          contact_name: string | null
          contact_phone: string | null
          requires_forklift: boolean
          requires_pallet_jack: boolean
          has_loading_dock: boolean
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customer_addresses']['Row'], 'id' | 'created_at' | 'updated_at' | 'requires_appointment' | 'requires_forklift' | 'requires_pallet_jack' | 'has_loading_dock' | 'is_default' | 'is_active'> & {
          id?: string
          created_at?: string
          updated_at?: string
          requires_appointment?: boolean
          requires_forklift?: boolean
          requires_pallet_jack?: boolean
          has_loading_dock?: boolean
          is_default?: boolean
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['customer_addresses']['Insert']>
      }
      products: {
        Row: {
          id: string
          organization_id: string
          sku: string
          barcode: string | null
          name: string
          description: string | null
          category_id: string | null
          brand: string | null
          weight: number
          length: number
          width: number
          height: number
          volume: number
          base_unit: string
          units_per_box: number | null
          boxes_per_pallet: number | null
          cost: number
          price: number
          currency: 'ARS' | 'USD'
          requires_lot_control: boolean
          requires_expiry_control: boolean
          shelf_life_days: number | null
          min_stock: number
          max_stock: number | null
          reorder_point: number | null
          is_active: boolean
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at' | 'volume'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      warehouses: {
        Row: {
          id: string
          organization_id: string
          code: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          latitude: number | null
          longitude: number | null
          total_area: number | null
          storage_area: number | null
          max_pallets: number | null
          operating_hours_start: string
          operating_hours_end: string
          warehouse_type: 'main' | 'distribution' | 'transit' | 'cross_dock'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['warehouses']['Row'], 'id' | 'created_at' | 'updated_at' | 'is_active'> & {
          id?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['warehouses']['Insert']>
      }
      carriers: {
        Row: {
          id: string
          organization_id: string
          code: string
          name: string
          legal_name: string | null
          cuit: string | null
          carrier_type: 'own_fleet' | 'dedicated' | 'courier' | 'freight' | 'crowdsource'
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          tracking_url_template: string | null
          api_enabled: boolean
          api_endpoint: string | null
          api_key: string | null
          cost_per_km: number | null
          cost_per_delivery: number | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['carriers']['Row'], 'id' | 'created_at' | 'updated_at' | 'api_enabled' | 'is_active'> & {
          id?: string
          created_at?: string
          updated_at?: string
          api_enabled?: boolean
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['carriers']['Insert']>
      }
      vehicles: {
        Row: {
          id: string
          organization_id: string
          carrier_id: string | null
          plate: string
          internal_code: string | null
          vehicle_type: 'motorcycle' | 'car' | 'van' | 'van_large' | 'truck_3500' | 'truck_7000' | 'truck_10000' | 'truck_semi' | 'truck_trailer'
          brand: string | null
          model: string | null
          year: number | null
          color: string | null
          max_weight: number
          max_volume: number
          max_pallets: number
          max_packages: number | null
          cargo_length: number | null
          cargo_width: number | null
          cargo_height: number | null
          has_refrigeration: boolean
          has_tail_lift: boolean
          has_gps: boolean
          gps_device_id: string | null
          insurance_expiry: string | null
          vtv_expiry: string | null
          permit_expiry: string | null
          status: 'available' | 'in_route' | 'maintenance' | 'out_of_service'
          current_driver_id: string | null
          current_location_lat: number | null
          current_location_lng: number | null
          last_location_update: string | null
          fuel_type: 'diesel' | 'gasoline' | 'gas' | 'electric'
          avg_consumption: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at' | 'max_pallets' | 'has_refrigeration' | 'has_tail_lift' | 'has_gps'> & {
          id?: string
          created_at?: string
          updated_at?: string
          max_pallets?: number
          has_refrigeration?: boolean
          has_tail_lift?: boolean
          has_gps?: boolean
        }
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>
      }
      drivers: {
        Row: {
          id: string
          organization_id: string
          carrier_id: string | null
          user_id: string | null
          name: string
          dni: string
          phone: string
          email: string | null
          photo_url: string | null
          license_number: string
          license_category: string
          license_expiry: string
          psychophysical_expiry: string | null
          art_number: string | null
          status: 'available' | 'in_route' | 'break' | 'off_duty' | 'inactive'
          current_vehicle_id: string | null
          current_route_id: string | null
          total_deliveries: number
          successful_deliveries: number
          average_rating: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['drivers']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_deliveries' | 'successful_deliveries'> & {
          id?: string
          created_at?: string
          updated_at?: string
          total_deliveries?: number
          successful_deliveries?: number
        }
        Update: Partial<Database['public']['Tables']['drivers']['Insert']>
      }
      shipments: {
        Row: {
          id: string
          organization_id: string
          shipment_number: string
          sales_order_id: string | null
          warehouse_id: string
          shipment_type: 'full_truckload' | 'ltl' | 'parcel' | 'express'
          service_level: 'standard' | 'express' | 'same_day' | 'scheduled'
          carrier_id: string | null
          vehicle_id: string | null
          driver_id: string | null
          route_id: string | null
          tracking_number: string | null
          external_tracking_url: string | null
          customer_id: string | null
          delivery_address: Json
          package_count: number
          total_weight: number
          total_volume: number
          total_pallets: number
          declared_value: number | null
          insurance_value: number | null
          shipping_cost: number
          carrier_cost: number | null
          created_date: string
          pickup_date: string | null
          estimated_delivery_date: string | null
          actual_delivery_date: string | null
          status: 'draft' | 'pending_pickup' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'partial_delivery' | 'failed_attempt' | 'returned' | 'cancelled'
          pod_status: 'pending' | 'captured' | 'confirmed'
          pod_signature_url: string | null
          pod_photo_url: string | null
          pod_notes: string | null
          pod_captured_at: string | null
          pod_captured_by: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          notes: string | null
          internal_notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['shipments']['Row'], 'id' | 'created_at' | 'updated_at' | 'created_date' | 'package_count' | 'total_weight' | 'total_volume' | 'total_pallets' | 'shipping_cost'> & {
          id?: string
          created_at?: string
          updated_at?: string
          created_date?: string
          package_count?: number
          total_weight?: number
          total_volume?: number
          total_pallets?: number
          shipping_cost?: number
        }
        Update: Partial<Database['public']['Tables']['shipments']['Insert']>
      }
      shipment_tracking_events: {
        Row: {
          id: string
          shipment_id: string
          status: string
          description: string
          location: string | null
          latitude: number | null
          longitude: number | null
          event_date: string
          created_by: string | null
          source: 'system' | 'driver' | 'carrier_api' | 'manual'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['shipment_tracking_events']['Row'], 'id' | 'created_at' | 'event_date'> & {
          id?: string
          created_at?: string
          event_date?: string
        }
        Update: Partial<Database['public']['Tables']['shipment_tracking_events']['Insert']>
      }
      delivery_routes: {
        Row: {
          id: string
          organization_id: string
          route_number: string
          route_date: string
          vehicle_id: string | null
          driver_id: string | null
          route_type: 'delivery' | 'pickup' | 'mixed'
          planned_start_time: string
          planned_end_time: string
          actual_start_time: string | null
          actual_end_time: string | null
          origin_warehouse_id: string
          origin_address: string
          origin_latitude: number | null
          origin_longitude: number | null
          planned_distance: number | null
          planned_duration: number | null
          planned_stops: number
          planned_packages: number
          planned_weight: number
          planned_volume: number
          weight_utilization: number
          volume_utilization: number
          actual_distance: number | null
          actual_duration: number | null
          completed_stops: number
          failed_stops: number
          status: 'draft' | 'planned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['delivery_routes']['Row'], 'id' | 'created_at' | 'updated_at' | 'planned_stops' | 'planned_packages' | 'planned_weight' | 'planned_volume' | 'weight_utilization' | 'volume_utilization' | 'completed_stops' | 'failed_stops'> & {
          id?: string
          created_at?: string
          updated_at?: string
          planned_stops?: number
          planned_packages?: number
          planned_weight?: number
          planned_volume?: number
          weight_utilization?: number
          volume_utilization?: number
          completed_stops?: number
          failed_stops?: number
        }
        Update: Partial<Database['public']['Tables']['delivery_routes']['Insert']>
      }
      route_stops: {
        Row: {
          id: string
          route_id: string
          shipment_id: string
          sequence: number
          stop_type: 'delivery' | 'pickup'
          address: string
          city: string | null
          latitude: number
          longitude: number
          customer_id: string | null
          customer_name: string
          contact_name: string | null
          contact_phone: string | null
          planned_arrival: string | null
          planned_departure: string | null
          planned_service_time: number | null
          time_window_start: string | null
          time_window_end: string | null
          packages: number
          weight: number
          volume: number
          pallets: number
          actual_arrival: string | null
          actual_departure: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'partial' | 'failed' | 'skipped'
          failure_reason: 'absent' | 'refused' | 'wrong_address' | 'access_denied' | 'closed' | 'damaged_goods' | 'incomplete_order' | 'reschedule' | 'other' | null
          failure_notes: string | null
          signature_url: string | null
          photo_url: string | null
          pod_notes: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['route_stops']['Row'], 'id' | 'created_at' | 'updated_at' | 'packages' | 'weight' | 'volume' | 'pallets'> & {
          id?: string
          created_at?: string
          updated_at?: string
          packages?: number
          weight?: number
          volume?: number
          pallets?: number
        }
        Update: Partial<Database['public']['Tables']['route_stops']['Insert']>
      }
      sales_orders: {
        Row: {
          id: string
          organization_id: string
          order_number: string
          channel: 'portal' | 'phone' | 'email' | 'sales_rep' | 'meli' | 'tiendanube' | 'woocommerce' | 'other'
          external_order_id: string | null
          customer_id: string
          customer_address_id: string | null
          warehouse_id: string
          delivery_type: 'delivery' | 'pickup' | 'cross_dock'
          service_level: 'standard' | 'express' | 'same_day' | 'scheduled'
          order_date: string
          promised_date: string | null
          subtotal: number
          tax: number
          shipping_cost: number
          discount: number
          total: number
          currency: 'ARS' | 'USD'
          payment_status: 'pending' | 'partial' | 'paid' | 'refunded'
          payment_method: string | null
          invoice_status: 'pending' | 'invoiced' | 'cancelled'
          invoice_type: 'A' | 'B' | 'C' | 'E' | null
          invoice_number: string | null
          cae: string | null
          cae_expiry: string | null
          status: 'draft' | 'confirmed' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
          customer_notes: string | null
          internal_notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sales_orders']['Row'], 'id' | 'created_at' | 'updated_at' | 'order_date' | 'subtotal' | 'tax' | 'shipping_cost' | 'discount' | 'total'> & {
          id?: string
          created_at?: string
          updated_at?: string
          order_date?: string
          subtotal?: number
          tax?: number
          shipping_cost?: number
          discount?: number
          total?: number
        }
        Update: Partial<Database['public']['Tables']['sales_orders']['Insert']>
      }
    }
    Views: {}
    Functions: {}
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience types
export type Organization = Tables<'organizations'>
export type UserProfile = Tables<'user_profiles'>
export type Customer = Tables<'customers'>
export type CustomerAddress = Tables<'customer_addresses'>
export type Product = Tables<'products'>
export type Warehouse = Tables<'warehouses'>
export type Carrier = Tables<'carriers'>
export type Vehicle = Tables<'vehicles'>
export type Driver = Tables<'drivers'>
export type Shipment = Tables<'shipments'>
export type ShipmentTrackingEvent = Tables<'shipment_tracking_events'>
export type DeliveryRoute = Tables<'delivery_routes'>
export type RouteStop = Tables<'route_stops'>
export type SalesOrder = Tables<'sales_orders'>

// Extended types with relations
export type ShipmentWithRelations = Shipment & {
  customer?: Customer | null
  warehouse?: Warehouse | null
  carrier?: Carrier | null
  vehicle?: Vehicle | null
  driver?: Driver | null
  tracking_events?: ShipmentTrackingEvent[]
}

export type CustomerWithAddresses = Customer & {
  addresses?: CustomerAddress[]
}

export type RouteWithStops = DeliveryRoute & {
  vehicle?: Vehicle | null
  driver?: Driver | null
  stops?: RouteStop[]
}
