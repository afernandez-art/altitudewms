'use client'

import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'

const supabase = getSupabaseClient()

export interface DashboardMetrics {
  // Envíos
  shipmentsToday: number
  shipmentsInTransit: number
  shipmentsDelivered: number
  shipmentsFailed: number
  shipmentsPending: number

  // Rutas
  routesToday: number
  routesInProgress: number
  routesCompleted: number

  // Flota
  vehiclesTotal: number
  vehiclesAvailable: number
  vehiclesInRoute: number
  vehiclesMaintenance: number

  // Conductores
  driversTotal: number
  driversAvailable: number
  driversInRoute: number

  // KPIs
  onTimeDeliveryRate: number
  successRate: number
  avgDeliveriesPerRoute: number

  // Alertas
  alerts: DashboardAlert[]
}

export interface DashboardAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  description: string
  entityType?: string
  entityId?: string
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const today = new Date().toISOString().split('T')[0]

      // Ejecutar todas las queries en paralelo
      const [
        shipmentsData,
        routesData,
        vehiclesData,
        driversData,
        deliveredTodayData,
        failedTodayData
      ] = await Promise.all([
        // Envíos por estado
        supabase.from('shipments').select('status'),
        // Rutas de hoy
        supabase.from('delivery_routes').select('status').eq('route_date', today),
        // Vehículos por estado
        supabase.from('vehicles').select('status'),
        // Conductores por estado
        supabase.from('drivers').select('status'),
        // Entregas de hoy
        supabase.from('shipments')
          .select('id')
          .eq('status', 'delivered')
          .gte('actual_delivery_date', `${today}T00:00:00`)
          .lte('actual_delivery_date', `${today}T23:59:59`),
        // Fallidos de hoy
        supabase.from('shipments')
          .select('id')
          .eq('status', 'failed_attempt')
          .gte('updated_at', `${today}T00:00:00`)
      ])

      const shipments = shipmentsData.data || []
      const routes = routesData.data || []
      const vehicles = vehiclesData.data || []
      const drivers = driversData.data || []

      // Calcular métricas de envíos
      const shipmentsInTransit = shipments.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length
      const shipmentsDelivered = deliveredTodayData.data?.length || 0
      const shipmentsFailed = failedTodayData.data?.length || 0
      const shipmentsPending = shipments.filter(s => ['draft', 'pending_pickup'].includes(s.status)).length

      // Calcular métricas de rutas
      const routesInProgress = routes.filter(r => r.status === 'in_progress').length
      const routesCompleted = routes.filter(r => r.status === 'completed').length

      // Calcular métricas de vehículos
      const vehiclesAvailable = vehicles.filter(v => v.status === 'available').length
      const vehiclesInRoute = vehicles.filter(v => v.status === 'in_route').length
      const vehiclesMaintenance = vehicles.filter(v => v.status === 'maintenance').length

      // Calcular métricas de conductores
      const driversAvailable = drivers.filter(d => d.status === 'available').length
      const driversInRoute = drivers.filter(d => d.status === 'in_route').length

      // Calcular KPIs
      const totalDeliveryAttempts = shipmentsDelivered + shipmentsFailed
      const successRate = totalDeliveryAttempts > 0
        ? Math.round((shipmentsDelivered / totalDeliveryAttempts) * 100)
        : 100

      // Generar alertas
      const alerts: DashboardAlert[] = []

      if (shipmentsFailed > 0) {
        alerts.push({
          id: 'failed-deliveries',
          type: 'error',
          title: `${shipmentsFailed} entregas fallidas hoy`,
          description: 'Revisar envíos con intentos fallidos'
        })
      }

      if (vehiclesAvailable === 0 && vehicles.length > 0) {
        alerts.push({
          id: 'no-vehicles',
          type: 'warning',
          title: 'Sin vehículos disponibles',
          description: 'Todos los vehículos están ocupados o en mantenimiento'
        })
      }

      if (driversAvailable === 0 && drivers.length > 0) {
        alerts.push({
          id: 'no-drivers',
          type: 'warning',
          title: 'Sin conductores disponibles',
          description: 'Todos los conductores están ocupados'
        })
      }

      if (shipmentsPending > 10) {
        alerts.push({
          id: 'pending-shipments',
          type: 'info',
          title: `${shipmentsPending} envíos pendientes`,
          description: 'Hay envíos esperando ser despachados'
        })
      }

      return {
        shipmentsToday: shipmentsDelivered + shipmentsInTransit,
        shipmentsInTransit,
        shipmentsDelivered,
        shipmentsFailed,
        shipmentsPending,
        routesToday: routes.length,
        routesInProgress,
        routesCompleted,
        vehiclesTotal: vehicles.length,
        vehiclesAvailable,
        vehiclesInRoute,
        vehiclesMaintenance,
        driversTotal: drivers.length,
        driversAvailable,
        driversInRoute,
        onTimeDeliveryRate: 95, // TODO: Calcular basado en promised_date
        successRate,
        avgDeliveriesPerRoute: routesCompleted > 0 ? Math.round(shipmentsDelivered / routesCompleted) : 0,
        alerts
      }
    },
    refetchInterval: 30000 // Refrescar cada 30 segundos
  })
}

export function useRecentShipments(limit = 5) {
  return useQuery({
    queryKey: ['recent-shipments', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          shipment_number,
          status,
          created_at,
          customer:customers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    }
  })
}

export function useRecentRoutes(limit = 5) {
  return useQuery({
    queryKey: ['recent-routes', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_routes')
        .select(`
          id,
          route_number,
          route_date,
          status,
          planned_stops,
          completed_stops,
          driver:drivers(name)
        `)
        .order('route_date', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    }
  })
}

// Métricas históricas para gráficos
export function useDeliveryStats(days = 7) {
  return useQuery({
    queryKey: ['delivery-stats', days],
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('shipments')
        .select('status, actual_delivery_date')
        .gte('actual_delivery_date', startDate.toISOString())
        .eq('status', 'delivered')

      if (error) throw error

      // Agrupar por día
      const byDay: Record<string, number> = {}
      data?.forEach(shipment => {
        if (shipment.actual_delivery_date) {
          const day = shipment.actual_delivery_date.split('T')[0]
          byDay[day] = (byDay[day] || 0) + 1
        }
      })

      // Generar array para los últimos N días
      const stats = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        stats.push({
          date: dateStr,
          delivered: byDay[dateStr] || 0
        })
      }

      return stats
    }
  })
}
