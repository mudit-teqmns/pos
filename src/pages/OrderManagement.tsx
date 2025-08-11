import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  DollarSign
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface Order {
  id: string
  order_number: string
  type: 'dine_in' | 'takeaway' | 'delivery'
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  table_number?: string
  delivery_location?: string
  total_amount: number
  notes?: string
  created_at: string
  customers?: {
    name?: string
    phone?: string
  }
  order_items: Array<{
    id: string
    quantity: number
    unit_price: number
    total_price: number
    status: string
    menu_items?: {
      name: string
    }
    combo_meals?: {
      name: string
    }
    revenue_centers: {
      name: string
      type: string
    }
  }>
  payments: Array<{
    status: string
    method: string
    amount: number
  }>
}

export default function OrderManagement() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, phone),
          order_items (
            *,
            menu_items (name),
            combo_meals (name),
            revenue_centers (name, type)
          ),
          payments (status, method, amount)
        `)
        .eq('restaurant_id', user?.restaurant_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      toast.success('Order status updated successfully')
      fetchOrders()
    } catch (error: any) {
      console.error('Error updating order status:', error)
      toast.error(error.message || 'Failed to update order status')
    }
  }

  const updateOrderItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', itemId)

      if (error) throw error

      toast.success('Item status updated successfully')
      fetchOrders()
      
      // Update selected order if modal is open
      if (selectedOrder) {
        const updatedOrder = orders.find(o => o.id === selectedOrder.id)
        if (updatedOrder) {
          setSelectedOrder(updatedOrder)
        }
      }
    } catch (error: any) {
      console.error('Error updating item status:', error)
      toast.error(error.message || 'Failed to update item status')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'badge-warning', text: 'Pending', icon: Clock },
      preparing: { color: 'badge-info', text: 'Preparing', icon: Clock },
      ready: { color: 'badge-success', text: 'Ready', icon: CheckCircle },
      served: { color: 'badge-success', text: 'Served', icon: CheckCircle },
      cancelled: { color: 'badge-error', text: 'Cancelled', icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon

    return (
      <span className={`badge ${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {config.text}
      </span>
    )
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

  const getPaymentStatus = (payments: any[]) => {
    if (!payments || payments.length === 0) {
      return <span className="badge badge-warning">Pending</span>
    }

    const hasCompleted = payments.some(p => p.status === 'completed')
    const hasPending = payments.some(p => p.status === 'pending')

    if (hasCompleted && !hasPending) {
      return <span className="badge badge-success">Paid</span>
    } else if (hasCompleted && hasPending) {
      return <span className="badge badge-warning">Partial</span>
    } else {
      return <span className="badge badge-warning">Pending</span>
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.table_number?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || order.status === statusFilter
    const matchesType = !typeFilter || order.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const canManagePayments = user?.role === 'kitchen_owner' || user?.role === 'manager'

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">Track and manage all orders</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-content">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="input w-48"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">Served</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                className="input w-48"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="dine_in">Dine In</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="card">
          <div className="card-content">
            {filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="font-medium">{order.order_number}</td>
                        <td>
                          {order.customers?.name || 'Guest'}
                          {order.customers?.phone && (
                            <div className="text-xs text-gray-500">
                              {order.customers.phone}
                            </div>
                          )}
                        </td>
                        <td>{getOrderTypeBadge(order.type)}</td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="pending">Pending</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                            <option value="served">Served</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          {order.table_number && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              Table {order.table_number}
                            </div>
                          )}
                          {order.delivery_location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {order.delivery_location}
                            </div>
                          )}
                          {!order.table_number && !order.delivery_location && '-'}
                        </td>
                        <td className="font-medium">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-gray-400" />
                            {Number(order.total_amount).toFixed(2)}
                          </div>
                        </td>
                        <td>{getPaymentStatus(order.payments)}</td>
                        <td className="text-gray-600">
                          {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setShowOrderModal(true)
                            }}
                            className="btn-sm btn-secondary"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {searchTerm || statusFilter || typeFilter ? 'No orders match your filters' : 'No orders yet'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order Details - {selectedOrder.order_number}
                  </h3>
                  <button
                    onClick={() => setShowOrderModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium">{selectedOrder.customers?.name || 'Guest'}</p>
                    {selectedOrder.customers?.phone && (
                      <p className="text-sm text-gray-600">{selectedOrder.customers.phone}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Type</p>
                    {getOrderTypeBadge(selectedOrder.type)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    {getPaymentStatus(selectedOrder.payments)}
                  </div>
                  {selectedOrder.table_number && (
                    <div>
                      <p className="text-sm text-gray-600">Table Number</p>
                      <p className="font-medium">Table {selectedOrder.table_number}</p>
                    </div>
                  )}
                  {selectedOrder.delivery_location && (
                    <div>
                      <p className="text-sm text-gray-600">Delivery Location</p>
                      <p className="font-medium">{selectedOrder.delivery_location}</p>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                  <div className="space-y-3">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">
                              {item.menu_items?.name || item.combo_meals?.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {item.revenue_centers.name} • Qty: {item.quantity} • ${Number(item.unit_price).toFixed(2)} each
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${Number(item.total_price).toFixed(2)}</p>
                            <select
                              value={item.status}
                              onChange={(e) => updateOrderItemStatus(item.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-1 py-0.5 mt-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="served">Served</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Total */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-lg font-bold">${Number(selectedOrder.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-sm bg-gray-50 p-2 rounded">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Order Time */}
                <div className="mt-4 text-sm text-gray-600">
                  Order placed: {format(new Date(selectedOrder.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}