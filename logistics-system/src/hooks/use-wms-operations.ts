'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type {
  ReceivingOrder,
  PickingOrder,
  PackingTask,
  PutawayTask,
  TablesInsert,
  TablesUpdate
} from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// RECEIVING ORDERS (Órdenes de Recepción)
// ============================================================

export function useReceivingOrders(filters?: {
  status?: ReceivingOrder['status']
  warehouseId?: string
  supplierId?: string
}) {
  return useQuery({
    queryKey: ['receiving-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('receiving_orders')
        .select(`
          *,
          warehouse:warehouses(id, code, name),
          supplier:suppliers(id, code, name),
          items:receiving_order_items(count)
        `)
        .order('expected_date', { ascending: true })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.warehouseId) {
        query = query.eq('warehouse_id', filters.warehouseId)
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useReceivingOrder(id: string) {
  return useQuery({
    queryKey: ['receiving-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receiving_orders')
        .select(`
          *,
          warehouse:warehouses(id, code, name, address),
          supplier:suppliers(id, code, name, contact_name, phone, email),
          items:receiving_order_items(
            *,
            product:products(id, sku, name, barcode)
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

export function useCreateReceivingOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      order,
      items
    }: {
      order: TablesInsert<'receiving_orders'>
      items: TablesInsert<'receiving_order_items'>[]
    }) => {
      // Generar número de recepción
      const { data: last } = await supabase
        .from('receiving_orders')
        .select('receiving_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (last?.receiving_number) {
        const match = last.receiving_number.match(/(\d+)$/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      const receivingNumber = `REC-${new Date().getFullYear()}-${nextNumber.toString().padStart(5, '0')}`

      const { data: createdOrder, error: orderError } = await supabase
        .from('receiving_orders')
        .insert({
          ...order,
          receiving_number: receivingNumber,
          status: 'pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Crear items
      const itemsWithOrderId = items.map(item => ({
        ...item,
        receiving_order_id: createdOrder.id
      }))

      const { error: itemsError } = await supabase
        .from('receiving_order_items')
        .insert(itemsWithOrderId)

      if (itemsError) throw itemsError

      return createdOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receiving-orders'] })
    }
  })
}

export function useStartReceiving() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('receiving_orders')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receiving-orders'] })
      queryClient.invalidateQueries({ queryKey: ['receiving-order', data.id] })
    }
  })
}

export function useReceiveItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      receivedQuantity,
      lotNumber,
      expiryDate,
      locationId,
      notes
    }: {
      itemId: string
      receivedQuantity: number
      lotNumber?: string
      expiryDate?: string
      locationId: string
      notes?: string
    }) => {
      // Obtener el item
      const { data: item, error: itemError } = await supabase
        .from('receiving_order_items')
        .select('*, receiving_order_id, product_id')
        .eq('id', itemId)
        .single()

      if (itemError || !item) throw new Error('Item no encontrado')

      // Actualizar cantidad recibida
      const { data: updatedItem, error: updateError } = await supabase
        .from('receiving_order_items')
        .update({
          received_quantity: (item.received_quantity || 0) + receivedQuantity,
          lot_number: lotNumber,
          expiry_date: expiryDate,
          notes
        })
        .eq('id', itemId)
        .select()
        .single()

      if (updateError) throw updateError

      // Crear o actualizar lote si tiene número de lote
      let lotId = null
      if (lotNumber) {
        const { data: existingLot } = await supabase
          .from('lots')
          .select('id')
          .eq('product_id', item.product_id)
          .eq('lot_number', lotNumber)
          .single()

        if (existingLot) {
          lotId = existingLot.id
        } else {
          const { data: newLot, error: lotError } = await supabase
            .from('lots')
            .insert({
              product_id: item.product_id,
              lot_number: lotNumber,
              expiry_date: expiryDate,
              received_date: new Date().toISOString().split('T')[0],
              initial_quantity: receivedQuantity
            })
            .select()
            .single()

          if (lotError) throw lotError
          lotId = newLot.id
        }
      }

      // Agregar al inventario
      const { data: existingInventory } = await supabase
        .from('location_inventory')
        .select('id, quantity')
        .eq('location_id', locationId)
        .eq('product_id', item.product_id)
        .eq('lot_id', lotId)
        .single()

      if (existingInventory) {
        await supabase
          .from('location_inventory')
          .update({
            quantity: existingInventory.quantity + receivedQuantity
          })
          .eq('id', existingInventory.id)
      } else {
        await supabase
          .from('location_inventory')
          .insert({
            location_id: locationId,
            product_id: item.product_id,
            lot_id: lotId,
            quantity: receivedQuantity,
            reserved_quantity: 0
          })
      }

      return updatedItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receiving-order', data.receiving_order_id] })
      queryClient.invalidateQueries({ queryKey: ['location-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['product-inventory'] })
    }
  })
}

export function useCompleteReceiving() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('receiving_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receiving-orders'] })
      queryClient.invalidateQueries({ queryKey: ['receiving-order', data.id] })
    }
  })
}

// ============================================================
// PICKING ORDERS (Órdenes de Picking)
// ============================================================

export function usePickingOrders(filters?: {
  status?: PickingOrder['status']
  warehouseId?: string
  assignedTo?: string
  priority?: string
}) {
  return useQuery({
    queryKey: ['picking-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('picking_orders')
        .select(`
          *,
          warehouse:warehouses(id, code, name),
          sales_order:sales_orders(id, order_number, customer:customers(name)),
          assigned_user:user_profiles(id, full_name),
          items:picking_order_items(count)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.warehouseId) {
        query = query.eq('warehouse_id', filters.warehouseId)
      }
      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function usePickingOrder(id: string) {
  return useQuery({
    queryKey: ['picking-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('picking_orders')
        .select(`
          *,
          warehouse:warehouses(id, code, name),
          sales_order:sales_orders(
            id, order_number,
            customer:customers(id, name, code)
          ),
          assigned_user:user_profiles(id, full_name),
          items:picking_order_items(
            *,
            product:products(id, sku, name, barcode),
            source_location:warehouse_locations(id, code, aisle, rack, level, position),
            lot:lots(id, lot_number, expiry_date)
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

export function useCreatePickingOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (salesOrderId: string) => {
      // Obtener la orden de venta con sus items
      const { data: salesOrder, error: orderError } = await supabase
        .from('sales_orders')
        .select(`
          *,
          items:sales_order_items(
            *,
            product:products(id, sku, name)
          )
        `)
        .eq('id', salesOrderId)
        .single()

      if (orderError || !salesOrder) throw new Error('Orden de venta no encontrada')

      // Generar número de picking
      const { data: last } = await supabase
        .from('picking_orders')
        .select('picking_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (last?.picking_number) {
        const match = last.picking_number.match(/(\d+)$/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      const pickingNumber = `PICK-${new Date().getFullYear()}-${nextNumber.toString().padStart(5, '0')}`

      // Crear orden de picking
      const { data: pickingOrder, error: pickError } = await supabase
        .from('picking_orders')
        .insert({
          picking_number: pickingNumber,
          sales_order_id: salesOrderId,
          warehouse_id: salesOrder.warehouse_id,
          status: 'pending',
          priority: salesOrder.priority || 'normal'
        })
        .select()
        .single()

      if (pickError) throw pickError

      // Para cada item, encontrar ubicaciones con stock y crear items de picking
      for (const item of salesOrder.items) {
        let remainingQty = item.quantity - (item.picked_quantity || 0)

        // Buscar ubicaciones con stock (FIFO por lote)
        const { data: inventory } = await supabase
          .from('location_inventory')
          .select(`
            *,
            location:warehouse_locations!inner(id, code, warehouse_id),
            lot:lots(id, lot_number, expiry_date)
          `)
          .eq('product_id', item.product_id)
          .eq('location.warehouse_id', salesOrder.warehouse_id)
          .gt('quantity', 0)
          .order('lot.expiry_date', { ascending: true, nullsFirst: false })

        if (!inventory || inventory.length === 0) {
          continue // Sin stock disponible
        }

        for (const inv of inventory) {
          if (remainingQty <= 0) break

          const available = inv.quantity - inv.reserved_quantity
          if (available <= 0) continue

          const pickQty = Math.min(remainingQty, available)

          // Crear item de picking
          await supabase
            .from('picking_order_items')
            .insert({
              picking_order_id: pickingOrder.id,
              product_id: item.product_id,
              source_location_id: inv.location_id,
              lot_id: inv.lot_id,
              quantity_to_pick: pickQty,
              quantity_picked: 0
            })

          // Reservar stock
          await supabase
            .from('location_inventory')
            .update({
              reserved_quantity: inv.reserved_quantity + pickQty
            })
            .eq('id', inv.id)

          remainingQty -= pickQty
        }
      }

      // Actualizar estado de la orden de venta
      await supabase
        .from('sales_orders')
        .update({ status: 'processing' })
        .eq('id', salesOrderId)

      return pickingOrder
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
      queryClient.invalidateQueries({ queryKey: ['location-inventory'] })
    }
  })
}

export function useAssignPicking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pickingId, userId }: { pickingId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('picking_orders')
        .update({
          assigned_to: userId,
          status: 'assigned'
        })
        .eq('id', pickingId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] })
      queryClient.invalidateQueries({ queryKey: ['picking-order', data.id] })
    }
  })
}

export function useStartPicking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pickingId: string) => {
      const { data, error } = await supabase
        .from('picking_orders')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', pickingId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] })
      queryClient.invalidateQueries({ queryKey: ['picking-order', data.id] })
    }
  })
}

export function usePickItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      pickedQuantity,
      notes
    }: {
      itemId: string
      pickedQuantity: number
      notes?: string
    }) => {
      // Obtener el item
      const { data: item, error: itemError } = await supabase
        .from('picking_order_items')
        .select('*, picking_order_id, product_id, source_location_id, lot_id, quantity_to_pick')
        .eq('id', itemId)
        .single()

      if (itemError || !item) throw new Error('Item no encontrado')

      // Validar cantidad
      if (pickedQuantity > item.quantity_to_pick) {
        throw new Error('Cantidad pickeada excede la cantidad solicitada')
      }

      // Actualizar item
      const { data: updatedItem, error: updateError } = await supabase
        .from('picking_order_items')
        .update({
          quantity_picked: pickedQuantity,
          picked_at: new Date().toISOString(),
          notes
        })
        .eq('id', itemId)
        .select()
        .single()

      if (updateError) throw updateError

      // Descontar del inventario (el stock ya estaba reservado)
      const { data: inv } = await supabase
        .from('location_inventory')
        .select('id, quantity, reserved_quantity')
        .eq('location_id', item.source_location_id)
        .eq('product_id', item.product_id)
        .eq('lot_id', item.lot_id)
        .single()

      if (inv) {
        await supabase
          .from('location_inventory')
          .update({
            quantity: inv.quantity - pickedQuantity,
            reserved_quantity: Math.max(0, inv.reserved_quantity - item.quantity_to_pick)
          })
          .eq('id', inv.id)
      }

      return updatedItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['picking-order', data.picking_order_id] })
      queryClient.invalidateQueries({ queryKey: ['location-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['product-inventory'] })
    }
  })
}

export function useCompletePicking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pickingId: string) => {
      const { data, error } = await supabase
        .from('picking_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', pickingId)
        .select('*, sales_order_id')
        .single()

      if (error) throw error

      // Actualizar estado de la orden de venta
      if (data.sales_order_id) {
        await supabase
          .from('sales_orders')
          .update({ status: 'ready' })
          .eq('id', data.sales_order_id)
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] })
      queryClient.invalidateQueries({ queryKey: ['picking-order', data.id] })
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
    }
  })
}

// ============================================================
// PACKING TASKS (Tareas de Empaque)
// ============================================================

export function usePackingTasks(filters?: {
  status?: PackingTask['status']
  warehouseId?: string
}) {
  return useQuery({
    queryKey: ['packing-tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('packing_tasks')
        .select(`
          *,
          picking_order:picking_orders(
            id, picking_number,
            sales_order:sales_orders(id, order_number, customer:customers(name))
          ),
          assigned_user:user_profiles(id, full_name)
        `)
        .order('created_at', { ascending: true })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useCreatePackingTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pickingOrderId: string) => {
      const { data, error } = await supabase
        .from('packing_tasks')
        .insert({
          picking_order_id: pickingOrderId,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-tasks'] })
    }
  })
}

export function useCompletePackingTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      taskId,
      packagesCreated,
      totalWeight,
      totalVolume
    }: {
      taskId: string
      packagesCreated: number
      totalWeight: number
      totalVolume: number
    }) => {
      const { data, error } = await supabase
        .from('packing_tasks')
        .update({
          status: 'completed',
          packages_created: packagesCreated,
          total_weight: totalWeight,
          total_volume: totalVolume,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-tasks'] })
    }
  })
}

// ============================================================
// PUTAWAY TASKS (Tareas de Ubicación)
// ============================================================

export function usePutawayTasks(filters?: {
  status?: PutawayTask['status']
  warehouseId?: string
}) {
  return useQuery({
    queryKey: ['putaway-tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('putaway_tasks')
        .select(`
          *,
          product:products(id, sku, name),
          source_location:warehouse_locations!putaway_tasks_source_location_id_fkey(id, code),
          target_location:warehouse_locations!putaway_tasks_target_location_id_fkey(id, code),
          assigned_user:user_profiles(id, full_name)
        `)
        .order('created_at', { ascending: true })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useCreatePutawayTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (task: TablesInsert<'putaway_tasks'>) => {
      const { data, error } = await supabase
        .from('putaway_tasks')
        .insert({
          ...task,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] })
    }
  })
}

export function useCompletePutawayTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      // Obtener tarea
      const { data: task, error: taskError } = await supabase
        .from('putaway_tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError || !task) throw new Error('Tarea no encontrada')

      // Mover inventario de source a target
      // 1. Descontar de origen
      const { data: sourceInv } = await supabase
        .from('location_inventory')
        .select('id, quantity')
        .eq('location_id', task.source_location_id)
        .eq('product_id', task.product_id)
        .eq('lot_id', task.lot_id)
        .single()

      if (sourceInv) {
        const newQty = sourceInv.quantity - task.quantity
        if (newQty <= 0) {
          await supabase
            .from('location_inventory')
            .delete()
            .eq('id', sourceInv.id)
        } else {
          await supabase
            .from('location_inventory')
            .update({ quantity: newQty })
            .eq('id', sourceInv.id)
        }
      }

      // 2. Agregar a destino
      const { data: targetInv } = await supabase
        .from('location_inventory')
        .select('id, quantity')
        .eq('location_id', task.target_location_id)
        .eq('product_id', task.product_id)
        .eq('lot_id', task.lot_id)
        .single()

      if (targetInv) {
        await supabase
          .from('location_inventory')
          .update({ quantity: targetInv.quantity + task.quantity })
          .eq('id', targetInv.id)
      } else {
        await supabase
          .from('location_inventory')
          .insert({
            location_id: task.target_location_id,
            product_id: task.product_id,
            lot_id: task.lot_id,
            quantity: task.quantity,
            reserved_quantity: 0
          })
      }

      // 3. Marcar tarea completada
      const { data, error } = await supabase
        .from('putaway_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['location-inventory'] })
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

export const receivingStatusLabels: Record<ReceivingOrder['status'], string> = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  completed: 'Completada',
  cancelled: 'Cancelada'
}

export const pickingStatusLabels: Record<PickingOrder['status'], string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  in_progress: 'En proceso',
  completed: 'Completada',
  cancelled: 'Cancelada'
}

export const pickingPriorityLabels: Record<string, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente'
}

export const pickingPriorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}
