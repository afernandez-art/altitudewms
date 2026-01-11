// ============================================================
// EDGE FUNCTION: Optimización de Rutas
// ============================================================
// Optimiza el orden de paradas considerando:
// - Distancia entre puntos
// - Ventanas horarias de entrega
// - Prioridades de envío
// - Tiempo de servicio en cada parada
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Stop {
  id: string
  shipment_id: string
  latitude: number
  longitude: number
  customer_name: string
  address: string
  time_window_start?: string
  time_window_end?: string
  service_time: number // minutos
  priority: number
  packages: number
  weight: number
}

interface RouteResult {
  optimized_stops: OptimizedStop[]
  metrics: {
    total_distance_km: number
    total_duration_minutes: number
    total_stops: number
    estimated_start: string
    estimated_end: string
  }
  warnings: string[]
}

interface OptimizedStop extends Stop {
  sequence: number
  planned_arrival: string
  planned_departure: string
  distance_from_previous_km: number
  travel_time_minutes: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      origin_lat,
      origin_lng,
      stops,
      start_time = '08:00',
      avg_speed_kmh = 30, // Velocidad promedio en ciudad
      default_service_time = 15 // minutos por parada
    } = await req.json()

    if (!origin_lat || !origin_lng || !stops || !Array.isArray(stops)) {
      throw new Error('Se requiere origin_lat, origin_lng y stops (array)')
    }

    const result = optimizeRoute(
      { lat: origin_lat, lng: origin_lng },
      stops,
      start_time,
      avg_speed_kmh,
      default_service_time
    )

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

function optimizeRoute(
  origin: { lat: number; lng: number },
  stops: Stop[],
  startTime: string,
  avgSpeedKmh: number,
  defaultServiceTime: number
): RouteResult {
  const warnings: string[] = []

  // Algoritmo: Nearest Neighbor con consideración de ventanas horarias
  // (Para producción, usar Google OR-Tools o similar)

  const optimizedStops: OptimizedStop[] = []
  const remainingStops = [...stops]
  let currentLocation = origin
  let currentTime = parseTime(startTime)
  let totalDistance = 0

  // Primero, ordenar por prioridad las que tienen ventana horaria temprana
  remainingStops.sort((a, b) => {
    // Priorizar por ventana horaria de inicio
    if (a.time_window_start && b.time_window_start) {
      return parseTime(a.time_window_start) - parseTime(b.time_window_start)
    }
    if (a.time_window_start) return -1
    if (b.time_window_start) return 1

    // Luego por prioridad numérica
    return (a.priority || 50) - (b.priority || 50)
  })

  let sequence = 1

  while (remainingStops.length > 0) {
    // Encontrar la próxima parada óptima
    let bestIndex = -1
    let bestScore = Infinity

    for (let i = 0; i < remainingStops.length; i++) {
      const stop = remainingStops[i]
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        stop.latitude,
        stop.longitude
      )

      const travelTime = (distance / avgSpeedKmh) * 60 // minutos
      const arrivalTime = currentTime + travelTime

      // Calcular score considerando:
      // 1. Distancia
      // 2. Ventana horaria (penalizar si llegamos tarde)
      // 3. Prioridad

      let score = distance

      // Penalizar si llegamos fuera de ventana
      if (stop.time_window_end) {
        const windowEnd = parseTime(stop.time_window_end)
        if (arrivalTime > windowEnd) {
          score += 1000 // Gran penalización por llegar tarde
        }
      }

      // Penalizar si llegamos muy temprano (espera)
      if (stop.time_window_start) {
        const windowStart = parseTime(stop.time_window_start)
        if (arrivalTime < windowStart) {
          const waitTime = windowStart - arrivalTime
          score += waitTime * 0.5 // Penalización menor por esperar
        }
      }

      // Bonificar por prioridad alta (número bajo = más prioritario)
      score -= (100 - (stop.priority || 50)) * 0.1

      if (score < bestScore) {
        bestScore = score
        bestIndex = i
      }
    }

    // Agregar la mejor parada
    const nextStop = remainingStops.splice(bestIndex, 1)[0]
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      nextStop.latitude,
      nextStop.longitude
    )
    const travelTime = (distance / avgSpeedKmh) * 60

    let arrivalTime = currentTime + travelTime

    // Si llegamos antes de la ventana, esperar
    if (nextStop.time_window_start) {
      const windowStart = parseTime(nextStop.time_window_start)
      if (arrivalTime < windowStart) {
        arrivalTime = windowStart
      }
    }

    // Verificar si llegamos tarde
    if (nextStop.time_window_end) {
      const windowEnd = parseTime(nextStop.time_window_end)
      if (arrivalTime > windowEnd) {
        warnings.push(
          `⚠️ ${nextStop.customer_name}: llegada estimada ${formatTime(arrivalTime)} ` +
          `fuera de ventana (hasta ${nextStop.time_window_end})`
        )
      }
    }

    const serviceTime = nextStop.service_time || defaultServiceTime
    const departureTime = arrivalTime + serviceTime

    optimizedStops.push({
      ...nextStop,
      sequence,
      planned_arrival: formatTime(arrivalTime),
      planned_departure: formatTime(departureTime),
      distance_from_previous_km: Math.round(distance * 10) / 10,
      travel_time_minutes: Math.round(travelTime)
    })

    totalDistance += distance
    currentTime = departureTime
    currentLocation = { lat: nextStop.latitude, lng: nextStop.longitude }
    sequence++
  }

  // Calcular retorno al origen
  const returnDistance = calculateDistance(
    currentLocation.lat,
    currentLocation.lng,
    origin.lat,
    origin.lng
  )
  const returnTime = (returnDistance / avgSpeedKmh) * 60
  totalDistance += returnDistance
  currentTime += returnTime

  // Métricas finales
  const totalDuration = currentTime - parseTime(startTime)

  return {
    optimized_stops: optimizedStops,
    metrics: {
      total_distance_km: Math.round(totalDistance * 10) / 10,
      total_duration_minutes: Math.round(totalDuration),
      total_stops: optimizedStops.length,
      estimated_start: startTime,
      estimated_end: formatTime(currentTime)
    },
    warnings
  }
}

// Calcular distancia entre dos puntos (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Parsear tiempo HH:mm a minutos desde medianoche
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

// Formatear minutos a HH:mm
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = Math.round(minutes % 60)
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
