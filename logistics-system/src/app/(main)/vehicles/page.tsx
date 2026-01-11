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
  useVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  vehicleTypeLabels,
  vehicleStatusLabels
} from '@/hooks/use-vehicles'
import { formatDate, formatWeight, formatVolume } from '@/lib/utils'
import { Plus, Truck, Edit, Trash2, Wrench } from 'lucide-react'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'

export default function VehiclesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<any>(null)

  const { data: vehicles, isLoading, error, refetch } = useVehicles()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const deleteVehicle = useDeleteVehicle()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'plate',
      header: 'Patente',
      cell: ({ row }) => (
        <Link
          href={`/vehicles/${row.original.id}`}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {row.getValue('plate')}
        </Link>
      )
    },
    {
      accessorKey: 'vehicle_type',
      header: 'Tipo',
      cell: ({ row }) => vehicleTypeLabels[row.getValue('vehicle_type') as string] || row.getValue('vehicle_type')
    },
    {
      accessorKey: 'brand',
      header: 'Marca/Modelo',
      cell: ({ row }) => (
        <div>
          <p className="text-gray-900">{row.original.brand}</p>
          <p className="text-sm text-gray-500">{row.original.model} {row.original.year}</p>
        </div>
      )
    },
    {
      accessorKey: 'max_weight',
      header: 'Capacidad',
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{formatWeight(row.getValue('max_weight'))}</p>
          <p className="text-gray-500">{formatVolume(row.original.max_volume)}</p>
        </div>
      )
    },
    {
      accessorKey: 'current_driver',
      header: 'Conductor Actual',
      cell: ({ row }) => row.original.current_driver?.name || '-'
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />
    },
    {
      accessorKey: 'next_maintenance_date',
      header: 'Próx. Mantenimiento',
      cell: ({ row }) => {
        const date = row.getValue('next_maintenance_date') as string
        if (!date) return '-'
        const isOverdue = new Date(date) < new Date()
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {formatDate(date)}
            {isOverdue && <Wrench className="inline h-4 w-4 ml-1" />}
          </span>
        )
      }
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
              setEditingVehicle(row.original)
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingVehicle(row.original)
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ]

  const handleCreateVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      await createVehicle.mutateAsync({
        plate: formData.get('plate') as string,
        vehicle_type: formData.get('vehicle_type') as any,
        brand: formData.get('brand') as string,
        model: formData.get('model') as string,
        year: parseInt(formData.get('year') as string) || undefined,
        max_weight: parseFloat(formData.get('max_weight') as string) || 0,
        max_volume: parseFloat(formData.get('max_volume') as string) || 0,
        max_pallets: parseInt(formData.get('max_pallets') as string) || undefined,
        cargo_length: parseFloat(formData.get('cargo_length') as string) || undefined,
        cargo_width: parseFloat(formData.get('cargo_width') as string) || undefined,
        cargo_height: parseFloat(formData.get('cargo_height') as string) || undefined,
        next_maintenance_date: formData.get('next_maintenance_date') as string || undefined
      })
      toast.success('Vehículo creado exitosamente')
      setShowCreateForm(false)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el vehículo')
    }
  }

  const handleUpdateVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      await updateVehicle.mutateAsync({
        id: editingVehicle.id,
        plate: formData.get('plate') as string,
        vehicle_type: formData.get('vehicle_type') as any,
        brand: formData.get('brand') as string,
        model: formData.get('model') as string,
        year: parseInt(formData.get('year') as string) || undefined,
        max_weight: parseFloat(formData.get('max_weight') as string) || 0,
        max_volume: parseFloat(formData.get('max_volume') as string) || 0,
        max_pallets: parseInt(formData.get('max_pallets') as string) || undefined,
        status: formData.get('status') as any,
        next_maintenance_date: formData.get('next_maintenance_date') as string || undefined
      })
      toast.success('Vehículo actualizado exitosamente')
      setEditingVehicle(null)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el vehículo')
    }
  }

  const handleDeleteVehicle = async () => {
    try {
      await deleteVehicle.mutateAsync(deletingVehicle.id)
      toast.success('Vehículo eliminado exitosamente')
      setDeletingVehicle(null)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el vehículo')
    }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError error="Error al cargar los vehículos" retry={refetch} />

  const VehicleForm = ({ vehicle, onSubmit, isLoading }: any) => (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Información del Vehículo</h3>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Patente"
            name="plate"
            required
            defaultValue={vehicle?.plate}
            placeholder="AB 123 CD"
          />
          <Select
            label="Tipo de Vehículo"
            name="vehicle_type"
            required
            defaultValue={vehicle?.vehicle_type || 'truck'}
            options={Object.entries(vehicleTypeLabels).map(([value, label]) => ({
              value,
              label
            }))}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Marca"
            name="brand"
            defaultValue={vehicle?.brand}
            placeholder="Mercedes-Benz"
          />
          <Input
            label="Modelo"
            name="model"
            defaultValue={vehicle?.model}
            placeholder="Sprinter"
          />
          <Input
            label="Año"
            name="year"
            type="number"
            min={1990}
            max={new Date().getFullYear() + 1}
            defaultValue={vehicle?.year}
          />
        </div>

        {vehicle && (
          <Select
            label="Estado"
            name="status"
            defaultValue={vehicle?.status}
            options={Object.entries(vehicleStatusLabels).map(([value, label]) => ({
              value,
              label
            }))}
          />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Capacidad de Carga</h3>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Peso Máx. (kg)"
            name="max_weight"
            type="number"
            step="0.01"
            required
            defaultValue={vehicle?.max_weight}
            placeholder="1500"
          />
          <Input
            label="Volumen Máx. (m³)"
            name="max_volume"
            type="number"
            step="0.001"
            required
            defaultValue={vehicle?.max_volume}
            placeholder="15"
          />
          <Input
            label="Máx. Pallets"
            name="max_pallets"
            type="number"
            defaultValue={vehicle?.max_pallets}
            placeholder="12"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Largo (m)"
            name="cargo_length"
            type="number"
            step="0.01"
            defaultValue={vehicle?.cargo_length}
            placeholder="4.50"
          />
          <Input
            label="Ancho (m)"
            name="cargo_width"
            type="number"
            step="0.01"
            defaultValue={vehicle?.cargo_width}
            placeholder="2.20"
          />
          <Input
            label="Alto (m)"
            name="cargo_height"
            type="number"
            step="0.01"
            defaultValue={vehicle?.cargo_height}
            placeholder="2.10"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Mantenimiento</h3>

        <DateInput
          label="Próximo Mantenimiento"
          name="next_maintenance_date"
          defaultValue={vehicle?.next_maintenance_date?.split('T')[0]}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => vehicle ? setEditingVehicle(null) : setShowCreateForm(false)}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
        >
          {vehicle ? 'Guardar Cambios' : 'Crear Vehículo'}
        </Button>
      </div>
    </form>
  )

  return (
    <>
      <Header title="Vehículos" subtitle="Gestión de flota de vehículos" />
      <main className="p-6">
        <PageWrapper
          title="Vehículos"
          subtitle={`${vehicles?.length || 0} vehículos registrados`}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowCreateForm(true)}
            >
              Nuevo Vehículo
            </Button>
          }
        >
          {vehicles && vehicles.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={vehicles}
                  searchKey="plate"
                  searchPlaceholder="Buscar por patente..."
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Truck className="h-8 w-8 text-gray-400" />}
              title="No hay vehículos"
              description="Agrega tu primer vehículo para comenzar."
              action={
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowCreateForm(true)}
                >
                  Agregar Vehículo
                </Button>
              }
            />
          )}
        </PageWrapper>

        {/* Create Form */}
        <SlideOver
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Nuevo Vehículo"
          size="lg"
        >
          <VehicleForm
            onSubmit={handleCreateVehicle}
            isLoading={createVehicle.isPending}
          />
        </SlideOver>

        {/* Edit Form */}
        <SlideOver
          open={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          title="Editar Vehículo"
          size="lg"
        >
          <VehicleForm
            vehicle={editingVehicle}
            onSubmit={handleUpdateVehicle}
            isLoading={updateVehicle.isPending}
          />
        </SlideOver>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingVehicle}
          onClose={() => setDeletingVehicle(null)}
          onConfirm={handleDeleteVehicle}
          title="Eliminar Vehículo"
          description={`¿Estás seguro de que deseas eliminar el vehículo "${deletingVehicle?.plate}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={deleteVehicle.isPending}
        />
      </main>
    </>
  )
}
