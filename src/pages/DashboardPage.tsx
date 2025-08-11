import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'

interface DashboardStats {
  totalSales: number
  totalOrders: number
  totalCustomers: number
  averageOrderValue: number
  pendingOrders: number
  completedOrders: number
  todaySales: number
  yesterdaySales: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const today = new Date()
      const yesterday = subDays(today, 1)
      
      // Fetch orders data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', user?.restaurant_id)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch customers count
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', user?.restaurant_id)

      if (customersError) throw customersError

      // Calculate stats
      const totalSales = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0
      const totalOrders = orders?.length || 0
      const totalCustomers = customersCount || 0
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

      const pendingOrders = orders?.filter(order => 
        ['pending', 'preparing'].includes(order.status)
      ).length || 0

      const completedOrders = orders?.filter(order => 
        ['served', 'ready'].includes(order.status)
      ).length || 0

      const todayOrders = orders?.filter(order => 
        new Date(order.created_at) >= startOfDay(today) && 
        new Date(order.created_at) <= endOfDay(today)
      ) || []

      const yesterdayOrders = orders?.filter(order => 
        new Date(order.created_at) >= startOfDay(yesterday) && 
        new Date(order.created_at) <= endOfDay(yesterday)
      ) || []

      const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0)
      const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0)

      setStats({
        totalSales,
        totalOrders,
        totalCustomers,
        averageOrderValue,
        pendingOrders,
        completedOrders,
        todaySales,
        yesterdaySales
      })

      // Set recent orders (last 10)
      setRecentOrders(orders?.slice(0, 10) || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'badge-warning', text: 'Pending' },
      preparing: { color: 'badge-info', text: 'Preparing' },
      ready: { color: 'badge-success', text: 'Ready' },
      served: { color: 'badge-success', text: 'Served' },
      cancelled: { color: 'badge-error', text: 'Cancelled' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <span className={`badge ${config.color}`}>{config.text}</span>
  }

  const getOrderTypeBadge = (type: string) => {
    const typeConfig = {
      dine_in: { color: 'badge-info', text: 'Dine In' },
      takeaway: { color: 'badge-warning', text: 'Takeaway' },
      delivery: { color: 'badge-success', text: 'Delivery' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.dine_in
    return <span className={`badge ${config.color}`}>{config.text}</span>
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }

  const salesGrowth = stats?.yesterdaySales 
    ? ((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales) * 100 
    : 0

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats?.totalSales.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="p-3 bg-primary-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-primary-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalOrders || 0}
                  </p>
                </div>
                <div className="p-3 bg-success-100 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-success-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalCustomers || 0}
                  </p>
                </div>
                <div className="p-3 bg-warning-100 rounded-full">
                  <Users className="h-6 w-6 text-warning-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats?.averageOrderValue.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="p-3 bg-error-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-error-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Today's Sales</h3>
            </div>
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    ${stats?.todaySales.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    vs ${stats?.yesterdaySales.toFixed(2) || '0.00'} yesterday
                  </p>
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  salesGrowth >= 0 ? 'text-success-600' : 'text-error-600'
                }`}>
                  <TrendingUp className="h-4 w-4" />
                  {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Pending Orders</h3>
            </div>
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-warning-600">
                    {stats?.pendingOrders || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Need attention
                  </p>
                </div>
                <div className="p-3 bg-warning-100 rounded-full">
                  <Clock className="h-6 w-6 text-warning-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Completed Orders</h3>
            </div>
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-success-600">
                    {stats?.completedOrders || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Successfully served
                  </p>
                </div>
                <div className="p-3 bg-success-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-success-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          </div>
          <div className="card-content">
            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Table/Location</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="font-medium">{order.order_number}</td>
                        <td>{getOrderTypeBadge(order.type)}</td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td className="font-medium">${Number(order.total_amount).toFixed(2)}</td>
                        <td>
                          {order.table_number && `Table ${order.table_number}`}
                          {order.delivery_location && order.delivery_location}
                          {!order.table_number && !order.delivery_location && '-'}
                        </td>
                        <td className="text-gray-600">
                          {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No orders yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Orders will appear here once customers start placing them
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}