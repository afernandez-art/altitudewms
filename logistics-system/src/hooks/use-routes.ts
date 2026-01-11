'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { DeliveryRoute, RouteStop, RouteWithStops, TablesInsert, TablesUpdate } from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// QUERIES
// ============================================================

export function useRoutes(filters?: {
  status?: DeliveryRoute['status']
  date?: string
  vehicleId?: string
  driverId?: string
}) {
  return useQuery({
    queryKey: ['routes', filters],
    queryFn: async () => {
      let query = supabase
        .from('delivery_routes')
        .select(`
          *,
          vehicle:vehicles(id, plate, vehicle_type, max_weight, max_volume),
          driver:drivers(id, name, phone),
          warehouse:warehouses(id, code, name),
          stops:route_stops(*)
        `)
        .order('route_date', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.date) {
        query = query.eq('route_date', filters.date)
      }
      if (filters?.vehicleId) {
        query = query.eq('vehicle_id', filters.vehicleId)
      }
      if (filters?.driverId) {
        query = query.eq('driver_id', filters.driverId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as RouteWithStops[]
    }
  })
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: ['route', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_routes')
        .select(`
          *,
          vehicle:vehicles(id, plate, vehicle_type, max_weight, max_volume),
          driver:drivers(id, name, phone),
          warehouse:warehouses(id, code, name, address, latitude, longitude),
          stops:route_stops(
            *,
            shipment:shipments(id, shipment_number, customer_id)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Ordenar paradas por secuencia
      if (data.stops) {
        data.stops.sort((a: RouteStop, b: RouteStop) => a.sequence - b.sequence)
      }

      return data as RouteWithStops
    },
    enabled: !!id
  })
}

export function useTodayRoutes() {
  const today = new Date().toISOString().split('T')[0]
  return useRoutes({ date: today })
}

// ============================================================
// MUTATIONS
// ============================================================

export function useCreateRoute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (route: TablesInsert<'delivery_routes'>) => {
      // Generar número de ruta automático
      const { data: lastRoute } = await supabase
        .from('delivery_routes')
        .select('route_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastRoute?.route_number) {
        const match = lastRoute.route_number.match(/(\d+)$/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      const routeNumber = `RUTA-${new Date().getFullYear()}-${nextNumber.toString().padStart(5, '0')}`

      const { data, error } = await supabase
        .from('delivery_routes')
        .insert({
          ...route,
          route_number: routeNumber,
          status: route.status || 'draft'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
    }
  })
}

export function useUpdateRoute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'delivery_routes'> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_routes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['route', data.id] })
    }
  })
}

export function useAssignRouteResources() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      routeId,
      vehicleId,
      driverId
    }: {
      routeId: string
      vehicleId: string
      driverId: string
    }) => {
      // Actualizar ruta
      const { data: route, error: routeError } = await supabase
        .from('delivery_routes')
        .update({
          vehicle_id: vehicleId,
          driver_id: driverId,
          status: 'assigned'
        })
        .eq('id', routeId)
        .select()
        .single()

      if (routeError) throw routeError

      // Actualizar estado del vehículo
      await supabase
        .from('vehicles')
        .update({
          status: 'in_route',
          current_driver_id: driverId
        })
        .eq('id', vehicleId)

      // Actualizar estado del conductor
      await supabase
        .from('drivers')
        .update({
          status: 'in_route',
          current_vehicle_id: vehicleId,
          current_route_id: routeId
        })
        .eq('id', driverId)

      return route
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['route', data.id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    }
  })
}

export function useStartRoute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (routeId: string) => {
      const { data, error } = await supabase
        .from('delivery_routes')
        .update({
          status: 'in_progress',
          actual_start_time: new Date().toISOString()
        })
        .eq('id', routeId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['route', data.id] })
    }
  })
}

export function useCompleteRoute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (routeId: string) => {
      // Obtener datos de la ruta
      const { data: route } = await supabase
        .from('delivery_routes')
        .select('vehicle_id, driver_id')
        .eq('id', routeId)
        .single()

      // Actualizar ruta
      const { data, error } = await supabase
        .from('delivery_routes')
        .update({
          status: 'completed',
          actual_end_time: new Date().toISOString()
        })
        .eq('id', routeId)
        .select()
        .single()

      if (error) throw error

      // Liberar vehículo
      if (route?.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({
            status: 'available',
            current_driver_id: null
          })
          .eq('id', route.vehicle_id)
      }

      // Liberar conductor
      if (route?.driver_id) {
        await supabase
          .from('drivers')
          .update({
            status: 'available',
            current_vehicle_id: null,
            current_route_id: null
          })
          .eq('id', route.driver_id)
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['route', data.id] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    }
  })
}

export function useDeleteRoute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_routes')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
    }
  })
}

// ============================================================
// ROUTE STOPS MUTATIONS
// ============================================================

export function useAddStopToRoute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (stop: TablesInsert<'route_stops'>) => {
      // Obtener última secuencia
      const { data: lastStop } = await supabase
        .from('route_stops')
        .select('sequence')
        .eq('route_id', stop.route_id)
        .order('sequence', { ascending: false })
        .limit(1)
        .single()

      const sequence = (lastStop?.sequence || 0) + 1

      const { data, error } = await supabase
        .from('route_stops')
        .insert({
          ...stop,
          sequence
        })
        .select()
        .single()

      if (error) throw error

      // Actualizar métricas de la ruta
      await updateRouteMetrics(stop.route_id)

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['route', data.route_id] })
    }
  })
}

export function useUpdateStopStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      stopId,
      status,
      failureReason,
      failureNotes,
      signatureUrl,
      photoUrl,
      podNotes
    }: {
      stopId: string
      status: RouteStop['status']
      failureReason?: RouteStop['failure_reason']
      failureNotes?: string
      signatureUrl?: string
      photoUrl?: string
      podNotes?: string
    }) => {
      const updates: any = {
        status,
        ...(status === 'completed' || status === 'failed' || status === 'partial'
          ? { actual_departure: new Date().toISOString() }
          : {}),
        ...(status === 'in_progress' ? { actual_arrival: new Date().toISOString() } : {}),
        ...(failureReason ? { failure_reason: failureReason } : {}),
        ...(failureNotes ? { failure_notes: failureNotes } : {}),
        ...(signatureUrl ? { signature_url: signatureUrl } : {}),
        ...(photoUrl ? { photo_url: photoUrl } : {}),
        ...(podNotes ? { pod_notes: podNotes } : {})
      }

      const { data, error } = await supabase
        .from('route_stops')
        .update(updates)
        .eq('id', stopId)
        .select('*, route_id')
        .single()

      if (error) throw error

      // Actualizar envío asociado si se completó
      if (status === 'completed' && data.shipment_id) {
        await supabase
          .from('shipments')
          .update({ status: 'delivered', actual_delivery_date: new Date().toISOString() })
          .eq('id', data.shipment_id)
      } else if (status === 'failed' && data.shipment_id) {
        await supabase
          .from('shipments')
          .update({ status: 'failed_attempt' })
          .eq('id', data.shipment_id)
      }

      // Actualizar contadores de la ruta
      await updateRouteMetrics(data.route_id)

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      queryClient.invalidateQueries({ queryKey: ['route', data.route_id] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    }
  })
}

export function useReorderStops() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ routeId, stopIds }: { routeId: string; stopIds: string[] }) => {
      // Actualizar secuencia de cada parada
      const updates = stopIds.map((id, index) =>
        supabase
          .from('route_stops')
          .update({ sequence: index + 1 })
          .eq('id', id)
      )

      await Promise.all(updates)

      return { routeId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['route', data.routeId] })
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

async function updateRouteMetrics(routeId: string) {
  const { data: stops } = await supabase
    .from('route_stops')
    .select('*')
    .eq('route_id', routeId)

  if (!stops) return

  const metrics = {
    planned_stops: stops.length,
    planned_packages: stops.reduce((sum, s) => sum + (s.packages || 0), 0),
    planned_weight: stops.reduce((sum, s) => sum + (s.weight || 0), 0),
    planned_volume: stops.reduce((sum, s) => sum + (s.volume || 0), 0),
    completed_stops: stops.filter(s => s.status === 'completed').length,
    failed_stops: stops.filter(s => s.status === 'failed').length
  }

  await supabase
    .from('delivery_routes')
    .update(metrics)
    .eq('id', routeId)
}

export const routeStatusLabels: Record<DeliveryRoute['status'], string> = {
  draft: 'Borrador',
  planned: 'Planificada',
  assigned: 'Asignada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada'
}

export const routeStatusColors: Record<DeliveryRoute['status'], string> = {
  draft: 'bg-gray-100 text-gray-800',
  planned: 'bg-blue-100 text-blue-800',
  assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export const stopStatusLabels: Record<RouteStop['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  completed: 'Completada',
  partial: 'Parcial',
  failed: 'Fallida',
  skipped: 'Salteada'
}
