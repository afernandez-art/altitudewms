'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Warehouse, TablesInsert, TablesUpdate } from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// WAREHOUSE QUERIES
// ============================================================

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: ['warehouse', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select(`
          *,
          zones:warehouse_zones(
            *,
            locations:warehouse_locations(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useActiveWarehouses() {
  return useQuery({
    queryKey: ['warehouses', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}

// ============================================================
// WAREHOUSE MUTATIONS
// ============================================================

export function useCreateWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (warehouse: TablesInsert<'warehouses'>) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert(warehouse)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    }
  })
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'warehouses'> & { id: string }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse', data.id] })
    }
  })
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    }
  })
}

// ============================================================
// ZONES
// ============================================================

export function useWarehouseZones(warehouseId: string) {
  return useQuery({
    queryKey: ['warehouse-zones', warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_zones')
        .select(`
          *,
          locations:warehouse_locations(count)
        `)
        .eq('warehouse_id', warehouseId)
        .order('name', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!warehouseId
  })
}

export function useCreateZone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (zone: TablesInsert<'warehouse_zones'>) => {
      const { data, error } = await supabase
        .from('warehouse_zones')
        .insert(zone)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-zones', data.warehouse_id] })
      queryClient.invalidateQueries({ queryKey: ['warehouse', data.warehouse_id] })
    }
  })
}

// ============================================================
// LOCATIONS
// ============================================================

export function useWarehouseLocations(warehouseId: string, zoneId?: string) {
  return useQuery({
    queryKey: ['warehouse-locations', warehouseId, zoneId],
    queryFn: async () => {
      let query = supabase
        .from('warehouse_locations')
        .select(`
          *,
          zone:warehouse_zones(id, code, name, zone_type)
        `)
        .eq('warehouse_id', warehouseId)
        .order('code', { ascending: true })

      if (zoneId) {
        query = query.eq('zone_id', zoneId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
    enabled: !!warehouseId
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (location: TablesInsert<'warehouse_locations'>) => {
      // Generar código automático si no se proporciona
      let code = location.code
      if (!code && location.aisle && location.rack && location.level && location.position) {
        code = `${location.aisle}-${location.rack}-${location.level}-${location.position}`
      }

      const { data, error } = await supabase
        .from('warehouse_locations')
        .insert({
          ...location,
          code
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-locations', data.warehouse_id] })
    }
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'warehouse_locations'> & { id: string }) => {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-locations', data.warehouse_id] })
    }
  })
}

// ============================================================
// INVENTORY
// ============================================================

export function useLocationInventory(locationId: string) {
  return useQuery({
    queryKey: ['location-inventory', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_inventory')
        .select(`
          *,
          product:products(id, sku, name),
          lot:lots(id, lot_number, expiry_date)
        `)
        .eq('location_id', locationId)

      if (error) throw error
      return data
    },
    enabled: !!locationId
  })
}

export function useProductInventory(productId: string) {
  return useQuery({
    queryKey: ['product-inventory', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_inventory')
        .select(`
          *,
          location:warehouse_locations(
            id, code,
            warehouse:warehouses(id, code, name)
          ),
          lot:lots(id, lot_number, expiry_date)
        `)
        .eq('product_id', productId)

      if (error) throw error
      return data
    },
    enabled: !!productId
  })
}

export function useInventorySummary(warehouseId?: string) {
  return useQuery({
    queryKey: ['inventory-summary', warehouseId],
    queryFn: async () => {
      let query = supabase
        .from('location_inventory')
        .select(`
          quantity,
          reserved_quantity,
          product:products(id, sku, name, min_stock),
          location:warehouse_locations!inner(warehouse_id)
        `)

      if (warehouseId) {
        query = query.eq('location.warehouse_id', warehouseId)
      }

      const { data, error } = await query

      if (error) throw error

      // Agrupar por producto
      const byProduct: Record<string, {
        product: any
        totalQuantity: number
        totalReserved: number
        totalAvailable: number
      }> = {}

      data?.forEach(item => {
        const productId = item.product?.id
        if (!productId) return

        if (!byProduct[productId]) {
          byProduct[productId] = {
            product: item.product,
            totalQuantity: 0,
            totalReserved: 0,
            totalAvailable: 0
          }
        }

        byProduct[productId].totalQuantity += item.quantity
        byProduct[productId].totalReserved += item.reserved_quantity
        byProduct[productId].totalAvailable += (item.quantity - item.reserved_quantity)
      })

      return Object.values(byProduct)
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

export const warehouseTypeLabels: Record<Warehouse['warehouse_type'], string> = {
  main: 'Principal',
  distribution: 'Distribución',
  transit: 'Tránsito',
  cross_dock: 'Cross-dock'
}

export const zoneTypeLabels: Record<string, string> = {
  receiving: 'Recepción',
  storage: 'Almacenamiento',
  picking: 'Picking',
  packing: 'Packing',
  staging: 'Staging',
  shipping: 'Despacho',
  returns: 'Devoluciones',
  quarantine: 'Cuarentena',
  damaged: 'Dañados'
}

export const locationTypeLabels: Record<string, string> = {
  rack: 'Rack',
  shelf: 'Estante',
  floor: 'Piso',
  pallet: 'Pallet',
  bin: 'Bin',
  bulk: 'A granel'
}
