'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { SalesOrder, SalesOrderItem, TablesInsert, TablesUpdate } from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// QUERIES
// ============================================================

export function useSalesOrders(filters?: {
  status?: SalesOrder['status']
  customerId?: string
  dateFrom?: string
  dateTo?: string
  warehouseId?: string
}) {
  return useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(id, code, name, tax_id),
          warehouse:warehouses(id, code, name),
          items:sales_order_items(count)
        `)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId)
      }
      if (filters?.warehouseId) {
        query = query.eq('warehouse_id', filters.warehouseId)
      }
      if (filters?.dateFrom) {
        query = query.gte('order_date', filters.dateFrom)
      }
      if (filters?.dateTo) {
        query = query.lte('order_date', filters.dateTo)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: ['sales-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(
            id, code, name, tax_id, email, phone,
            addresses:customer_addresses(*)
          ),
          warehouse:warehouses(id, code, name, address),
          delivery_address:customer_addresses!sales_orders_delivery_address_id_fkey(
            id, label, street, city, state, postal_code, country, latitude, longitude
          ),
          items:sales_order_items(
            *,
            product:products(id, sku, name, unit_of_measure)
          ),
          shipments:shipments(
            id, shipment_number, status, total_packages
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

export function usePendingOrders() {
  return useQuery({
    queryKey: ['sales-orders', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(id, code, name),
          warehouse:warehouses(id, code, name),
          items:sales_order_items(
            id,
            product:products(id, sku, name),
            quantity,
            picked_quantity
          )
        `)
        .in('status', ['pending', 'confirmed', 'processing'])
        .order('required_date', { ascending: true })

      if (error) throw error
      return data
    }
  })
}

// ============================================================
// MUTATIONS
// ============================================================

export function useCreateSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      order,
      items
    }: {
      order: TablesInsert<'sales_orders'>
      items: TablesInsert<'sales_order_items'>[]
    }) => {
      // Generar número de orden
      const { data: lastOrder } = await supabase
        .from('sales_orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastOrder?.order_number) {
        const match = lastOrder.order_number.match(/(\d+)$/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      const orderNumber = `OV-${new Date().getFullYear()}-${nextNumber.toString().padStart(6, '0')}`

      // Calcular totales
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
      const taxAmount = items.reduce((sum, item) => {
        const lineTotal = item.quantity * item.unit_price
        return sum + (lineTotal * (item.tax_rate || 0) / 100)
      }, 0)
      const total = subtotal + taxAmount - (order.discount_amount || 0)

      // Crear orden
      const { data: createdOrder, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          ...order,
          order_number: orderNumber,
          status: 'pending',
          subtotal,
          tax_amount: taxAmount,
          total
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Crear items
      const itemsWithOrderId = items.map(item => ({
        ...item,
        order_id: createdOrder.id,
        line_total: item.quantity * item.unit_price * (1 + (item.tax_rate || 0) / 100)
      }))

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(itemsWithOrderId)

      if (itemsError) throw itemsError

      return createdOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    }
  })
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'sales_orders'> & { id: string }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-order', data.id] })
    }
  })
}

export function useConfirmSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-order', data.id] })
    }
  })
}

export function useCancelSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({
          status: 'cancelled',
          notes: reason
        })
        .eq('id', orderId)
        .in('status', ['pending', 'confirmed'])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-order', data.id] })
    }
  })
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Solo permitir eliminar órdenes en estado pendiente
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', id)
        .eq('status', 'pending')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    }
  })
}

// ============================================================
// ORDER ITEMS
// ============================================================

export function useAddOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: TablesInsert<'sales_order_items'>) => {
      const lineTotal = item.quantity * item.unit_price * (1 + (item.tax_rate || 0) / 100)

      const { data, error } = await supabase
        .from('sales_order_items')
        .insert({
          ...item,
          line_total: lineTotal
        })
        .select()
        .single()

      if (error) throw error

      // Recalcular totales de la orden
      await recalculateOrderTotals(item.order_id)

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', data.order_id] })
    }
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, orderId, ...updates }: TablesUpdate<'sales_order_items'> & { id: string; orderId: string }) => {
      const lineTotal = updates.quantity && updates.unit_price
        ? updates.quantity * updates.unit_price * (1 + (updates.tax_rate || 0) / 100)
        : undefined

      const { data, error } = await supabase
        .from('sales_order_items')
        .update({
          ...updates,
          ...(lineTotal ? { line_total: lineTotal } : {})
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await recalculateOrderTotals(orderId)

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', data.order_id] })
    }
  })
}

export function useRemoveOrderItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, orderId }: { itemId: string; orderId: string }) => {
      const { error } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      await recalculateOrderTotals(orderId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-order', variables.orderId] })
    }
  })
}

// ============================================================
// FULFILLMENT
// ============================================================

export function useCreateShipmentFromOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      carrierId,
      serviceType
    }: {
      orderId: string
      carrierId?: string
      serviceType?: string
    }) => {
      // Obtener la orden con sus items
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(id, code, name),
          delivery_address:customer_addresses!sales_orders_delivery_address_id_fkey(*),
          items:sales_order_items(
            *,
            product:products(id, sku, name, weight, volume)
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !order) throw new Error('Orden no encontrada')

      // Calcular totales del envío
      const totalWeight = order.items?.reduce((sum: number, item: any) => {
        return sum + (item.quantity * (item.product?.weight || 0))
      }, 0) || 0

      const totalVolume = order.items?.reduce((sum: number, item: any) => {
        return sum + (item.quantity * (item.product?.volume || 0))
      }, 0) || 0

      // Generar número de envío
      const { data: lastShipment } = await supabase
        .from('shipments')
        .select('shipment_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastShipment?.shipment_number) {
        const match = lastShipment.shipment_number.match(/(\d+)$/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      const shipmentNumber = `ENV-${new Date().getFullYear()}-${nextNumber.toString().padStart(6, '0')}`

      // Crear envío
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          shipment_number: shipmentNumber,
          order_id: orderId,
          customer_id: order.customer_id,
          origin_warehouse_id: order.warehouse_id,
          carrier_id: carrierId,
          service_type: serviceType || 'standard',
          status: 'pending_pickup',
          delivery_address: order.delivery_address,
          total_weight: totalWeight,
          total_volume: totalVolume,
          total_packages: order.items?.length || 1,
          declared_value: order.total
        })
        .select()
        .single()

      if (shipmentError) throw shipmentError

      // Actualizar estado de la orden
      await supabase
        .from('sales_orders')
        .update({ status: 'shipped' })
        .eq('id', orderId)

      return shipment
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-order', variables.orderId] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

async function recalculateOrderTotals(orderId: string) {
  const { data: items } = await supabase
    .from('sales_order_items')
    .select('quantity, unit_price, tax_rate, discount_amount')
    .eq('order_id', orderId)

  if (!items) return

  const subtotal = items.reduce((sum, item) =>
    sum + (item.quantity * item.unit_price) - (item.discount_amount || 0), 0)

  const taxAmount = items.reduce((sum, item) => {
    const lineSubtotal = (item.quantity * item.unit_price) - (item.discount_amount || 0)
    return sum + (lineSubtotal * (item.tax_rate || 0) / 100)
  }, 0)

  const total = subtotal + taxAmount

  await supabase
    .from('sales_orders')
    .update({ subtotal, tax_amount: taxAmount, total })
    .eq('id', orderId)
}

export const orderStatusLabels: Record<SalesOrder['status'], string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  processing: 'En proceso',
  ready: 'Lista',
  shipped: 'Enviada',
  delivered: 'Entregada',
  cancelled: 'Cancelada'
}

export const orderStatusColors: Record<SalesOrder['status'], string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  ready: 'bg-cyan-100 text-cyan-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export const orderPriorityLabels: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente'
}
