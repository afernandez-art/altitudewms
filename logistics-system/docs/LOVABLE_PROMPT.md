# Prompt para Lovable - Sistema WMS/TMS

Copia y pega este prompt en Lovable para generar el frontend.

---

## PROMPT PRINCIPAL

```
Crea un sistema de gestión logística WMS/TMS profesional para una empresa de transporte en Argentina que opera media milla (B2B) y última milla (B2C). El sistema debe conectarse a Supabase (ya tengo las tablas creadas).

## DISEÑO GENERAL

- **Estilo**: Dashboard empresarial moderno, profesional, limpio
- **Colores**: Azul corporativo (#1e40af) como primario, grises neutros, acentos verdes para éxito y rojos para alertas
- **Tipografía**: Inter o similar, clara y legible
- **Modo oscuro**: Sí, toggle en header
- **Responsive**: Mobile-first, especialmente para conductores

## ESTRUCTURA DE NAVEGACIÓN

Sidebar izquierdo colapsable con:

### DASHBOARD
- KPIs principales en cards grandes
- Gráfico de entregas del día (completadas vs pendientes)
- Mapa con vehículos en ruta (placeholder para Google Maps)
- Alertas activas (envíos atrasados, vehículos sin asignar)
- Órdenes recientes

### WMS (Almacén)
1. **Recepción** (/wms/receiving)
   - Lista de recepciones programadas
   - Formulario de nueva recepción
   - Vista de recepción activa con items

2. **Inventario** (/wms/inventory)
   - Tabla de productos con stock por ubicación
   - Filtros por almacén, zona, categoría
   - Vista de ubicaciones en grid visual
   - Alertas de stock bajo

3. **Picking** (/wms/picking)
   - Cola de órdenes de picking
   - Vista de picking activo con lista de items
   - Estado por ítem (pendiente, pickeado)

4. **Ubicaciones** (/wms/locations)
   - Árbol: Almacén > Zona > Pasillo > Rack > Nivel
   - CRUD de ubicaciones
   - Mapa visual del almacén

### TMS (Transporte)
1. **Envíos** (/tms/shipments)
   - Tabla con filtros por estado, fecha, carrier
   - Detalle de envío con timeline de tracking
   - Acciones: asignar a ruta, imprimir etiqueta

2. **Rutas** (/tms/routes)
   - Calendario de rutas por día
   - Vista de planificación con mapa
   - Drag & drop de envíos a rutas
   - Optimizador de ruta (botón que llama a Edge Function)

3. **Flota** (/tms/fleet)
   - Cards de vehículos con estado
   - Capacidad (barra de peso y volumen)
   - Vencimientos de documentación
   - Ubicación actual en mapa

4. **Conductores** (/tms/drivers)
   - Lista con estado (disponible, en ruta, descanso)
   - Métricas de desempeño
   - Vencimientos de licencia

### VENTAS
1. **Órdenes** (/sales/orders)
   - Tabla con estados (borrador, confirmada, en preparación, enviada)
   - Detalle de orden con items
   - Botón de facturar (AFIP)
   - Timeline de estados

2. **Clientes** (/sales/customers)
   - Lista de clientes B2B
   - Ficha de cliente con direcciones múltiples
   - Historial de pedidos
   - Cuenta corriente

### CONFIGURACIÓN
- Almacenes y zonas
- Transportistas
- Usuarios y roles
- Integración AFIP
- (Futuro) MercadoLibre, TiendaNube

## COMPONENTES CLAVE

### DataTable Reutilizable
- Ordenamiento por columnas
- Filtros múltiples
- Paginación
- Selección múltiple
- Acciones en bulk
- Export a Excel

### Cards de KPI
- Número grande
- Comparación con período anterior
- Icono representativo
- Color según tendencia

### Timeline de Tracking
- Vertical con iconos
- Estados con timestamp
- Último estado destacado
- Mapa de ubicación integrado

### Formularios
- Validación con react-hook-form + zod
- Campos condicionales
- Autocompletado de direcciones
- Selector de productos con búsqueda

### Mapa
- Placeholder para Google Maps
- Mostrar vehículos como markers
- Rutas como polylines
- Info popup en click

## PÁGINAS DETALLADAS

### Dashboard Principal
```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Búsqueda Global | Notificaciones | Usuario     │
├─────────────────────────────────────────────────────────────────┤
│ SIDEBAR │                    CONTENIDO                          │
│         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                 │
│ Dashboard│  │ 45   │ │ 12   │ │ 8    │ │ 95%  │                 │
│ WMS  ▼  │  │Envíos│ │En    │ │Atrasa│ │On-   │                 │
│ TMS  ▼  │  │ hoy  │ │ruta  │ │dos   │ │time  │                 │
│ Ventas▼ │  └──────┘ └──────┘ └──────┘ └──────┘                 │
│ Config  │                                                       │
│         │  ┌────────────────────┐ ┌────────────────────┐       │
│         │  │   MAPA VEHÍCULOS   │ │  ALERTAS ACTIVAS   │       │
│         │  │                    │ │  • Camión 05 atraso│       │
│         │  │       🚚  🚛       │ │  • 3 envíos sin    │       │
│         │  │    🚚      🚛      │ │    asignar         │       │
│         │  └────────────────────┘ └────────────────────┘       │
│         │                                                       │
│         │  ┌────────────────────────────────────────────┐      │
│         │  │         ÓRDENES RECIENTES                  │      │
│         │  │  #ORD-001  Cliente A  $45,000  Confirmada  │      │
│         │  │  #ORD-002  Cliente B  $23,000  En prep     │      │
│         │  └────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Planificación de Ruta
```
┌─────────────────────────────────────────────────────────────────┐
│  RUTA-2024-00123  │  Fecha: 15/01/2024  │  Estado: Planificada  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │ VEHÍCULO        │  │              MAPA                    │  │
│  │ CAM-005 Ford    │  │                                      │  │
│  │ ████████░░ 80%  │  │         [Ruta optimizada]            │  │
│  │ Peso: 2400/3000 │  │              📍 1                    │  │
│  │ Vol:  8.5/12 m³ │  │           ↙                         │  │
│  ├─────────────────┤  │         📍 2                        │  │
│  │ CONDUCTOR       │  │           ↙                         │  │
│  │ Juan Pérez      │  │      📍 3  →  📍 4                  │  │
│  │ 📞 1155667788   │  │                                      │  │
│  ├─────────────────┤  │                                      │  │
│  │ [Optimizar]     │  │                                      │  │
│  │ [Asignar]       │  │                                      │  │
│  └─────────────────┘  └──────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  #  │ Cliente      │ Dirección       │ Ventana  │ Bultos │   │
│  │  1  │ Farmacia A   │ Av. Corrientes  │ 08-10    │ 5      │   │
│  │  2  │ Kiosco B     │ Callao 123      │ 09-12    │ 2      │   │
│  │  3  │ Distrib C    │ Belgrano 456    │ 10-14    │ 12     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## CONEXIÓN SUPABASE

Ya tengo las tablas creadas. Las principales son:
- organizations, user_profiles
- customers, customer_addresses
- products, product_categories
- warehouses, warehouse_zones, warehouse_locations
- location_inventory, lots
- receiving_orders, picking_orders, packing_tasks
- carriers, vehicles, drivers
- sales_orders, sales_order_items
- shipments, shipment_tracking_events
- delivery_routes, route_stops

Usar Supabase Auth para login/registro.
Row Level Security está habilitado por organization_id.

## HOOKS NECESARIOS

Crear custom hooks para:
- useOrganization() - organización actual
- useWarehouses() - CRUD almacenes
- useProducts() - CRUD productos
- useCustomers() - CRUD clientes
- useShipments() - envíos con filtros
- useRoutes() - rutas con paradas
- useVehicles() - flota
- useDrivers() - conductores
- useDashboardMetrics() - KPIs

## FUNCIONALIDAD CRÍTICA

1. **Cubicaje de camión**: Al armar ruta, mostrar barras de utilización de peso y volumen
2. **Optimización de ruta**: Botón que reordena paradas (llamar a Edge Function)
3. **Timeline de envío**: Mostrar todos los eventos de tracking
4. **Alertas en tiempo real**: Usar Supabase Realtime para notificaciones
5. **Facturación AFIP**: Botón en orden que genera factura (llamar a Edge Function)

## CONSIDERACIONES UX

- Loading skeletons en todas las tablas
- Confirmación antes de acciones destructivas
- Toast notifications para feedback
- Shortcuts de teclado (Ctrl+K para búsqueda)
- Breadcrumbs en todas las páginas
- Empty states con ilustraciones

Genera primero el layout principal con sidebar, header, y el dashboard con KPIs y mapa placeholder. Luego iremos página por página.
```

---

## PROMPTS DE SEGUIMIENTO

Después del prompt principal, usa estos para ir agregando funcionalidades:

### Prompt 2: Módulo WMS
```
Ahora agrega el módulo WMS completo:
1. Página de Inventario con tabla de productos, filtros y vista de ubicaciones
2. Página de Recepción con lista de recepciones y formulario
3. Página de Picking con cola de órdenes y vista de picking activo
4. Usar los hooks useProducts, useWarehouses, useLocations
```

### Prompt 3: Módulo TMS
```
Ahora agrega el módulo TMS:
1. Página de Envíos con tabla, filtros y detalle con timeline
2. Página de Rutas con calendario, planificador visual y optimizador
3. Página de Flota con cards de vehículos y sus capacidades
4. Página de Conductores con lista y métricas
```

### Prompt 4: Módulo Ventas
```
Ahora agrega el módulo de Ventas:
1. Página de Órdenes con tabla, detalle y botón de facturar
2. Página de Clientes con ficha completa y múltiples direcciones
3. Formulario de nueva orden con selector de productos
4. Integración con AFIP para facturación
```

### Prompt 5: Portal Cliente (Separado)
```
Crea un portal de cliente B2B separado con:
1. Login propio para clientes
2. Catálogo de productos con stock disponible
3. Carrito y checkout
4. Historial de pedidos
5. Tracking de envíos en tiempo real
6. Cuenta corriente
```

### Prompt 6: App Conductor (PWA)
```
Crea una PWA para conductores móviles con:
1. Login simple
2. Ruta del día con lista de paradas
3. Navegación a cada parada (link a Google Maps)
4. Captura de POD (foto + firma + notas)
5. Marcar entrega como completada/fallida
6. Estado offline-first
```

---

## NOTAS IMPORTANTES

1. **Supabase URL y Key**: Reemplazar con tus credenciales reales
2. **Google Maps**: Necesitás API Key para el mapa real
3. **AFIP**: Las Edge Functions de facturación requieren certificado digital
4. **Tema**: Ajustar colores según branding de tu empresa
