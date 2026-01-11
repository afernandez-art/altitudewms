'use client'

import { Header } from '@/components/layout/header'
import { PageWrapper, PageLoading, PageError } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle, StatCard } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { useDashboardStats, useDashboardAlerts, useRecentShipments, useTodayRoutes as useTodayRoutesDashboard } from '@/hooks/use-dashboard'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import {
  Package,
  Truck,
  Route,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: alerts } = useDashboardAlerts()
  const { data: recentShipments, isLoading: shipmentsLoading } = useRecentShipments(5)
  const { data: todayRoutes, isLoading: routesLoading } = useTodayRoutesDashboard()

  if (statsLoading) return <PageLoading />
  if (statsError) return <PageError error="Error al cargar el dashboard" />

  return (
    <>
      <Header title="Dashboard" subtitle="Resumen general del sistema" />
      <main className="p-6">
        <PageWrapper title="Dashboard" subtitle="Resumen de operaciones">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Envíos Pendientes"
              value={stats?.pendingShipments || 0}
              icon={<Package className="h-6 w-6" />}
              trend={stats?.shipmentsTrend ? {
                value: stats.shipmentsTrend,
                label: 'vs ayer',
                isPositive: stats.shipmentsTrend > 0
              } : undefined}
            />
            <StatCard
              title="En Tránsito"
              value={stats?.inTransitShipments || 0}
              icon={<Truck className="h-6 w-6" />}
            />
            <StatCard
              title="Rutas Hoy"
              value={stats?.todayRoutes || 0}
              icon={<Route className="h-6 w-6" />}
              description={`${stats?.completedRoutes || 0} completadas`}
            />
            <StatCard
              title="Tasa de Entrega"
              value={`${stats?.deliveryRate?.toFixed(1) || 0}%`}
              icon={<TrendingUp className="h-6 w-6" />}
              trend={stats?.deliveryRateTrend ? {
                value: stats.deliveryRateTrend,
                label: 'vs semana anterior',
                isPositive: stats.deliveryRateTrend > 0
              } : undefined}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Alertas */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts && alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.slice(0, 5).map((alert, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg"
                      >
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            {alert.title}
                          </p>
                          <p className="text-sm text-yellow-700">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay alertas activas
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Envíos Recientes */}
            <Card className="lg:col-span-2">
              <CardHeader
                action={
                  <Link
                    href="/shipments"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver todos
                  </Link>
                }
              >
                <CardTitle>Envíos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {shipmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                ) : recentShipments && recentShipments.length > 0 ? (
                  <div className="space-y-3">
                    {recentShipments.map((shipment: any) => (
                      <Link
                        key={shipment.id}
                        href={`/shipments/${shipment.id}`}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {shipment.shipment_number}
                            </p>
                            <p className="text-sm text-gray-500">
                              {shipment.customer?.name || 'Sin cliente'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={shipment.status} />
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(shipment.created_at)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay envíos recientes
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rutas de Hoy */}
          <Card className="mt-6">
            <CardHeader
              action={
                <Link
                  href="/routes/today"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver todas
                </Link>
              }
            >
              <CardTitle>Rutas de Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              {routesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : todayRoutes && todayRoutes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                          Ruta
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                          Conductor
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                          Vehículo
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                          Paradas
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                          Estado
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                          Progreso
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRoutes.map((route: any) => {
                        const progress = route.planned_stops > 0
                          ? ((route.completed_stops || 0) / route.planned_stops) * 100
                          : 0
                        return (
                          <tr
                            key={route.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4">
                              <Link
                                href={`/routes/${route.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                {route.route_number}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {route.driver?.name || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {route.vehicle?.plate || '-'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{route.completed_stops || 0}</span>
                                <span className="text-gray-400">/</span>
                                <span>{route.planned_stops || 0}</span>
                                {(route.failed_stops || 0) > 0 && (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-500 ml-2" />
                                    <span className="text-red-600">{route.failed_stops}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={route.status} />
                            </td>
                            <td className="py-3 px-4">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-blue-600 h-2.5 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay rutas programadas para hoy
                </p>
              )}
            </CardContent>
          </Card>
        </PageWrapper>
      </main>
    </>
  )
}
