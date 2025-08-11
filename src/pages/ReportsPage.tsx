import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Download,
  Filter
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface ReportData {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  topSellingItems: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  salesByDay: Array<{
    date: string
    sales: number
    orders: number
  }>
  salesByRevenueCenter: Array<{
    name: string
    sales: number
    orders: number
  }>
  paymentMethods: Array<{
    method: string
    amount: number
    count: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ReportsPage() {
  const { user } = useAuth()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchReportData()
    }
  }, [user, dateRange, startDate, endDate])

  const getDateRange = () => {
    const now = new Date()
    
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) }
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) }
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'custom':
        return { 
          start: startDate ? new Date(startDate) : startOfDay(subDays(now, 7)),
          end: endDate ? new Date(endDate) : endOfDay(now)
        }
      default:
        return { start: startOfWeek(now), end: endOfWeek(now) }
    }
  }

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      // Fetch orders within date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (name),
            combo_meals (name),
            revenue_centers (name, type)
          ),
          payments (method, amount, status)
        `)
        .eq('restaurant_id', user?.restaurant_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .in('status', ['served', 'ready']) // Only completed orders

      if (ordersError) throw ordersError

      // Calculate metrics
      const totalSales = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0
      const totalOrders = orders?.length || 0
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

      // Top selling items
      const itemSales: { [key: string]: { quantity: number; revenue: number } } = {}
      
      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const itemName = item.menu_items?.name || item.combo_meals?.name || 'Unknown Item'
          if (!itemSales[itemName]) {
            itemSales[itemName] = { quantity: 0, revenue: 0 }
          }
          itemSales[itemName].quantity += item.quantity
          itemSales[itemName].revenue += Number(item.total_price)
        })
      })

      const topSellingItems = Object.entries(itemSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Sales by day
      const salesByDay: { [key: string]: { sales: number; orders: number } } = {}
      
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd')
        if (!salesByDay[date]) {
          salesByDay[date] = { sales: 0, orders: 0 }
        }
        salesByDay[date].sales += Number(order.total_amount)
        salesByDay[date].orders += 1
      })

      const salesByDayArray = Object.entries(salesByDay)
        .map(([date, data]) => ({ date: format(new Date(date), 'MMM dd'), ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Sales by revenue center
      const centerSales: { [key: string]: { sales: number; orders: number } } = {}
      
      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const centerName = item.revenue_centers?.name || 'Unknown'
          if (!centerSales[centerName]) {
            centerSales[centerName] = { sales: 0, orders: 0 }
          }
          centerSales[centerName].sales += Number(item.total_price)
        })
      })

      orders?.forEach(order => {
        const centers = new Set(order.order_items?.map((item: any) => item.revenue_centers?.name))
        centers.forEach(centerName => {
          if (centerName && centerSales[centerName]) {
            centerSales[centerName].orders += 1 / centers.size // Distribute order count
          }
        })
      })

      const salesByRevenueCenter = Object.entries(centerSales)
        .map(([name, data]) => ({ name, ...data }))

      // Payment methods
      const paymentMethods: { [key: string]: { amount: number; count: number } } = {}
      
      orders?.forEach(order => {
        order.payments?.forEach((payment: any) => {
          if (payment.status === 'completed') {
            if (!paymentMethods[payment.method]) {
              paymentMethods[payment.method] = { amount: 0, count: 0 }
            }
            paymentMethods[payment.method].amount += Number(payment.amount)
            paymentMethods[payment.method].count += 1
          }
        })
      })

      const paymentMethodsArray = Object.entries(paymentMethods)
        .map(([method, data]) => ({ method, ...data }))

      setReportData({
        totalSales,
        totalOrders,
        averageOrderValue,
        topSellingItems,
        salesByDay: salesByDayArray,
        salesByRevenueCenter,
        paymentMethods: paymentMethodsArray
      })

    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!reportData) return

    const reportContent = {
      period: dateRange,
      dateRange: getDateRange(),
      summary: {
        totalSales: reportData.totalSales,
        totalOrders: reportData.totalOrders,
        averageOrderValue: reportData.averageOrderValue
      },
      topSellingItems: reportData.topSellingItems,
      salesByDay: reportData.salesByDay,
      salesByRevenueCenter: reportData.salesByRevenueCenter,
      paymentMethods: reportData.paymentMethods,
      generatedAt: new Date().toISOString()
    }

    const dataStr = JSON.stringify(reportContent, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600">Track your restaurant's performance</p>
          </div>
          <button
            onClick={exportReport}
            className="btn-secondary btn-md"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-content">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  className="input w-40"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {dateRange === 'custom' && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      className="input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      className="input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card hover-lift">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${reportData?.totalSales.toFixed(2) || '0.00'}
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
                    {reportData?.totalOrders || 0}
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
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${reportData?.averageOrderValue.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="p-3 bg-warning-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-warning-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by Day */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Sales by Day</h3>
            </div>
            <div className="card-content">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.salesByDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Sales']} />
                    <Bar dataKey="sales" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sales by Revenue Center */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Sales by Revenue Center</h3>
            </div>
            <div className="card-content">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData?.salesByRevenueCenter || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sales"
                    >
                      {reportData?.salesByRevenueCenter.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Sales']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Top Selling Items</h3>
          </div>
          <div className="card-content">
            {reportData?.topSellingItems && reportData.topSellingItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity Sold</th>
                      <th>Revenue</th>
                      <th>Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topSellingItems.map((item, index) => (
                      <tr key={index}>
                        <td className="font-medium">{item.name}</td>
                        <td>{item.quantity}</td>
                        <td className="font-medium">${item.revenue.toFixed(2)}</td>
                        <td>${(item.revenue / item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No sales data available for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        {reportData?.paymentMethods && reportData.paymentMethods.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reportData.paymentMethods.map((method, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 capitalize">{method.method}</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${method.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {method.count} transaction{method.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}