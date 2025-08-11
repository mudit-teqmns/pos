import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  Search,
  Eye,
  Users,
  DollarSign,
  ShoppingCart,
  Calendar
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { format } from 'date-fns'

interface Customer {
  id: string
  name?: string
  email?: string
  phone?: string
  total_orders: number
  total_spent: number
  last_order_at?: string
  created_at: string
}

interface CustomerOrder {
  id: string
  order_number: string
  type: string
  status: string
  total_amount: number
  created_at: string
}

export default function CustomerManagement() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchCustomers()
    }
  }, [user])

  const fetchCustomers = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', user?.restaurant_id)
        .order('total_spent', { ascending: false })

      if (error) throw error

      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerOrders = async (customerId: string) => {
    try {
      setLoadingOrders(true)

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, type, status, total_amount, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setCustomerOrders(data || [])
    } catch (error) {
      console.error('Error fetching customer orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const openCustomerModal = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowCustomerModal(true)
    await fetchCustomerOrders(customer.id)
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

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600">View and manage your customers</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                </div>
                <div className="p-3 bg-primary-100 rounded-full">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${customers.reduce((sum, customer) => sum + customer.total_spent, 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-success-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-success-600" />
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
                    {customers.reduce((sum, customer) => sum + customer.total_orders, 0)}
                  </p>
                </div>
                <div className="p-3 bg-warning-100 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-warning-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="card-content">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="card">
          <div className="card-content">
            {filteredCustomers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Total Orders</th>
                      <th>Total Spent</th>
                      <th>Last Order</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <div>
                            <p className="font-medium text-gray-900">
                              {customer.name || 'Guest Customer'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Member since {format(new Date(customer.created_at), 'MMM yyyy')}
                            </p>
                          </div>
                        </td>
                        <td>
                          <div>
                            {customer.email && (
                              <p className="text-sm text-gray-900">{customer.email}</p>
                            )}
                            {customer.phone && (
                              <p className="text-sm text-gray-600">{customer.phone}</p>
                            )}
                            {!customer.email && !customer.phone && (
                              <span className="text-gray-500">No contact info</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{customer.total_orders}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">${customer.total_spent.toFixed(2)}</span>
                          </div>
                        </td>
                        <td>
                          {customer.last_order_at ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {format(new Date(customer.last_order_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">Never</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => openCustomerModal(customer)}
                            className="btn-sm btn-secondary"
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
                <p className="text-gray-600">
                  {searchTerm ? 'No customers match your search' : 'No customers yet'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Customers will appear here when they place orders
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Details Modal */}
        {showCustomerModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Customer Details
                  </h3>
                  <button
                    onClick={() => setShowCustomerModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="card">
                    <div className="card-header">
                      <h4 className="font-medium text-gray-900">Customer Information</h4>
                    </div>
                    <div className="card-content space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">{selectedCustomer.name || 'Guest Customer'}</p>
                      </div>
                      {selectedCustomer.email && (
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{selectedCustomer.email}</p>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{selectedCustomer.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Customer Since</p>
                        <p className="font-medium">
                          {format(new Date(selectedCustomer.created_at), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h4 className="font-medium text-gray-900">Order Statistics</h4>
                    </div>
                    <div className="card-content space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Total Orders</p>
                        <p className="text-2xl font-bold text-primary-600">
                          {selectedCustomer.total_orders}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Spent</p>
                        <p className="text-2xl font-bold text-success-600">
                          ${selectedCustomer.total_spent.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Average Order Value</p>
                        <p className="text-lg font-medium text-gray-900">
                          ${selectedCustomer.total_orders > 0 
                            ? (selectedCustomer.total_spent / selectedCustomer.total_orders).toFixed(2)
                            : '0.00'
                          }
                        </p>
                      </div>
                      {selectedCustomer.last_order_at && (
                        <div>
                          <p className="text-sm text-gray-600">Last Order</p>
                          <p className="font-medium">
                            {format(new Date(selectedCustomer.last_order_at), 'MMMM dd, yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order History */}
                <div className="card">
                  <div className="card-header">
                    <h4 className="font-medium text-gray-900">Order History</h4>
                  </div>
                  <div className="card-content">
                    {loadingOrders ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : customerOrders.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Order #</th>
                              <th>Type</th>
                              <th>Status</th>
                              <th>Amount</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerOrders.map((order) => (
                              <tr key={order.id}>
                                <td className="font-medium">{order.order_number}</td>
                                <td>{getOrderTypeBadge(order.type)}</td>
                                <td>{getStatusBadge(order.status)}</td>
                                <td className="font-medium">
                                  ${Number(order.total_amount).toFixed(2)}
                                </td>
                                <td className="text-gray-600">
                                  {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No orders found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}