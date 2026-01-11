'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Product, ProductCategory, TablesInsert, TablesUpdate } from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// CATEGORIES
// ============================================================

export function useCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select(`
          *,
          products:products(count)
        `)
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ['product-category', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (category: TablesInsert<'product_categories'>) => {
      const { data, error } = await supabase
        .from('product_categories')
        .insert(category)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    }
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'product_categories'> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      queryClient.invalidateQueries({ queryKey: ['product-category', data.id] })
    }
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    }
  })
}

// ============================================================
// PRODUCTS
// ============================================================

export function useProducts(filters?: {
  categoryId?: string
  isActive?: boolean
  search?: string
}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:product_categories(id, name)
        `)
        .order('name', { ascending: true })

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(id, name),
          inventory:location_inventory(
            id,
            quantity,
            reserved_quantity,
            location:warehouse_locations(
              id,
              code,
              warehouse:warehouses(id, code, name)
            )
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

export function useProductBySku(sku: string) {
  return useQuery({
    queryKey: ['product-sku', sku],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!sku
  })
}

export function useProductByBarcode(barcode: string) {
  return useQuery({
    queryKey: ['product-barcode', barcode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!barcode
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (product: TablesInsert<'products'>) => {
      // Generar SKU automático si no se proporciona
      let sku = product.sku
      if (!sku) {
        const { data: lastProduct } = await supabase
          .from('products')
          .select('sku')
          .ilike('sku', 'PROD-%')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let nextNumber = 1
        if (lastProduct?.sku) {
          const match = lastProduct.sku.match(/PROD-(\d+)/)
          if (match) {
            nextNumber = parseInt(match[1]) + 1
          }
        }
        sku = `PROD-${nextNumber.toString().padStart(6, '0')}`
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          ...product,
          sku
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'products'> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', data.id] })
    }
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  })
}

// ============================================================
// LOTS (Lotes)
// ============================================================

export function useLots(productId?: string) {
  return useQuery({
    queryKey: ['lots', productId],
    queryFn: async () => {
      let query = supabase
        .from('lots')
        .select(`
          *,
          product:products(id, sku, name)
        `)
        .order('expiry_date', { ascending: true })

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useExpiringLots(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['lots-expiring', daysAhead],
    queryFn: async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)

      const { data, error } = await supabase
        .from('lots')
        .select(`
          *,
          product:products(id, sku, name),
          inventory:location_inventory(
            quantity,
            location:warehouse_locations(code, warehouse:warehouses(name))
          )
        `)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })

      if (error) throw error
      return data
    }
  })
}

export function useCreateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lot: TablesInsert<'lots'>) => {
      const { data, error } = await supabase
        .from('lots')
        .insert(lot)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
    }
  })
}

export function useUpdateLot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'lots'> & { id: string }) => {
      const { data, error } = await supabase
        .from('lots')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
    }
  })
}

// ============================================================
// STOCK OPERATIONS
// ============================================================

export function useAdjustStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      locationId,
      productId,
      lotId,
      quantityChange,
      reason
    }: {
      locationId: string
      productId: string
      lotId?: string
      quantityChange: number
      reason: string
    }) => {
      // Buscar registro existente
      let query = supabase
        .from('location_inventory')
        .select('*')
        .eq('location_id', locationId)
        .eq('product_id', productId)

      if (lotId) {
        query = query.eq('lot_id', lotId)
      } else {
        query = query.is('lot_id', null)
      }

      const { data: existing } = await query.single()

      if (existing) {
        // Actualizar cantidad
        const newQuantity = existing.quantity + quantityChange
        if (newQuantity < 0) {
          throw new Error('No hay suficiente stock para esta operación')
        }

        const { data, error } = await supabase
          .from('location_inventory')
          .update({ quantity: newQuantity })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else if (quantityChange > 0) {
        // Crear nuevo registro
        const { data, error } = await supabase
          .from('location_inventory')
          .insert({
            location_id: locationId,
            product_id: productId,
            lot_id: lotId,
            quantity: quantityChange,
            reserved_quantity: 0
          })
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        throw new Error('No existe inventario para ajustar')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['product-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
    }
  })
}

export function useReserveStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      locationId,
      productId,
      lotId,
      quantity
    }: {
      locationId: string
      productId: string
      lotId?: string
      quantity: number
    }) => {
      let query = supabase
        .from('location_inventory')
        .select('*')
        .eq('location_id', locationId)
        .eq('product_id', productId)

      if (lotId) {
        query = query.eq('lot_id', lotId)
      } else {
        query = query.is('lot_id', null)
      }

      const { data: existing, error: fetchError } = await query.single()

      if (fetchError || !existing) {
        throw new Error('No se encontró inventario en esta ubicación')
      }

      const availableQty = existing.quantity - existing.reserved_quantity
      if (quantity > availableQty) {
        throw new Error(`Stock disponible insuficiente. Disponible: ${availableQty}`)
      }

      const { data, error } = await supabase
        .from('location_inventory')
        .update({
          reserved_quantity: existing.reserved_quantity + quantity
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['product-inventory'] })
    }
  })
}

export function useReleaseReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      locationId,
      productId,
      lotId,
      quantity
    }: {
      locationId: string
      productId: string
      lotId?: string
      quantity: number
    }) => {
      let query = supabase
        .from('location_inventory')
        .select('*')
        .eq('location_id', locationId)
        .eq('product_id', productId)

      if (lotId) {
        query = query.eq('lot_id', lotId)
      } else {
        query = query.is('lot_id', null)
      }

      const { data: existing, error: fetchError } = await query.single()

      if (fetchError || !existing) {
        throw new Error('No se encontró inventario en esta ubicación')
      }

      const newReserved = Math.max(0, existing.reserved_quantity - quantity)

      const { data, error } = await supabase
        .from('location_inventory')
        .update({ reserved_quantity: newReserved })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['product-inventory'] })
    }
  })
}

// ============================================================
// LOW STOCK ALERTS
// ============================================================

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      // Obtener productos con stock por debajo del mínimo
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, sku, name, min_stock, max_stock')
        .gt('min_stock', 0)

      if (prodError) throw prodError

      const { data: inventory, error: invError } = await supabase
        .from('location_inventory')
        .select('product_id, quantity, reserved_quantity')

      if (invError) throw invError

      // Agrupar inventario por producto
      const stockByProduct: Record<string, { total: number; available: number }> = {}
      inventory?.forEach(item => {
        if (!stockByProduct[item.product_id]) {
          stockByProduct[item.product_id] = { total: 0, available: 0 }
        }
        stockByProduct[item.product_id].total += item.quantity
        stockByProduct[item.product_id].available += (item.quantity - item.reserved_quantity)
      })

      // Filtrar productos con bajo stock
      return products?.filter(product => {
        const stock = stockByProduct[product.id] || { total: 0, available: 0 }
        return stock.available < (product.min_stock || 0)
      }).map(product => ({
        ...product,
        currentStock: stockByProduct[product.id]?.available || 0,
        totalStock: stockByProduct[product.id]?.total || 0
      })) || []
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

export const productUnitLabels: Record<string, string> = {
  unit: 'Unidad',
  box: 'Caja',
  pallet: 'Pallet',
  kg: 'Kilogramo',
  liter: 'Litro',
  meter: 'Metro'
}
