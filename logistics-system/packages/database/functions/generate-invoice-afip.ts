// ============================================================
// EDGE FUNCTION: Generación de Factura Electrónica AFIP
// ============================================================
// Genera facturas electrónicas A, B o C usando los
// webservices de AFIP (WSFE)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URLs de AFIP
const AFIP_URLS = {
  testing: {
    wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
  },
  production: {
    wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
    wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
  }
}

interface InvoiceRequest {
  sales_order_id: string
  invoice_type: 'A' | 'B' | 'C'
  concept: 1 | 2 | 3 // 1=Productos, 2=Servicios, 3=Productos y Servicios
}

interface InvoiceResult {
  success: boolean
  invoice_number?: string
  cae?: string
  cae_expiry?: string
  error?: string
  afip_response?: any
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

    const { sales_order_id, invoice_type, concept = 1 }: InvoiceRequest = await req.json()

    if (!sales_order_id || !invoice_type) {
      throw new Error('Se requiere sales_order_id e invoice_type')
    }

    // Obtener orden de venta
    const { data: order, error: orderError } = await supabaseClient
      .from('sales_orders')
      .select(`
        *,
        customer:customers(*),
        items:sales_order_items(*)
      `)
      .eq('id', sales_order_id)
      .single()

    if (orderError || !order) {
      throw new Error('Orden no encontrada')
    }

    if (order.invoice_status === 'invoiced') {
      throw new Error('La orden ya fue facturada')
    }

    // Obtener configuración de organización
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('*')
      .eq('id', order.organization_id)
      .single()

    if (orgError || !org) {
      throw new Error('Organización no encontrada')
    }

    if (!org.cuit || !org.afip_certificate || !org.afip_private_key) {
      throw new Error('Configuración de AFIP incompleta. Configure CUIT, certificado y clave privada.')
    }

    // Generar factura
    const result = await generateInvoice(org, order, invoice_type, concept)

    if (result.success) {
      // Actualizar orden con datos de factura
      await supabaseClient
        .from('sales_orders')
        .update({
          invoice_status: 'invoiced',
          invoice_type,
          invoice_number: result.invoice_number,
          cae: result.cae,
          cae_expiry: result.cae_expiry
        })
        .eq('id', sales_order_id)

      // Registrar en audit log
      await supabaseClient
        .from('audit_logs')
        .insert({
          organization_id: order.organization_id,
          entity_type: 'sales_order',
          entity_id: sales_order_id,
          action: 'status_change',
          new_values: {
            invoice_status: 'invoiced',
            invoice_type,
            invoice_number: result.invoice_number,
            cae: result.cae
          }
        })
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateInvoice(
  org: any,
  order: any,
  invoiceType: 'A' | 'B' | 'C',
  concept: number
): Promise<InvoiceResult> {
  const env = org.afip_environment || 'testing'
  const urls = AFIP_URLS[env as keyof typeof AFIP_URLS]

  try {
    // PASO 1: Obtener token de autenticación (WSAA)
    // En producción, esto requiere firmar un ticket de requerimiento
    // con el certificado digital y enviarlo al WSAA
    const token = await getAuthToken(org, urls.wsaa)

    // PASO 2: Obtener último número de comprobante
    const lastNumber = await getLastInvoiceNumber(
      org.cuit,
      org.punto_venta || 1,
      getInvoiceTypeCode(invoiceType),
      token,
      urls.wsfe
    )

    const newNumber = lastNumber + 1

    // PASO 3: Preparar datos del comprobante
    const invoiceData = {
      CantReg: 1,
      PtoVta: org.punto_venta || 1,
      CbteTipo: getInvoiceTypeCode(invoiceType),
      Concepto: concept,
      DocTipo: getDocType(order.customer),
      DocNro: getDocNumber(order.customer),
      CbteDesde: newNumber,
      CbteHasta: newNumber,
      CbteFch: formatDateAFIP(new Date()),
      ImpTotal: order.total,
      ImpTotConc: 0, // No gravado
      ImpNeto: calculateNetAmount(order.total, invoiceType),
      ImpOpEx: 0, // Exento
      ImpIVA: calculateIVA(order.total, invoiceType),
      ImpTrib: 0, // Otros tributos
      MonId: 'PES',
      MonCotiz: 1
    }

    // PASO 4: Solicitar CAE
    const caeResponse = await requestCAE(
      org.cuit,
      invoiceData,
      token,
      urls.wsfe
    )

    if (caeResponse.success) {
      return {
        success: true,
        invoice_number: `${org.punto_venta || 1}-${newNumber.toString().padStart(8, '0')}`,
        cae: caeResponse.cae,
        cae_expiry: caeResponse.cae_expiry,
        afip_response: caeResponse.raw
      }
    } else {
      return {
        success: false,
        error: caeResponse.error || 'Error al solicitar CAE',
        afip_response: caeResponse.raw
      }
    }

  } catch (error) {
    return {
      success: false,
      error: `Error AFIP: ${error.message}`
    }
  }
}

// Funciones auxiliares

function getInvoiceTypeCode(type: 'A' | 'B' | 'C'): number {
  const codes = { 'A': 1, 'B': 6, 'C': 11 }
  return codes[type]
}

function getDocType(customer: any): number {
  // 80 = CUIT, 86 = CUIL, 96 = DNI, 99 = Consumidor Final
  if (customer?.cuit) return 80
  if (customer?.dni) return 96
  return 99 // Consumidor final
}

function getDocNumber(customer: any): number {
  if (customer?.cuit) return parseInt(customer.cuit.replace(/-/g, ''))
  if (customer?.dni) return parseInt(customer.dni)
  return 0
}

function formatDateAFIP(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '')
}

function calculateNetAmount(total: number, type: 'A' | 'B' | 'C'): number {
  // Factura A: IVA discriminado, neto = total / 1.21
  // Factura B/C: IVA incluido
  if (type === 'A') {
    return Math.round((total / 1.21) * 100) / 100
  }
  return total
}

function calculateIVA(total: number, type: 'A' | 'B' | 'C'): number {
  if (type === 'A') {
    const neto = total / 1.21
    return Math.round((total - neto) * 100) / 100
  }
  return 0
}

// NOTA: Las siguientes funciones son placeholders.
// En producción, requieren implementación completa con
// firma digital, SOAP requests, y manejo de certificados.

async function getAuthToken(org: any, wsaaUrl: string): Promise<any> {
  // TODO: Implementar autenticación WSAA
  // 1. Crear Ticket de Requerimiento de Acceso (TRA)
  // 2. Firmarlo con certificado digital
  // 3. Enviarlo al WSAA
  // 4. Recibir token y sign

  // Por ahora, retornar mock para testing
  console.log('WSAA URL:', wsaaUrl)
  return {
    token: 'mock_token',
    sign: 'mock_sign',
    expiration: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  }
}

async function getLastInvoiceNumber(
  cuit: string,
  puntoVenta: number,
  tipoComprobante: number,
  token: any,
  wsfeUrl: string
): Promise<number> {
  // TODO: Implementar FECompUltimoAutorizado
  // Llamar al webservice WSFE para obtener último nro

  console.log('WSFE URL:', wsfeUrl)
  console.log('Getting last invoice for:', { cuit, puntoVenta, tipoComprobante })

  // Mock para testing
  return Math.floor(Math.random() * 1000) + 1
}

async function requestCAE(
  cuit: string,
  invoiceData: any,
  token: any,
  wsfeUrl: string
): Promise<any> {
  // TODO: Implementar FECAESolicitar
  // Enviar comprobante al WSFE y recibir CAE

  console.log('Requesting CAE for invoice:', invoiceData)

  // Mock para testing
  const mockCAE = Math.floor(Math.random() * 10000000000000000).toString().padStart(14, '0')
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + 10)

  return {
    success: true,
    cae: mockCAE,
    cae_expiry: expiryDate.toISOString().split('T')[0],
    raw: {
      resultado: 'A',
      observaciones: []
    }
  }
}

// ============================================================
// NOTA IMPORTANTE PARA PRODUCCIÓN:
// ============================================================
// Esta función requiere:
// 1. Certificado digital de AFIP (.crt)
// 2. Clave privada (.key)
// 3. Implementación de firma CMS
// 4. Librería SOAP para Argentina (ej: afip.js)
//
// Para implementación completa, usar:
// - https://github.com/AfipSDK/afip.js
// - O implementar manualmente con xml-crypto y soap
// ============================================================
