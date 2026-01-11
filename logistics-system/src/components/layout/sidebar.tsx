'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Warehouse,
  ShoppingCart,
  Route,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  MapPin,
  ClipboardList,
  PackageOpen,
  BoxIcon,
  FileText,
  BarChart3,
  Menu,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />
  },
  {
    label: 'Envíos',
    href: '/shipments',
    icon: <Package className="h-5 w-5" />
  },
  {
    label: 'Rutas',
    icon: <Route className="h-5 w-5" />,
    children: [
      { label: 'Todas las rutas', href: '/routes', icon: <Route className="h-4 w-4" /> },
      { label: 'Planificación', href: '/routes/planning', icon: <MapPin className="h-4 w-4" /> },
      { label: 'Hoy', href: '/routes/today', icon: <ClipboardList className="h-4 w-4" /> }
    ]
  },
  {
    label: 'WMS',
    icon: <Warehouse className="h-5 w-5" />,
    children: [
      { label: 'Almacenes', href: '/warehouses', icon: <Building2 className="h-4 w-4" /> },
      { label: 'Inventario', href: '/inventory', icon: <BoxIcon className="h-4 w-4" /> },
      { label: 'Recepción', href: '/receiving', icon: <PackageOpen className="h-4 w-4" /> },
      { label: 'Picking', href: '/picking', icon: <ClipboardList className="h-4 w-4" /> }
    ]
  },
  {
    label: 'TMS',
    icon: <Truck className="h-5 w-5" />,
    children: [
      { label: 'Vehículos', href: '/vehicles', icon: <Truck className="h-4 w-4" /> },
      { label: 'Conductores', href: '/drivers', icon: <Users className="h-4 w-4" /> },
      { label: 'Transportistas', href: '/carriers', icon: <Building2 className="h-4 w-4" /> }
    ]
  },
  {
    label: 'Ventas',
    icon: <ShoppingCart className="h-5 w-5" />,
    children: [
      { label: 'Órdenes', href: '/orders', icon: <FileText className="h-4 w-4" /> },
      { label: 'Clientes', href: '/customers', icon: <Users className="h-4 w-4" /> },
      { label: 'Productos', href: '/products', icon: <BoxIcon className="h-4 w-4" /> }
    ]
  },
  {
    label: 'Reportes',
    href: '/reports',
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    label: 'Configuración',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['WMS', 'TMS', 'Ventas', 'Rutas'])
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  const isActive = (href: string) => pathname === href
  const isChildActive = (item: NavItem) =>
    item.children?.some(child => child.href && pathname.startsWith(child.href))

  const NavItemComponent = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.label)
    const active = item.href ? isActive(item.href) : isChildActive(item)

    const content = (
      <>
        <span className="flex items-center gap-3">
          {item.icon}
          <span>{item.label}</span>
        </span>
        {hasChildren && (
          <span className="ml-auto">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
      </>
    )

    const className = cn(
      'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors',
      depth > 0 && 'ml-6',
      active
        ? 'bg-blue-50 text-blue-700'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    )

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpand(item.label)}
            className={className}
          >
            {content}
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children!.map(child => (
                <NavItemComponent key={child.label} item={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        href={item.href!}
        className={className}
        onClick={() => setIsMobileOpen(false)}
      >
        {content}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">LogiSystem</h1>
              <p className="text-xs text-gray-500">WMS / TMS</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navigation.map(item => (
              <NavItemComponent key={item.label} item={item} />
            ))}
          </nav>

          {/* User */}
          <div className="px-3 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Usuario
                </p>
                <p className="text-xs text-gray-500 truncate">
                  admin@empresa.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
