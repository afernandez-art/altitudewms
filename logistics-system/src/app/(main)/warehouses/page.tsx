'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageWrapper, PageLoading, PageError, EmptyState } from '@/components/layout/main-layout'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge, ActiveBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { SlideOver, ConfirmDialog } from '@/components/ui/dialog'
import { Input, Select, Textarea } from '@/components/ui/form-fields'
import { Card, CardContent, StatCard } from '@/components/ui/card'
import {
  useWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
  warehouseTypeLabels
} from '@/hooks/use-warehouses'
import { formatNumber } from '@/lib/utils'
import { Plus, Warehouse, Edit, Trash2, MapPin, Layers, Box } from 'lucide-react'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'

export default function WarehousesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null)
  const [deletingWarehouse, setDeletingWarehouse] = useState<any>(null)

  const { data: warehouses, isLoading, error, refetch } = useWarehouses()
  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()
  const deleteWarehouse = useDeleteWarehouse()

  // Calculate summary stats
  const totalWarehouses = warehouses?.length || 0
  const activeWarehouses = warehouses?.filter(w => w.is_active).length || 0
  const totalZones = warehouses?.reduce((sum, w) => sum + (w.zones?.length || 0), 0) || 0

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => (
        <Link
          href={`/warehouses/${row.original.id}`}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {row.getValue('code')}
        </Link>
      )
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.getValue('name')}</p>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {row.original.address?.city || row.original.address?.state || '-'}
          </p>
        </div>
      )
    },
    {
      accessorKey: 'warehouse_type',
      header: 'Tipo',
      cell: ({ row }) => warehouseTypeLabels[row.getValue('warehouse_type') as string] || row.getValue('warehouse_type')
    },
    {
      accessorKey: 'zones',
      header: 'Zonas',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Layers className="h-4 w-4 text-gray-400" />
          <span>{row.original.zones?.length || 0}</span>
        </div>
      )
    },
    {
      accessorKey: 'total_area',
      header: 'Área',
      cell: ({ row }) => row.original.total_area ? `${formatNumber(row.original.total_area)} m²` : '-'
    },
    {
      accessorKey: 'is_active',
      header: 'Estado',
      cell: ({ row }) => <ActiveBadge isActive={row.getValue('is_active')} />
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setEditingWarehouse(row.original)
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingWarehouse(row.original)
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ]

  const handleCreateWarehouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      await createWarehouse.mutateAsync({
        code: formData.get('code') as string,
        name: formData.get('name') as string,
        warehouse_type: formData.get('warehouse_type') as any,
        address: {
          street: formData.get('street') as string,
          city: formData.get('city') as string,
          state: formData.get('state') as string,
          postal_code: formData.get('postal_code') as string,
          country: 'Argentina'
        },
        total_area: parseFloat(formData.get('total_area') as string) || undefined,
        contact_name: formData.get('contact_name') as string || undefined,
        contact_phone: formData.get('contact_phone') as string || undefined,
        is_active: true
      })
      toast.success('Almacén creado exitosamente')
      setShowCreateForm(false)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el almacén')
    }
  }

  const handleUpdateWarehouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      await updateWarehouse.mutateAsync({
        id: editingWarehouse.id,
        name: formData.get('name') as string,
        warehouse_type: formData.get('warehouse_type') as any,
        total_area: parseFloat(formData.get('total_area') as string) || undefined,
        contact_name: formData.get('contact_name') as string || undefined,
        contact_phone: formData.get('contact_phone') as string || undefined,
        is_active: formData.get('is_active') === 'on'
      })
      toast.success('Almacén actualizado exitosamente')
      setEditingWarehouse(null)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el almacén')
    }
  }

  const handleDeleteWarehouse = async () => {
    try {
      await deleteWarehouse.mutateAsync(deletingWarehouse.id)
      toast.success('Almacén eliminado exitosamente')
      setDeletingWarehouse(null)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el almacén')
    }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError error="Error al cargar los almacenes" retry={refetch} />

  const WarehouseForm = ({ warehouse, onSubmit, isLoading }: any) => (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Información General</h3>

        {!warehouse && (
          <Input
            label="Código"
            name="code"
            required
            placeholder="ALM-001"
            helperText="Código único del almacén"
          />
        )}

        <Input
          label="Nombre"
          name="name"
          required
          defaultValue={warehouse?.name}
          placeholder="Almacén Central"
        />

        <Select
          label="Tipo de Almacén"
          name="warehouse_type"
          required
          defaultValue={warehouse?.warehouse_type || 'main'}
          options={Object.entries(warehouseTypeLabels).map(([value, label]) => ({
            value,
            label
          }))}
        />

        <Input
          label="Área Total (m²)"
          name="total_area"
          type="number"
          defaultValue={warehouse?.total_area}
          placeholder="5000"
        />
      </div>

      {!warehouse && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Dirección</h3>

          <Input
            label="Calle y Número"
            name="street"
            required
            placeholder="Av. Industrial 1234"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ciudad"
              name="city"
              required
              placeholder="Buenos Aires"
            />
            <Input
              label="Provincia"
              name="state"
              required
              placeholder="Buenos Aires"
            />
          </div>

          <Input
            label="Código Postal"
            name="postal_code"
            required
            placeholder="1000"
          />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Contacto</h3>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre Contacto"
            name="contact_name"
            defaultValue={warehouse?.contact_name}
            placeholder="Juan Pérez"
          />
          <Input
            label="Teléfono"
            name="contact_phone"
            defaultValue={warehouse?.contact_phone}
            placeholder="+54 11 1234-5678"
          />
        </div>

        {warehouse && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              defaultChecked={warehouse?.is_active}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Almacén activo
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => warehouse ? setEditingWarehouse(null) : setShowCreateForm(false)}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
        >
          {warehouse ? 'Guardar Cambios' : 'Crear Almacén'}
        </Button>
      </div>
    </form>
  )

  return (
    <>
      <Header title="Almacenes" subtitle="Gestión de almacenes y ubicaciones" />
      <main className="p-6">
        <PageWrapper
          title="Almacenes"
          subtitle={`${totalWarehouses} almacenes registrados`}
          actions={
            <>
              <Link href="/inventory">
                <Button variant="outline" leftIcon={<Box className="h-4 w-4" />}>
                  Ver Inventario
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCreateForm(true)}
              >
                Nuevo Almacén
              </Button>
            </>
          }
        >
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard
              title="Total Almacenes"
              value={totalWarehouses}
              icon={<Warehouse className="h-6 w-6" />}
            />
            <StatCard
              title="Almacenes Activos"
              value={activeWarehouses}
              icon={<Warehouse className="h-6 w-6" />}
            />
            <StatCard
              title="Total Zonas"
              value={totalZones}
              icon={<Layers className="h-6 w-6" />}
            />
          </div>

          {warehouses && warehouses.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={warehouses}
                  searchKey="name"
                  searchPlaceholder="Buscar por nombre..."
                  onRowClick={(row) => window.location.href = `/warehouses/${row.id}`}
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Warehouse className="h-8 w-8 text-gray-400" />}
              title="No hay almacenes"
              description="Crea tu primer almacén para comenzar a gestionar inventario."
              action={
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowCreateForm(true)}
                >
                  Crear Almacén
                </Button>
              }
            />
          )}
        </PageWrapper>

        {/* Create Form */}
        <SlideOver
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Nuevo Almacén"
          size="md"
        >
          <WarehouseForm
            onSubmit={handleCreateWarehouse}
            isLoading={createWarehouse.isPending}
          />
        </SlideOver>

        {/* Edit Form */}
        <SlideOver
          open={!!editingWarehouse}
          onClose={() => setEditingWarehouse(null)}
          title="Editar Almacén"
          size="md"
        >
          <WarehouseForm
            warehouse={editingWarehouse}
            onSubmit={handleUpdateWarehouse}
            isLoading={updateWarehouse.isPending}
          />
        </SlideOver>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingWarehouse}
          onClose={() => setDeletingWarehouse(null)}
          onConfirm={handleDeleteWarehouse}
          title="Eliminar Almacén"
          description={`¿Estás seguro de que deseas eliminar el almacén "${deletingWarehouse?.name}"? Esta acción no se puede deshacer y eliminará todas las zonas y ubicaciones asociadas.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={deleteWarehouse.isPending}
        />
      </main>
    </>
  )
}
