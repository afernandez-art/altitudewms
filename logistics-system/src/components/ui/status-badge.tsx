'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  labels?: Record<string, string>
  colors?: Record<string, string>
  className?: string
}

const defaultColors: Record<string, string> = {
  // Estados generales
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  failed: 'bg-red-100 text-red-800 border-red-200',

  // Estados de envío
  pending_pickup: 'bg-orange-100 text-orange-800 border-orange-200',
  picked_up: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  in_transit: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  returned: 'bg-gray-100 text-gray-800 border-gray-200',

  // Estados de ruta
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  planned: 'bg-blue-100 text-blue-800 border-blue-200',
  assigned: 'bg-purple-100 text-purple-800 border-purple-200',

  // Estados de vehículo
  available: 'bg-green-100 text-green-800 border-green-200',
  in_route: 'bg-blue-100 text-blue-800 border-blue-200',
  maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',

  // Estados de conductor
  off_duty: 'bg-gray-100 text-gray-800 border-gray-200',
  on_break: 'bg-yellow-100 text-yellow-800 border-yellow-200',

  // Prioridades
  low: 'bg-gray-100 text-gray-800 border-gray-200',
  normal: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',

  // Booleanos
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive_bool: 'bg-gray-100 text-gray-800 border-gray-200',
  true: 'bg-green-100 text-green-800 border-green-200',
  false: 'bg-gray-100 text-gray-800 border-gray-200'
}

const defaultLabels: Record<string, string> = {
  // Estados generales
  pending: 'Pendiente',
  in_progress: 'En proceso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  failed: 'Fallido',

  // Estados de envío
  pending_pickup: 'Pendiente retiro',
  picked_up: 'Retirado',
  in_transit: 'En tránsito',
  out_for_delivery: 'En reparto',
  delivered: 'Entregado',
  returned: 'Devuelto',
  failed_attempt: 'Intento fallido',

  // Estados de ruta
  draft: 'Borrador',
  planned: 'Planificada',
  assigned: 'Asignada',

  // Estados de vehículo/conductor
  available: 'Disponible',
  in_route: 'En ruta',
  maintenance: 'Mantenimiento',
  inactive: 'Inactivo',
  off_duty: 'Fuera de servicio',
  on_break: 'En descanso',

  // Prioridades
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',

  // Órdenes
  confirmed: 'Confirmada',
  processing: 'Procesando',
  ready: 'Lista',
  shipped: 'Enviada',

  // Booleanos
  active: 'Activo',
  true: 'Sí',
  false: 'No'
}

export function StatusBadge({
  status,
  labels = {},
  colors = {},
  className
}: StatusBadgeProps) {
  const mergedLabels = { ...defaultLabels, ...labels }
  const mergedColors = { ...defaultColors, ...colors }

  const label = mergedLabels[status] || status
  const colorClass = mergedColors[status] || 'bg-gray-100 text-gray-800 border-gray-200'

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}

// Componentes específicos con configuración predefinida
export function ShipmentStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

export function RouteStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

export function VehicleStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

export function DriverStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

export function OrderStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <StatusBadge status={priority} />
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <StatusBadge
      status={isActive ? 'active' : 'inactive'}
      labels={{ active: 'Activo', inactive: 'Inactivo' }}
    />
  )
}
