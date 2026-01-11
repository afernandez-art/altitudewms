'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Shipment, ShipmentWithRelations, TablesInsert, TablesUpdate } from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// QUERIES
// ============================================================

export function useShipments(filters?: {
  status?: Shipment['status']
  dateFrom?: string
  dateTo?: string
  customerId?: string
}) {
  return useQuery({
    queryKey: ['shipments', filters],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select(`
          *,
          customer:customers(id, code, name, contact_phone),
          warehouse:warehouses(id, code, name),
          carrier:carriers(id, code, name),
          vehicle:vehicles(id, plate, vehicle_type),
          driver:drivers(id, name, phone)
        `)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.dateFrom) {
        query = query.gte('created_date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('created_date', filters.dateTo)
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as ShipmentWithRelations[]
    }
  })
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          customer:customers(id, code, name, contact_phone, contact_email),
          warehouse:warehouses(id, code, name, address, city),
          carrier:carriers(id, code, name),
          vehicle:vehicles(id, plate, vehicle_type, max_weight, max_volume),
          driver:drivers(id, name, phone),
          tracking_events:shipment_tracking_events(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as ShipmentWithRelations
    },
    enabled: !!id
  })
}

export function useShipmentTracking(shipmentId: string) {
  return useQuery({
    queryKey: ['shipment-tracking', shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_tracking_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('event_date', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!shipmentId
  })
}

// ============================================================
// MUTATIONS
// ============================================================

export function useCreateShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shipment: TablesInsert<'shipments'>) => {
      // Generar número de envío automático
      const { data: lastShipment } = await supabase
        .from('shipments')
        .select('shipment_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastShipment?.shipment_number) {
        const match = lastShipment.shipment_number.match(/(\d+)$/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      const shipmentNumber = `ENV-${new Date().getFullYear()}-${nextNumber.toString().padStart(5, '0')}`

      const { data, error } = await supabase
        .from('shipments')
        .insert({
          ...shipment,
          shipment_number: shipmentNumber,
          status: shipment.status || 'draft'
        })
        .select()
        .single()

      if (error) throw error

      // Crear evento de tracking inicial
      await supabase.from('shipment_tracking_events').insert({
        shipment_id: data.id,
        status: 'draft',
        description: 'Envío creado',
        source: 'system'
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    }
  })
}

export function useUpdateShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'shipments'> & { id: string }) => {
      const { data, error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', data.id] })
    }
  })
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      description,
      location
    }: {
      id: string
      status: Shipment['status']
      description?: string
      location?: string
    }) => {
      // Actualizar estado del envío
      const { data: shipment, error } = await supabase
        .from('shipments')
        .update({
          status,
          ...(status === 'delivered' ? { actual_delivery_date: new Date().toISOString() } : {}),
          ...(status === 'picked_up' ? { pickup_date: new Date().toISOString() } : {})
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Crear evento de tracking
      const statusDescriptions: Record<string, string> = {
        draft: 'Envío creado',
        pending_pickup: 'Pendiente de retiro',
        picked_up: 'Retirado del depósito',
        in_transit: 'En tránsito',
        out_for_delivery: 'En reparto',
        delivered: 'Entregado',
        partial_delivery: 'Entrega parcial',
        failed_attempt: 'Intento fallido',
        returned: 'Devuelto',
        cancelled: 'Cancelado'
      }

      await supabase.from('shipment_tracking_events').insert({
        shipment_id: id,
        status,
        description: description || statusDescriptions[status] || `Estado cambiado a ${status}`,
        location,
        source: 'system'
      })

      return shipment
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', data.id] })
      queryClient.invalidateQueries({ queryKey: ['shipment-tracking', data.id] })
    }
  })
}

export function useDeleteShipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

export const shipmentStatusLabels: Record<Shipment['status'], string> = {
  draft: 'Borrador',
  pending_pickup: 'Pendiente retiro',
  picked_up: 'Retirado',
  in_transit: 'En tránsito',
  out_for_delivery: 'En reparto',
  delivered: 'Entregado',
  partial_delivery: 'Entrega parcial',
  failed_attempt: 'Fallido',
  returned: 'Devuelto',
  cancelled: 'Cancelado'
}

export const shipmentStatusColors: Record<Shipment['status'], string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_pickup: 'bg-yellow-100 text-yellow-800',
  picked_up: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  partial_delivery: 'bg-orange-100 text-orange-800',
  failed_attempt: 'bg-red-100 text-red-800',
  returned: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
}

export function getNextStatuses(currentStatus: Shipment['status']): Shipment['status'][] {
  const transitions: Record<Shipment['status'], Shipment['status'][]> = {
    draft: ['pending_pickup', 'cancelled'],
    pending_pickup: ['picked_up', 'cancelled'],
    picked_up: ['in_transit', 'cancelled'],
    in_transit: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'partial_delivery', 'failed_attempt'],
    delivered: [],
    partial_delivery: ['delivered', 'returned'],
    failed_attempt: ['out_for_delivery', 'returned'],
    returned: [],
    cancelled: []
  }
  return transitions[currentStatus] || []
}
