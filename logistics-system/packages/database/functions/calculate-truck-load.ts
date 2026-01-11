// ============================================================
// EDGE FUNCTION: Cálculo de Cubicaje de Camión
// ============================================================
// Calcula la ocupación óptima de un vehículo considerando:
// - Peso máximo
// - Volumen máximo
// - Cantidad de pallets
// - Dimensiones de carga
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShipmentItem {
  shipment_id: string
  total_weight: number
  total_volume: number
  total_pallets: number
  package_count: number
  customer_name: string
  address: string
  latitude: number
  longitude: number
  time_window_start?: string
  time_window_end?: string
  priority: number
}

interface Vehicle {
  id: string
  plate: string
  max_weight: number
  max_volume: number
  max_pallets: number
  max_packages: number
  cargo_length: number
  cargo_width: number
  cargo_height: number
}

interface LoadResult {
  vehicle_id: string
  plate: string
  assigned_shipments: ShipmentItem[]
  unassigned_shipments: ShipmentItem[]
  metrics: {
    total_weight: number
    total_volume: number
    total_pallets: number
    total_packages: number
    weight_utilization: number
    volume_utilization: number
    pallet_utilization: number
    estimated_stops: number
  }
  warnings: string[]
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { vehicle_id, shipment_ids, optimization_mode = 'balanced' } = await req.json()

    // Validar parámetros
    if (!vehicle_id || !shipment_ids || !Array.isArray(shipment_ids)) {
      throw new Error('Se requiere vehicle_id y shipment_ids (array)')
    }

    // Obtener datos del vehículo
    const { data: vehicle, error: vehicleError } = await supabaseClient
      .from('vehicles')
      .select('*')
      .eq('id', vehicle_id)
      .single()

    if (vehicleError || !vehicle) {
      throw new Error('Vehículo no encontrado')
    }

    // Obtener datos de los envíos
    const { data: shipments, error: shipmentsError } = await supabaseClient
      .from('shipments')
      .select(`
        id,
        shipment_number,
        total_weight,
        total_volume,
        total_pallets,
        package_count,
        delivery_address,
        customer:customers(name)
      `)
      .in('id', shipment_ids)
      .eq('status', 'pending_pickup')

    if (shipmentsError) {
      throw new Error('Error al obtener envíos: ' + shipmentsError.message)
    }

    // Calcular cubicaje
    const result = calculateOptimalLoad(vehicle, shipments || [], optimization_mode)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateOptimalLoad(
  vehicle: Vehicle,
  shipments: any[],
  mode: 'weight' | 'volume' | 'balanced' | 'priority'
): LoadResult {
  const warnings: string[] = []
  const assigned: ShipmentItem[] = []
  const unassigned: ShipmentItem[] = []

  // Capacidades del vehículo
  const maxWeight = vehicle.max_weight
  const maxVolume = vehicle.max_volume
  const maxPallets = vehicle.max_pallets || 999
  const maxPackages = vehicle.max_packages || 999

  // Acumuladores
  let currentWeight = 0
  let currentVolume = 0
  let currentPallets = 0
  let currentPackages = 0

  // Ordenar envíos según modo de optimización
  const sortedShipments = [...shipments].sort((a, b) => {
    switch (mode) {
      case 'weight':
        // Priorizar los más pesados primero (mejor estabilidad)
        return (b.total_weight || 0) - (a.total_weight || 0)
      case 'volume':
        // Priorizar los más voluminosos primero
        return (b.total_volume || 0) - (a.total_volume || 0)
      case 'priority':
        // Priorizar por urgencia (si existe el campo)
        return (a.priority || 50) - (b.priority || 50)
      case 'balanced':
      default:
        // Ratio peso/volumen para optimizar ambos
        const ratioA = (a.total_weight || 0) / Math.max(a.total_volume || 0.001, 0.001)
        const ratioB = (b.total_weight || 0) / Math.max(b.total_volume || 0.001, 0.001)
        return ratioB - ratioA
    }
  })

  // Asignar envíos al vehículo
  for (const shipment of sortedShipments) {
    const weight = shipment.total_weight || 0
    const volume = shipment.total_volume || 0
    const pallets = shipment.total_pallets || 0
    const packages = shipment.package_count || 1

    // Verificar si cabe en el vehículo
    const fitsWeight = (currentWeight + weight) <= maxWeight
    const fitsVolume = (currentVolume + volume) <= maxVolume
    const fitsPallets = (currentPallets + pallets) <= maxPallets
    const fitsPackages = (currentPackages + packages) <= maxPackages

    if (fitsWeight && fitsVolume && fitsPallets && fitsPackages) {
      // Agregar al vehículo
      currentWeight += weight
      currentVolume += volume
      currentPallets += pallets
      currentPackages += packages

      assigned.push({
        shipment_id: shipment.id,
        total_weight: weight,
        total_volume: volume,
        total_pallets: pallets,
        package_count: packages,
        customer_name: shipment.customer?.name || 'Sin cliente',
        address: shipment.delivery_address?.street || 'Sin dirección',
        latitude: shipment.delivery_address?.latitude || 0,
        longitude: shipment.delivery_address?.longitude || 0,
        time_window_start: shipment.delivery_address?.delivery_window_start,
        time_window_end: shipment.delivery_address?.delivery_window_end,
        priority: shipment.priority || 50
      })
    } else {
      // No cabe, agregar a no asignados
      unassigned.push({
        shipment_id: shipment.id,
        total_weight: weight,
        total_volume: volume,
        total_pallets: pallets,
        package_count: packages,
        customer_name: shipment.customer?.name || 'Sin cliente',
        address: shipment.delivery_address?.street || 'Sin dirección',
        latitude: shipment.delivery_address?.latitude || 0,
        longitude: shipment.delivery_address?.longitude || 0,
        time_window_start: shipment.delivery_address?.delivery_window_start,
        time_window_end: shipment.delivery_address?.delivery_window_end,
        priority: shipment.priority || 50
      })

      // Agregar warning específico
      if (!fitsWeight) {
        warnings.push(`Envío ${shipment.shipment_number}: excede peso disponible (${weight}kg)`)
      }
      if (!fitsVolume) {
        warnings.push(`Envío ${shipment.shipment_number}: excede volumen disponible (${volume}m³)`)
      }
      if (!fitsPallets) {
        warnings.push(`Envío ${shipment.shipment_number}: excede pallets disponibles (${pallets})`)
      }
    }
  }

  // Calcular utilizaciones
  const weightUtilization = maxWeight > 0 ? (currentWeight / maxWeight) * 100 : 0
  const volumeUtilization = maxVolume > 0 ? (currentVolume / maxVolume) * 100 : 0
  const palletUtilization = maxPallets > 0 ? (currentPallets / maxPallets) * 100 : 0

  // Warnings de sub-utilización
  if (weightUtilization < 50 && volumeUtilization < 50) {
    warnings.push('⚠️ Vehículo sub-utilizado: considera agregar más envíos o usar uno más chico')
  }

  if (weightUtilization > 95) {
    warnings.push('⚠️ Peso cerca del límite: verificar balanceo de carga')
  }

  // Warnings de desbalance
  if (Math.abs(weightUtilization - volumeUtilization) > 40) {
    if (weightUtilization > volumeUtilization) {
      warnings.push('📦 Carga densa: mucho peso en poco volumen')
    } else {
      warnings.push('📦 Carga liviana: mucho volumen con poco peso')
    }
  }

  return {
    vehicle_id: vehicle.id,
    plate: vehicle.plate,
    assigned_shipments: assigned,
    unassigned_shipments: unassigned,
    metrics: {
      total_weight: Math.round(currentWeight * 100) / 100,
      total_volume: Math.round(currentVolume * 1000) / 1000,
      total_pallets: currentPallets,
      total_packages: currentPackages,
      weight_utilization: Math.round(weightUtilization * 10) / 10,
      volume_utilization: Math.round(volumeUtilization * 10) / 10,
      pallet_utilization: Math.round(palletUtilization * 10) / 10,
      estimated_stops: assigned.length
    },
    warnings
  }
}
