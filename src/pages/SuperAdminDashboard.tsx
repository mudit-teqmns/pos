import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  DollarSign,
  Store,
  Users,
  TrendingUp,
  Crown,
  Calendar,
  BarChart3,
  Eye
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface SuperAdminStats {
  totalRevenue: number
  totalRestaurants: number
  activeRestaurants: number
  totalKitchenOwners: number
  monthlyRevenue: number
  topRestaurants: any[]
  recentRestaurants: any[]
}

export default function SuperAdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [kitchenOwners, setKitchenOwners] = useState<any[]>([])

  useEffect(() => {
    fetchSuperAdminData()
  }, [])

  const fetchSuperAdminData = async () => {
    try {
      setLoading(true)

      // Fetch kitchen owners
      const { data: owners, error: ownersError } = await supabase
        .from('kitchen_owners')
        .select(`
          *,
          restaurants (
            id,
            name,
            status,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (ownersError) throw ownersError

      // Fetch restaurants
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })

      if (restaurantsError) throw restaurantsError

      // Calculate stats
      const totalRevenue = owners?.reduce((sum, owner) => sum + Number(owner.subscription_amount), 0) || 0
      const totalRestaurants = restaurants?.length || 0
      const activeRestaurants = restaurants?.filter(r => r.status === 'active').length || 0
      const totalKitchenOwners = owners?.length || 0

      // Calculate monthly revenue (current month)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyRevenue = owners?.filter(owner => {
        const createdDate = new Date(owner.created_at)
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
      }).reduce((sum, owner) => sum + Number(owner.subscription_amount), 0) || 0

      // Get top restaurants (mock data for now - would need order data)
      const topRestaurants = restaurants?.slice(0, 5).map(restaurant => ({
        ...restaurant,
        sales: Math.floor(Math.random() * 10000) + 1000 // Mock sales data
      })) || []

      // Get recent restaurants
      const recentRestaurants = restaurants?.slice(0, 5) || []

      setStats({
        totalRevenue,
        totalRestaurants,
        activeRestaurants,
        totalKitchenOwners,
        monthlyRevenue,
        topRestaurants,
        recentRestaurants
      })

      setKitchenOwners(owners || [])

    } catch (error) {
      console.error('Error fetching super admin data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleProxyLogin = async (ownerId: string) => {
    try {
      // In a real implementation, you would create a secure proxy login mechanism
      toast.info('Proxy login feature would be implemented here')
    } catch (error) {
      toast.error('Failed to proxy login')
    }
  }

  const handleStatusChange = async (restaurantId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ status: newStatus })
        .eq('id', restaurantId)

      if (error) throw error

      toast.success('Restaurant status updated successfully')
      fetchSuperAdminData()
    } catch (error) {
      console.error('Error updating restaurant status:', error)
      toast.error('Failed to update restaurant status')
    }
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="card gradient-primary text-white">
          <div className="card-content">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
                <p className="text-white/90">Welcome back, {user?.full_name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats?.totalRevenue.toFixed(2) || '0.00'}
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
                  <p className="text-sm font-medium text-gray-600">Total Restaurants</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalRestaurants || 0}
                  </p>
                  <p className="text-xs text-success-600 mt-1">
                    {stats?.activeRestaurants || 0} active
                  </p>
                </div>
                <div className="p-3 bg-success-100 rounded-full">
                  <Store className="h-6 w-6 text-success-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Kitchen Owners</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalKitchenOwners || 0}
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
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats?.monthlyRevenue.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="p-3 bg-error-100 rounded-full">
                  <Calendar className="h-6 w-6 text-error-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Restaurants and Recent Restaurants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Top Performing Restaurants</h3>
            </div>
            <div className="card-content">
              {stats?.topRestaurants.length ? (
                <div className="space-y-4">
                  {stats.topRestaurants.map((restaurant, index) => (
                    <div key={restaurant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-full text-primary-600 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{restaurant.name}</p>
                          <p className="text-sm text-gray-600">${restaurant.sales.toLocaleString()} sales</p>
                        </div>
                      </div>
                      <TrendingUp className="h-5 w-5 text-success-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No data available</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Recently Joined Restaurants</h3>
            </div>
            <div className="card-content">
              {stats?.recentRestaurants.length ? (
                <div className="space-y-4">
                  {stats.recentRestaurants.map((restaurant) => (
                    <div key={restaurant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{restaurant.name}</p>
                        <p className="text-sm text-gray-600">
                          Joined {format(new Date(restaurant.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <span className={`badge ${
                        restaurant.status === 'active' ? 'badge-success' : 
                        restaurant.status === 'inactive' ? 'badge-warning' : 'badge-error'
                      }`}>
                        {restaurant.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No restaurants yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Kitchen Owners Management */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Kitchen Owners Management</h3>
          </div>
          <div className="card-content">
            {kitchenOwners.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Email</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Restaurant</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kitchenOwners.map((owner) => (
                      <tr key={owner.id}>
                        <td className="font-medium">{owner.full_name}</td>
                        <td>{owner.email}</td>
                        <td>
                          <span className="badge badge-info capitalize">
                            {owner.subscription_plan}
                          </span>
                        </td>
                        <td className="font-medium">${Number(owner.subscription_amount).toFixed(2)}</td>
                        <td>
                          {owner.restaurants?.[0] ? (
                            <div>
                              <p className="font-medium">{owner.restaurants[0].name}</p>
                              <p className="text-sm text-gray-600">
                                {format(new Date(owner.restaurants[0].created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-500">Not setup</span>
                          )}
                        </td>
                        <td>
                          {owner.restaurants?.[0] ? (
                            <select
                              value={owner.restaurants[0].status}
                              onChange={(e) => handleStatusChange(owner.restaurants[0].id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          ) : (
                            <span className="badge badge-warning">Pending Setup</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleProxyLogin(owner.id)}
                            className="btn-sm btn-secondary"
                            disabled={!owner.restaurants?.[0]}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No kitchen owners yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}