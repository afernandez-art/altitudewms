'use client'

import { useState } from 'react'
import { Bell, Search, Settings, LogOut, User, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Datos de ejemplo para notificaciones
  const notifications = [
    {
      id: 1,
      title: 'Envío pendiente de retiro',
      message: 'ENV-2024-000125 está listo para retirar',
      time: 'Hace 5 min',
      read: false
    },
    {
      id: 2,
      title: 'Stock bajo',
      message: 'Producto PROD-001 por debajo del mínimo',
      time: 'Hace 15 min',
      read: false
    },
    {
      id: 3,
      title: 'Ruta completada',
      message: 'RUTA-2024-00045 finalizada con éxito',
      time: 'Hace 1 hora',
      read: true
    }
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Title */}
        <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
        <div className="flex-1">
          {title && (
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar envíos, clientes, rutas..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-gray-400 bg-white border border-gray-300 rounded">
              /
            </kbd>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-xs font-medium text-white bg-red-500 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notificaciones
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                          Marcar todas como leídas
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={cn(
                          'px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0',
                          !notification.read && 'bg-blue-50/50'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {!notification.read && (
                            <span className="mt-1.5 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                          <div className={cn(!notification.read && 'flex-1')}>
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-200">
                    <button className="w-full text-sm text-center text-blue-600 hover:text-blue-700 font-medium">
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 p-1 pr-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">U</span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                Usuario
              </span>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Usuario</p>
                    <p className="text-sm text-gray-500">admin@empresa.com</p>
                  </div>
                  <a
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="h-4 w-4" />
                    Mi perfil
                  </a>
                  <a
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4" />
                    Configuración
                  </a>
                  <a
                    href="/help"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Ayuda
                  </a>
                  <div className="border-t border-gray-200 mt-1">
                    <button className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
