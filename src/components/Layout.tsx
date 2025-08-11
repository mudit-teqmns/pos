import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Menu,
  ShoppingCart,
  Users,
  UserCheck,
  QrCode,
  Clock,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  Store,
  Crown
} from 'lucide-react'
import toast from 'react-hot-toast'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['kitchen_owner', 'manager', 'staff']
    },
    {
      name: 'Menu Management',
      href: '/menu',
      icon: Menu,
      roles: ['kitchen_owner', 'manager']
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingCart,
      roles: ['kitchen_owner', 'manager', 'staff']
    },
    {
      name: 'Staff Management',
      href: '/staff',
      icon: Users,
      roles: ['kitchen_owner', 'manager']
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: UserCheck,
      roles: ['kitchen_owner', 'manager']
    },
    {
      name: 'QR Codes',
      href: '/barcodes',
      icon: QrCode,
      roles: ['kitchen_owner', 'manager']
    },
    {
      name: 'Business Hours',
      href: '/business-hours',
      icon: Clock,
      roles: ['kitchen_owner', 'manager']
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart3,
      roles: ['kitchen_owner', 'manager']
    }
  ]

  const filteredNavigation = navigationItems.filter(item =>
    item.roles.includes(user?.role || '')
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Store className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">Kitchen POS</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`sidebar-item ${isActive ? 'active' : ''} ${
                  sidebarCollapsed ? 'justify-center px-2' : ''
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t border-gray-200">
          {!sidebarCollapsed && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                {user?.role === 'super_admin' && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name}
                </p>
              </div>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={`sidebar-item text-red-600 hover:bg-red-50 w-full ${
              sidebarCollapsed ? 'justify-center px-2' : ''
            }`}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              {navigationItems.find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}