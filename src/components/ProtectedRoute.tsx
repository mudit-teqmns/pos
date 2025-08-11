import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  requiredRoles?: string[]
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredRoles 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if user has required role
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  // Check if kitchen owner needs to complete setup
  if (user.role === 'kitchen_owner' && !user.restaurant_id && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  // Redirect super admin to their dashboard
  if (user.role === 'super_admin' && location.pathname === '/dashboard') {
    return <Navigate to="/super-admin" replace />
  }

  return <>{children}</>
}