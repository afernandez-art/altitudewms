'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Customer, CustomerWithAddresses, CustomerAddress, TablesInsert, TablesUpdate } from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// QUERIES
// ============================================================

export function useCustomers(filters?: {
  search?: string
  customerType?: Customer['customer_type']
  isActive?: boolean
}) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select(`
          *,
          addresses:customer_addresses(*)
        `)
        .order('name', { ascending: true })

      if (filters?.customerType) {
        query = query.eq('customer_type', filters.customerType)
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,cuit.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as CustomerWithAddresses[]
    }
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          addresses:customer_addresses(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as CustomerWithAddresses
    },
    enabled: !!id
  })
}

export function useCustomerAddresses(customerId: string) {
  return useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!customerId
  })
}

// ============================================================
// MUTATIONS - CUSTOMERS
// ============================================================

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (customer: TablesInsert<'customers'>) => {
      // Generar código automático si no se proporciona
      let code = customer.code
      if (!code) {
        const { data: lastCustomer } = await supabase
          .from('customers')
          .select('code')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        let nextNumber = 1
        if (lastCustomer?.code) {
          const match = lastCustomer.code.match(/(\d+)$/)
          if (match) {
            nextNumber = parseInt(match[1]) + 1
          }
        }
        code = `CLI-${nextNumber.toString().padStart(4, '0')}`
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customer,
          code
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    }
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'customers'> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', data.id] })
    }
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    }
  })
}

// ============================================================
// MUTATIONS - ADDRESSES
// ============================================================

export function useCreateCustomerAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (address: TablesInsert<'customer_addresses'>) => {
      // Si es default, quitar default de las otras
      if (address.is_default) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('customer_id', address.customer_id)
      }

      const { data, error } = await supabase
        .from('customer_addresses')
        .insert(address)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', data.customer_id] })
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', data.customer_id] })
    }
  })
}

export function useUpdateCustomerAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'customer_addresses'> & { id: string }) => {
      // Si es default, quitar default de las otras
      if (updates.is_default) {
        const { data: current } = await supabase
          .from('customer_addresses')
          .select('customer_id')
          .eq('id', id)
          .single()

        if (current) {
          await supabase
            .from('customer_addresses')
            .update({ is_default: false })
            .eq('customer_id', current.customer_id)
            .neq('id', id)
        }
      }

      const { data, error } = await supabase
        .from('customer_addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', data.customer_id] })
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', data.customer_id] })
    }
  })
}

export function useDeleteCustomerAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, customerId }: { id: string; customerId: string }) => {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { customerId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', data.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', data.customerId] })
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

export const customerTypeLabels: Record<Customer['customer_type'], string> = {
  distributor: 'Distribuidor',
  retailer: 'Minorista',
  wholesale: 'Mayorista',
  chain: 'Cadena',
  direct: 'Directo'
}
