'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageWrapper, PageLoading, PageError, EmptyState } from '@/components/layout/main-layout'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { SlideOver } from '@/components/ui/dialog'
import { Input, Select, Textarea, DateInput } from '@/components/ui/form-fields'
import { Card, CardContent } from '@/components/ui/card'
import { useShipments, useCreateShipment, shipmentStatusLabels } from '@/hooks/use-shipments'
import { useActiveCustomers } from '@/hooks/use-customers'
import { useActiveWarehouses } from '@/hooks/use-warehouses'
import { useActiveCarriers } from '@/hooks/use-carriers'
import { formatDate, formatWeight, formatCurrency } from '@/lib/utils'
import { Plus, Package, Filter, Download } from 'lucide-react'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'

export default function ShipmentsPage() {
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filters, setFilters] = useState<{
    status?: string
    dateFrom?: string
    dateTo?: string
  }>({})

  const { data: shipments, isLoading, error, refetch } = useShipments(filters as any)
  const { data: customers } = useActiveCustomers()
  const { data: warehouses } = useActiveWarehouses()
  const { data: carriers } = useActiveCarriers()
  const createShipment = useCreateShipment()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'shipment_number',
      header: 'N° Envío',
      cell: ({ row }) => (
        <Link
          href={`/shipments/${row.original.id}`}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {row.getValue('shipment_number')}
        </Link>
      )
    },
    {
      accessorKey: 'customer',
      header: 'Cliente',
      cell: ({ row }) => row.original.customer?.name || '-'
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />
    },
    {
      accessorKey: 'delivery_address',
      header: 'Destino',
      cell: ({ row }) => {
        const address = row.original.delivery_address
        return address?.city || address?.street || '-'
      }
    },
    {
      accessorKey: 'total_packages',
      header: 'Bultos',
      cell: ({ row }) => row.getValue('total_packages') || 0
    },
    {
      accessorKey: 'total_weight',
      header: 'Peso',
      cell: ({ row }) => formatWeight(row.getValue('total_weight'))
    },
    {
      accessorKey: 'estimated_delivery_date',
      header: 'Entrega Est.',
      cell: ({ row }) => formatDate(row.getValue('estimated_delivery_date'))
    },
    {
      accessorKey: 'created_at',
      header: 'Creado',
      cell: ({ row }) => formatDate(row.getValue('created_at'))
    }
  ]

  const handleCreateShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      await createShipment.mutateAsync({
        customer_id: formData.get('customer_id') as string,
        origin_warehouse_id: formData.get('origin_warehouse_id') as string,
        carrier_id: formData.get('carrier_id') as string || undefined,
        service_type: formData.get('service_type') as string || 'standard',
        total_packages: parseInt(formData.get('total_packages') as string) || 1,
        total_weight: parseFloat(formData.get('total_weight') as string) || 0,
        total_volume: parseFloat(formData.get('total_volume') as string) || 0,
        declared_value: parseFloat(formData.get('declared_value') as string) || 0,
        delivery_address: {
          street: formData.get('delivery_street') as string,
          city: formData.get('delivery_city') as string,
          state: formData.get('delivery_state') as string,
          postal_code: formData.get('delivery_postal_code') as string,
          country: 'Argentina'
        },
        notes: formData.get('notes') as string || undefined
      })
      toast.success('Envío creado exitosamente')
      setShowCreateForm(false)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el envío')
    }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError error="Error al cargar los envíos" retry={refetch} />

  return (
    <>
      <Header title="Envíos" subtitle="Gestión de envíos y seguimiento" />
      <main className="p-6">
        <PageWrapper
          title="Envíos"
          subtitle={`${shipments?.length || 0} envíos en total`}
          actions={
            <>
              <Button
                variant="outline"
                leftIcon={<Filter className="h-4 w-4" />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filtros
              </Button>
              <Button
                variant="outline"
                leftIcon={<Download className="h-4 w-4" />}
              >
                Exportar
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCreateForm(true)}
              >
                Nuevo Envío
              </Button>
            </>
          }
        >
          {/* Filters */}
          {showFilters && (
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
                      ...Object.entries(shipmentStatusLabels).map(([value, label]) => ({
                        value,
                        label
                      }))
                    ]}
                  />
                  <DateInput
                    label="Desde"
                    name="dateFrom"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                  />
                  <DateInput
                    label="Hasta"
                    name="dateTo"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
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
          )}

          {/* Table */}
          {shipments && shipments.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={shipments}
                  searchKey="shipment_number"
                  searchPlaceholder="Buscar por número de envío..."
                  onRowClick={(row) => window.location.href = `/shipments/${row.id}`}
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Package className="h-8 w-8 text-gray-400" />}
              title="No hay envíos"
              description="Crea tu primer envío para comenzar a gestionar las entregas."
              action={
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowCreateForm(true)}
                >
                  Crear Envío
                </Button>
              }
            />
          )}
        </PageWrapper>

        {/* Create Form SlideOver */}
        <SlideOver
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Nuevo Envío"
          description="Completa los datos para crear un nuevo envío"
          size="lg"
        >
          <form onSubmit={handleCreateShipment} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Información General</h3>

              <Select
                label="Cliente"
                name="customer_id"
                required
                placeholder="Seleccionar cliente"
                options={customers?.map(c => ({
                  value: c.id,
                  label: `${c.code} - ${c.name}`
                })) || []}
              />

              <Select
                label="Almacén Origen"
                name="origin_warehouse_id"
                required
                placeholder="Seleccionar almacén"
                options={warehouses?.map(w => ({
                  value: w.id,
                  label: `${w.code} - ${w.name}`
                })) || []}
              />

              <Select
                label="Transportista"
                name="carrier_id"
                placeholder="Seleccionar transportista (opcional)"
                options={carriers?.map(c => ({
                  value: c.id,
                  label: c.name
                })) || []}
              />

              <Select
                label="Tipo de Servicio"
                name="service_type"
                options={[
                  { value: 'standard', label: 'Estándar' },
                  { value: 'express', label: 'Express' },
                  { value: 'same_day', label: 'Mismo día' },
                  { value: 'scheduled', label: 'Programado' }
                ]}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Dirección de Entrega</h3>

              <Input
                label="Calle y Número"
                name="delivery_street"
                required
                placeholder="Av. Corrientes 1234"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ciudad"
                  name="delivery_city"
                  required
                  placeholder="Buenos Aires"
                />
                <Input
                  label="Provincia"
                  name="delivery_state"
                  required
                  placeholder="CABA"
                />
              </div>

              <Input
                label="Código Postal"
                name="delivery_postal_code"
                required
                placeholder="1000"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Detalles del Envío</h3>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Cantidad de Bultos"
                  name="total_packages"
                  type="number"
                  min={1}
                  defaultValue={1}
                />
                <Input
                  label="Peso Total (kg)"
                  name="total_weight"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Volumen (m³)"
                  name="total_volume"
                  type="number"
                  step="0.001"
                  min={0}
                  placeholder="0.000"
                />
                <Input
                  label="Valor Declarado ($)"
                  name="declared_value"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                />
              </div>

              <Textarea
                label="Notas"
                name="notes"
                placeholder="Instrucciones especiales de entrega..."
                rows={3}
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
                isLoading={createShipment.isPending}
              >
                Crear Envío
              </Button>
            </div>
          </form>
        </SlideOver>
      </main>
    </>
  )
}
