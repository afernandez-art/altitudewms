'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageWrapper, PageLoading, PageError, EmptyState } from '@/components/layout/main-layout'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { SlideOver, ConfirmDialog } from '@/components/ui/dialog'
import { Input, Select, DateInput } from '@/components/ui/form-fields'
import { Card, CardContent } from '@/components/ui/card'
import {
  useRoutes,
  useCreateRoute,
  useDeleteRoute,
  routeStatusLabels
} from '@/hooks/use-routes'
import { useAvailableVehicles, useAvailableDrivers } from '@/hooks/use-vehicles'
import { useActiveWarehouses } from '@/hooks/use-warehouses'
import { formatDate, formatDistance } from '@/lib/utils'
import { Plus, Route, Map, Calendar, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'

export default function RoutesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deletingRoute, setDeletingRoute] = useState<any>(null)
  const [filters, setFilters] = useState<{
    status?: string
    date?: string
  }>({})

  const { data: routes, isLoading, error, refetch } = useRoutes(filters as any)
  const { data: vehicles } = useAvailableVehicles()
  const { data: drivers } = useAvailableDrivers()
  const { data: warehouses } = useActiveWarehouses()
  const createRoute = useCreateRoute()
  const deleteRoute = useDeleteRoute()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'route_number',
      header: 'N° Ruta',
      cell: ({ row }) => (
        <Link
          href={`/routes/${row.original.id}`}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {row.getValue('route_number')}
        </Link>
      )
    },
    {
      accessorKey: 'route_date',
      header: 'Fecha',
      cell: ({ row }) => formatDate(row.getValue('route_date'))
    },
    {
      accessorKey: 'warehouse',
      header: 'Almacén',
      cell: ({ row }) => row.original.warehouse?.name || '-'
    },
    {
      accessorKey: 'vehicle',
      header: 'Vehículo',
      cell: ({ row }) => row.original.vehicle?.plate || '-'
    },
    {
      accessorKey: 'driver',
      header: 'Conductor',
      cell: ({ row }) => row.original.driver?.name || '-'
    },
    {
      accessorKey: 'stops',
      header: 'Paradas',
      cell: ({ row }) => {
        const stops = row.original.stops || []
        const completed = stops.filter((s: any) => s.status === 'completed').length
        const failed = stops.filter((s: any) => s.status === 'failed').length
        return (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{completed}</span>
            <span className="text-gray-400">/</span>
            <span>{stops.length}</span>
            {failed > 0 && (
              <>
                <XCircle className="h-4 w-4 text-red-500 ml-2" />
                <span className="text-red-600">{failed}</span>
              </>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />
    },
    {
      accessorKey: 'planned_distance',
      header: 'Distancia',
      cell: ({ row }) => formatDistance(row.getValue('planned_distance'))
    }
  ]

  const handleCreateRoute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      await createRoute.mutateAsync({
        warehouse_id: formData.get('warehouse_id') as string,
        route_date: formData.get('route_date') as string,
        vehicle_id: formData.get('vehicle_id') as string || undefined,
        driver_id: formData.get('driver_id') as string || undefined,
        planned_start_time: formData.get('planned_start_time') as string || undefined,
        notes: formData.get('notes') as string || undefined
      })
      toast.success('Ruta creada exitosamente')
      setShowCreateForm(false)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la ruta')
    }
  }

  const handleDeleteRoute = async () => {
    try {
      await deleteRoute.mutateAsync(deletingRoute.id)
      toast.success('Ruta eliminada exitosamente')
      setDeletingRoute(null)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la ruta')
    }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError error="Error al cargar las rutas" retry={refetch} />

  return (
    <>
      <Header title="Rutas" subtitle="Gestión de rutas de entrega" />
      <main className="p-6">
        <PageWrapper
          title="Rutas"
          subtitle={`${routes?.length || 0} rutas`}
          actions={
            <>
              <Link href="/routes/today">
                <Button variant="outline" leftIcon={<Calendar className="h-4 w-4" />}>
                  Rutas de Hoy
                </Button>
              </Link>
              <Link href="/routes/planning">
                <Button variant="outline" leftIcon={<Map className="h-4 w-4" />}>
                  Planificación
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCreateForm(true)}
              >
                Nueva Ruta
              </Button>
            </>
          }
        >
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  label="Estado"
                  name="status"
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                  options={[
                    { value: '', label: 'Todos' },
                    ...Object.entries(routeStatusLabels).map(([value, label]) => ({
                      value,
                      label
                    }))
                  ]}
                />
                <DateInput
                  label="Fecha"
                  name="date"
                  value={filters.date || ''}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value || undefined })}
                />
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    onClick={() => setFilters({})}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {routes && routes.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={routes}
                  searchKey="route_number"
                  searchPlaceholder="Buscar por número de ruta..."
                  onRowClick={(row) => window.location.href = `/routes/${row.id}`}
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Route className="h-8 w-8 text-gray-400" />}
              title="No hay rutas"
              description="Crea tu primera ruta para comenzar a planificar entregas."
              action={
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowCreateForm(true)}
                >
                  Crear Ruta
                </Button>
              }
            />
          )}
        </PageWrapper>

        {/* Create Form */}
        <SlideOver
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Nueva Ruta"
          description="Configura una nueva ruta de entrega"
          size="md"
        >
          <form onSubmit={handleCreateRoute} className="space-y-6">
            <div className="space-y-4">
              <Select
                label="Almacén de Origen"
                name="warehouse_id"
                required
                placeholder="Seleccionar almacén"
                options={warehouses?.map(w => ({
                  value: w.id,
                  label: `${w.code} - ${w.name}`
                })) || []}
              />

              <DateInput
                label="Fecha de Ruta"
                name="route_date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />

              <Input
                label="Hora de Inicio Planificada"
                name="planned_start_time"
                type="time"
                defaultValue="08:00"
              />

              <Select
                label="Vehículo (opcional)"
                name="vehicle_id"
                placeholder="Seleccionar vehículo"
                options={vehicles?.map(v => ({
                  value: v.id,
                  label: `${v.plate} - ${v.brand} ${v.model}`
                })) || []}
                helperText="Puedes asignar el vehículo más tarde"
              />

              <Select
                label="Conductor (opcional)"
                name="driver_id"
                placeholder="Seleccionar conductor"
                options={drivers?.map(d => ({
                  value: d.id,
                  label: d.name
                })) || []}
                helperText="Puedes asignar el conductor más tarde"
              />

              <Input
                label="Notas"
                name="notes"
                placeholder="Instrucciones especiales..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={createRoute.isPending}
              >
                Crear Ruta
              </Button>
            </div>
          </form>
        </SlideOver>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingRoute}
          onClose={() => setDeletingRoute(null)}
          onConfirm={handleDeleteRoute}
          title="Eliminar Ruta"
          description={`¿Estás seguro de que deseas eliminar la ruta "${deletingRoute?.route_number}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={deleteRoute.isPending}
        />
      </main>
    </>
  )
}
