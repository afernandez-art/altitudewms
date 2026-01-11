'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Vehicle, Driver, TablesInsert, TablesUpdate } from '@/types/database'

const supabase = getSupabaseClient()

// ============================================================
// VEHICLE QUERIES
// ============================================================

export function useVehicles(filters?: {
  status?: Vehicle['status']
  vehicleType?: Vehicle['vehicle_type']
  carrierId?: string
}) {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select(`
          *,
          carrier:carriers(id, code, name),
          current_driver:drivers(id, name, phone)
        `)
        .order('plate', { ascending: true })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.vehicleType) {
        query = query.eq('vehicle_type', filters.vehicleType)
      }
      if (filters?.carrierId) {
        query = query.eq('carrier_id', filters.carrierId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          carrier:carriers(id, code, name),
          current_driver:drivers(id, name, phone)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useAvailableVehicles() {
  return useQuery({
    queryKey: ['vehicles', 'available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'available')
        .order('plate', { ascending: true })

      if (error) throw error
      return data
    }
  })
}

// ============================================================
// VEHICLE MUTATIONS
// ============================================================

export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vehicle: TablesInsert<'vehicles'>) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicle)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    }
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'vehicles'> & { id: string }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle', data.id] })
    }
  })
}

export function useUpdateVehicleStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Vehicle['status'] }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update({ status })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle', data.id] })
    }
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    }
  })
}

// ============================================================
// DRIVER QUERIES
// ============================================================

export function useDrivers(filters?: {
  status?: Driver['status']
  carrierId?: string
}) {
  return useQuery({
    queryKey: ['drivers', filters],
    queryFn: async () => {
      let query = supabase
        .from('drivers')
        .select(`
          *,
          carrier:carriers(id, code, name),
          current_vehicle:vehicles(id, plate, vehicle_type)
        `)
        .order('name', { ascending: true })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.carrierId) {
        query = query.eq('carrier_id', filters.carrierId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    }
  })
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: ['driver', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          carrier:carriers(id, code, name),
          current_vehicle:vehicles(id, plate, vehicle_type)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useAvailableDrivers() {
  return useQuery({
    queryKey: ['drivers', 'available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', 'available')
        .order('name', { ascending: true })

      if (error) throw error
      return data
    }
  })
}

// ============================================================
// DRIVER MUTATIONS
// ============================================================

export function useCreateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (driver: TablesInsert<'drivers'>) => {
      const { data, error } = await supabase
        .from('drivers')
        .insert(driver)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    }
  })
}

export function useUpdateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'drivers'> & { id: string }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
      queryClient.invalidateQueries({ queryKey: ['driver', data.id] })
    }
  })
}

export function useDeleteDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    }
  })
}

// ============================================================
// HELPERS
// ============================================================

export const vehicleTypeLabels: Record<Vehicle['vehicle_type'], string> = {
  motorcycle: 'Moto',
  car: 'Auto',
  van: 'Utilitario',
  van_large: 'Utilitario Grande',
  truck_3500: 'Camión 3.5t',
  truck_7000: 'Camión 7t',
  truck_10000: 'Camión 10t',
  truck_semi: 'Semi',
  truck_trailer: 'Con acoplado'
}

export const vehicleStatusLabels: Record<Vehicle['status'], string> = {
  available: 'Disponible',
  in_route: 'En ruta',
  maintenance: 'Mantenimiento',
  out_of_service: 'Fuera de servicio'
}

export const vehicleStatusColors: Record<Vehicle['status'], string> = {
  available: 'bg-green-100 text-green-800',
  in_route: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  out_of_service: 'bg-red-100 text-red-800'
}

export const driverStatusLabels: Record<Driver['status'], string> = {
  available: 'Disponible',
  in_route: 'En ruta',
  break: 'Descanso',
  off_duty: 'Fuera de servicio',
  inactive: 'Inactivo'
}

export const driverStatusColors: Record<Driver['status'], string> = {
  available: 'bg-green-100 text-green-800',
  in_route: 'bg-blue-100 text-blue-800',
  break: 'bg-yellow-100 text-yellow-800',
  off_duty: 'bg-gray-100 text-gray-800',
  inactive: 'bg-red-100 text-red-800'
}

export function calculateVehicleUtilization(vehicle: Vehicle, loadWeight: number, loadVolume: number) {
  const weightUtil = vehicle.max_weight > 0 ? (loadWeight / vehicle.max_weight) * 100 : 0
  const volumeUtil = vehicle.max_volume > 0 ? (loadVolume / vehicle.max_volume) * 100 : 0
  return {
    weightUtilization: Math.round(weightUtil * 10) / 10,
    volumeUtilization: Math.round(volumeUtil * 10) / 10,
    limitingFactor: weightUtil > volumeUtil ? 'weight' : 'volume'
  }
}
