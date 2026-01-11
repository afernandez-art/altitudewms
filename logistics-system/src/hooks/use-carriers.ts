'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Carrier, TablesInsert, TablesUpdate } from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// QUERIES
// ============================================================

export function useCarriers(filters?: {
  isActive?: boolean
  carrierType?: Carrier['carrier_type']
}) {
  return useQuery({
    queryKey: ['carriers', filters],
    queryFn: async () => {
      let query = supabase
        .from('carriers')
        .select(`
          *,
          vehicles:vehicles(count),
          active_shipments:shipments(count)
        `)
        .order('name', { ascending: true })

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }
      if (filters?.carrierType) {
        query = query.eq('carrier_type', filters.carrierType)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useCarrier(id: string) {
  return useQuery({
    queryKey: ['carrier', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carriers')
        .select(`
          *,
          vehicles:vehicles(
            id, plate, vehicle_type, status, max_weight, max_volume,
            current_driver:drivers(id, name, phone)
          ),
          recent_shipments:shipments(
            id, shipment_number, status, created_at
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

export function useActiveCarriers() {
  return useQuery({
    queryKey: ['carriers', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carriers')
        .select('id, code, name, carrier_type')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}

// ============================================================
// MUTATIONS
// ============================================================

export function useCreateCarrier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (carrier: TablesInsert<'carriers'>) => {
      // Generar código automático si no se proporciona
      let code = carrier.code
      if (!code) {
        const { data: lastCarrier } = await supabase
          .from('carriers')
          .select('code')
          .ilike('code', 'TRANSP-%')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let nextNumber = 1
        if (lastCarrier?.code) {
          const match = lastCarrier.code.match(/TRANSP-(\d+)/)
          if (match) {
            nextNumber = parseInt(match[1]) + 1
          }
        }
        code = `TRANSP-${nextNumber.toString().padStart(4, '0')}`
      }

      const { data, error } = await supabase
        .from('carriers')
        .insert({
          ...carrier,
          code,
          is_active: carrier.is_active ?? true
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] })
    }
  })
}

export function useUpdateCarrier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'carriers'> & { id: string }) => {
      const { data, error } = await supabase
        .from('carriers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] })
      queryClient.invalidateQueries({ queryKey: ['carrier', data.id] })
    }
  })
}

export function useDeleteCarrier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('carriers')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] })
    }
  })
}

// ============================================================
// CARRIER SERVICES
// ============================================================

export function useCarrierServices(carrierId: string) {
  return useQuery({
    queryKey: ['carrier-services', carrierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carrier_services')
        .select('*')
        .eq('carrier_id', carrierId)
        .order('name', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!carrierId
  })
}

export function useCreateCarrierService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (service: TablesInsert<'carrier_services'>) => {
      const { data, error } = await supabase
        .from('carrier_services')
        .insert(service)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['carrier-services', data.carrier_id] })
    }
  })
}

export function useUpdateCarrierService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'carrier_services'> & { id: string }) => {
      const { data, error } = await supabase
        .from('carrier_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['carrier-services', data.carrier_id] })
    }
  })
}

// ============================================================
// CARRIER ZONES
// ============================================================

export function useCarrierZones(carrierId: string) {
  return useQuery({
    queryKey: ['carrier-zones', carrierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carrier_zones')
        .select('*')
        .eq('carrier_id', carrierId)
        .order('name', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!carrierId
  })
}

export function useCreateCarrierZone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (zone: TablesInsert<'carrier_zones'>) => {
      const { data, error } = await supabase
        .from('carrier_zones')
        .insert(zone)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['carrier-zones', data.carrier_id] })
    }
  })
}

// ============================================================
// RATE CALCULATION
// ============================================================

export function useCalculateShippingRate() {
  return useMutation({
    mutationFn: async ({
      carrierId,
      serviceId,
      originPostalCode,
      destinationPostalCode,
      weight,
      volume,
      declaredValue
    }: {
      carrierId: string
      serviceId: string
      originPostalCode: string
      destinationPostalCode: string
      weight: number
      volume: number
      declaredValue?: number
    }) => {
      // Obtener servicio y zonas
      const { data: service } = await supabase
        .from('carrier_services')
        .select('*')
        .eq('id', serviceId)
        .single()

      if (!service) throw new Error('Servicio no encontrado')

      // Buscar zona destino
      const { data: zones } = await supabase
        .from('carrier_zones')
        .select('*')
        .eq('carrier_id', carrierId)
        .contains('postal_codes', [destinationPostalCode])

      const zone = zones?.[0]

      // Calcular tarifa base
      let rate = service.base_rate || 0

      // Agregar por peso
      if (service.rate_per_kg && weight) {
        rate += service.rate_per_kg * weight
      }

      // Agregar por volumen (peso volumétrico)
      if (service.rate_per_m3 && volume) {
        const volumetricWeight = volume * 200 // Factor volumétrico estándar
        if (volumetricWeight > weight) {
          rate += service.rate_per_kg * (volumetricWeight - weight)
        }
      }

      // Agregar recargo de zona si aplica
      if (zone?.surcharge_percentage) {
        rate *= (1 + zone.surcharge_percentage / 100)
      }

      // Agregar seguro si tiene valor declarado
      if (declaredValue && service.insurance_rate) {
        rate += declaredValue * (service.insurance_rate / 100)
      }

      // IVA
      const taxRate = 0.21 // 21% IVA Argentina
      const taxAmount = rate * taxRate
      const total = rate + taxAmount

      return {
        carrier_id: carrierId,
        service_id: serviceId,
        service_name: service.name,
        zone_name: zone?.name || 'General',
        base_rate: service.base_rate,
        weight_charge: service.rate_per_kg ? service.rate_per_kg * weight : 0,
        zone_surcharge: zone?.surcharge_percentage ? rate * (zone.surcharge_percentage / 100) : 0,
        insurance: declaredValue && service.insurance_rate ? declaredValue * (service.insurance_rate / 100) : 0,
        subtotal: rate,
        tax_amount: taxAmount,
        total: Math.round(total * 100) / 100,
        estimated_days: service.estimated_days,
        currency: 'ARS'
      }
    }
  })
}

// ============================================================
// CARRIER PERFORMANCE
// ============================================================

export function useCarrierPerformance(carrierId: string, dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: ['carrier-performance', carrierId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select(`
          id,
          status,
          created_at,
          actual_delivery_date,
          estimated_delivery_date,
          tracking_events:shipment_tracking_events(*)
        `)
        .eq('carrier_id', carrierId)

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from)
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to)
      }

      const { data: shipments, error } = await query

      if (error) throw error

      // Calcular métricas
      const total = shipments?.length || 0
      const delivered = shipments?.filter(s => s.status === 'delivered').length || 0
      const failed = shipments?.filter(s => s.status === 'failed').length || 0
      const inTransit = shipments?.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length || 0

      // Calcular entregas a tiempo
      const onTimeDeliveries = shipments?.filter(s => {
        if (s.status !== 'delivered' || !s.actual_delivery_date || !s.estimated_delivery_date) {
          return false
        }
        return new Date(s.actual_delivery_date) <= new Date(s.estimated_delivery_date)
      }).length || 0

      const onTimeRate = delivered > 0 ? (onTimeDeliveries / delivered) * 100 : 0

      // Calcular tiempo promedio de entrega
      const deliveryTimes = shipments
        ?.filter(s => s.status === 'delivered' && s.actual_delivery_date && s.created_at)
        .map(s => {
          const created = new Date(s.created_at)
          const delivered = new Date(s.actual_delivery_date!)
          return (delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) // días
        }) || []

      const avgDeliveryTime = deliveryTimes.length > 0
        ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
        : 0

      return {
        total_shipments: total,
        delivered,
        failed,
        in_transit: inTransit,
        delivery_rate: total > 0 ? (delivered / total) * 100 : 0,
        failure_rate: total > 0 ? (failed / total) * 100 : 0,
        on_time_rate: Math.round(onTimeRate * 10) / 10,
        avg_delivery_days: Math.round(avgDeliveryTime * 10) / 10
      }
    },
    enabled: !!carrierId
  })
}

// ============================================================
// HELPERS
// ============================================================

export const carrierTypeLabels: Record<Carrier['carrier_type'], string> = {
  own: 'Flota Propia',
  third_party: 'Tercerizado',
  mixed: 'Mixto'
}

export const carrierTypeColors: Record<Carrier['carrier_type'], string> = {
  own: 'bg-blue-100 text-blue-800',
  third_party: 'bg-purple-100 text-purple-800',
  mixed: 'bg-cyan-100 text-cyan-800'
}
