'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageWrapper, PageLoading, PageError, EmptyState } from '@/components/layout/main-layout'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge, ActiveBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { SlideOver, ConfirmDialog } from '@/components/ui/dialog'
import { Input, Select, Textarea, Checkbox } from '@/components/ui/form-fields'
import { Card, CardContent } from '@/components/ui/card'
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  customerTypeLabels
} from '@/hooks/use-customers'
import { formatDate, formatCUIT, formatPhone } from '@/lib/utils'
import { Plus, Users, Edit, Trash2, Building2, Phone, Mail } from 'lucide-react'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'

export default function CustomersPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<any>(null)

  const { data: customers, isLoading, error, refetch } = useCustomers()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ row }) => (
        <Link
          href={`/customers/${row.original.id}`}
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
          <p className="text-sm text-gray-500">{row.original.tax_id}</p>
        </div>
      )
    },
    {
      accessorKey: 'customer_type',
      header: 'Tipo',
      cell: ({ row }) => customerTypeLabels[row.getValue('customer_type') as string] || row.getValue('customer_type')
    },
    {
      accessorKey: 'email',
      header: 'Contacto',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.email && (
            <div className="flex items-center gap-1 text-gray-600">
              <Mail className="h-3 w-3" />
              {row.original.email}
            </div>
          )}
          {row.original.phone && (
            <div className="flex items-center gap-1 text-gray-600">
              <Phone className="h-3 w-3" />
              {formatPhone(row.original.phone)}
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'is_active',
      header: 'Estado',
      cell: ({ row }) => <ActiveBadge isActive={row.getValue('is_active')} />
    },
    {
      accessorKey: 'created_at',
      header: 'Creado',
      cell: ({ row }) => formatDate(row.getValue('created_at'))
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
              setEditingCustomer(row.original)
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setDeletingCustomer(row.original)
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ]

  const handleCreateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      await createCustomer.mutateAsync({
        name: formData.get('name') as string,
        tax_id: formData.get('tax_id') as string,
        customer_type: formData.get('customer_type') as 'company' | 'individual',
        email: formData.get('email') as string || undefined,
        phone: formData.get('phone') as string || undefined,
        billing_address: {
          street: formData.get('billing_street') as string,
          city: formData.get('billing_city') as string,
          state: formData.get('billing_state') as string,
          postal_code: formData.get('billing_postal_code') as string,
          country: 'Argentina'
        },
        is_active: true
      })
      toast.success('Cliente creado exitosamente')
      setShowCreateForm(false)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al crear el cliente')
    }
  }

  const handleUpdateCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      await updateCustomer.mutateAsync({
        id: editingCustomer.id,
        name: formData.get('name') as string,
        tax_id: formData.get('tax_id') as string,
        customer_type: formData.get('customer_type') as 'company' | 'individual',
        email: formData.get('email') as string || undefined,
        phone: formData.get('phone') as string || undefined,
        is_active: formData.get('is_active') === 'on'
      })
      toast.success('Cliente actualizado exitosamente')
      setEditingCustomer(null)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el cliente')
    }
  }

  const handleDeleteCustomer = async () => {
    try {
      await deleteCustomer.mutateAsync(deletingCustomer.id)
      toast.success('Cliente eliminado exitosamente')
      setDeletingCustomer(null)
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el cliente')
    }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError error="Error al cargar los clientes" retry={refetch} />

  const CustomerForm = ({ customer, onSubmit, isLoading }: any) => (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Nombre / Razón Social"
          name="name"
          required
          defaultValue={customer?.name}
          placeholder="Empresa S.A."
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="CUIT/CUIL"
            name="tax_id"
            required
            defaultValue={customer?.tax_id}
            placeholder="30-12345678-9"
          />
          <Select
            label="Tipo"
            name="customer_type"
            defaultValue={customer?.customer_type || 'company'}
            options={[
              { value: 'company', label: 'Empresa' },
              { value: 'individual', label: 'Persona Física' }
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={customer?.email}
            placeholder="contacto@empresa.com"
          />
          <Input
            label="Teléfono"
            name="phone"
            defaultValue={customer?.phone}
            placeholder="+54 11 1234-5678"
          />
        </div>

        {!customer && (
          <>
            <h3 className="text-sm font-semibold text-gray-900 pt-4">Dirección de Facturación</h3>
            <Input
              label="Calle y Número"
              name="billing_street"
              required
              placeholder="Av. Corrientes 1234"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ciudad"
                name="billing_city"
                required
                placeholder="Buenos Aires"
              />
              <Input
                label="Provincia"
                name="billing_state"
                required
                placeholder="CABA"
              />
            </div>
            <Input
              label="Código Postal"
              name="billing_postal_code"
              required
              placeholder="1000"
            />
          </>
        )}

        {customer && (
          <Checkbox
            label="Cliente activo"
            name="is_active"
            defaultChecked={customer?.is_active}
            description="Los clientes inactivos no aparecen en las listas de selección"
          />
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => customer ? setEditingCustomer(null) : setShowCreateForm(false)}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
        >
          {customer ? 'Guardar Cambios' : 'Crear Cliente'}
        </Button>
      </div>
    </form>
  )

  return (
    <>
      <Header title="Clientes" subtitle="Gestión de clientes y direcciones" />
      <main className="p-6">
        <PageWrapper
          title="Clientes"
          subtitle={`${customers?.length || 0} clientes registrados`}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowCreateForm(true)}
            >
              Nuevo Cliente
            </Button>
          }
        >
          {customers && customers.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={customers}
                  searchKey="name"
                  searchPlaceholder="Buscar por nombre o CUIT..."
                />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Users className="h-8 w-8 text-gray-400" />}
              title="No hay clientes"
              description="Crea tu primer cliente para comenzar."
              action={
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowCreateForm(true)}
                >
                  Crear Cliente
                </Button>
              }
            />
          )}
        </PageWrapper>

        {/* Create Form */}
        <SlideOver
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title="Nuevo Cliente"
          size="md"
        >
          <CustomerForm
            onSubmit={handleCreateCustomer}
            isLoading={createCustomer.isPending}
          />
        </SlideOver>

        {/* Edit Form */}
        <SlideOver
          open={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          title="Editar Cliente"
          size="md"
        >
          <CustomerForm
            customer={editingCustomer}
            onSubmit={handleUpdateCustomer}
            isLoading={updateCustomer.isPending}
          />
        </SlideOver>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingCustomer}
          onClose={() => setDeletingCustomer(null)}
          onConfirm={handleDeleteCustomer}
          title="Eliminar Cliente"
          description={`¿Estás seguro de que deseas eliminar a "${deletingCustomer?.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={deleteCustomer.isPending}
        />
      </main>
    </>
  )
}
