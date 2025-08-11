import { supabase } from '../lib/supabase'
import { OrderService } from './orderService'
import { PaymentService } from './paymentService'
import { CustomerService } from './customerService'
import { MenuService } from './menuService'

export interface ReportFilters {
  date_from?: string
  date_to?: string
  revenue_center_id?: string
  order_type?: string
}

export interface SalesReport {
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

export class ReportService {
  static async generateSalesReport(restaurantId: string, filters?: ReportFilters): Promise<SalesReport> {
    // Get orders within date range
    const orders = await OrderService.getOrders(restaurantId, {
      date_from: filters?.date_from,
      date_to: filters?.date_to,
      type: filters?.order_type
    })

    // Filter completed orders only
    const completedOrders = orders.filter(order => 
      ['served', 'ready'].includes(order.status)
    )

    // Calculate basic metrics
    const totalSales = completedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0)
    const totalOrders = completedOrders.length
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // Top selling items
    const itemSales: { [key: string]: { quantity: number; revenue: number } } = {}
    
    completedOrders.forEach(order => {
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
    const salesByDay = this.groupSalesByDay(completedOrders)

    // Sales by revenue center
    const salesByRevenueCenter = this.groupSalesByRevenueCenter(completedOrders)

    // Payment methods
    const paymentMethods = this.groupPaymentMethods(completedOrders)

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      topSellingItems,
      salesByDay,
      salesByRevenueCenter,
      paymentMethods
    }
  }

  private static groupSalesByDay(orders: any[]) {
    const salesByDay: { [key: string]: { sales: number; orders: number } } = {}
    
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      if (!salesByDay[date]) {
        salesByDay[date] = { sales: 0, orders: 0 }
      }
      salesByDay[date].sales += Number(order.total_amount)
      salesByDay[date].orders += 1
    })

    return Object.entries(salesByDay)
      .map(([date, data]) => ({ 
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
        ...data 
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  private static groupSalesByRevenueCenter(orders: any[]) {
    const centerSales: { [key: string]: { sales: number; orders: number } } = {}
    
    orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const centerName = item.revenue_centers?.name || 'Unknown'
        if (!centerSales[centerName]) {
          centerSales[centerName] = { sales: 0, orders: 0 }
        }
        centerSales[centerName].sales += Number(item.total_price)
      })
    })

    // Distribute order count across revenue centers
    orders.forEach(order => {
      const centers = new Set(order.order_items?.map((item: any) => item.revenue_centers?.name))
      centers.forEach(centerName => {
        if (centerName && centerSales[centerName]) {
          centerSales[centerName].orders += 1 / centers.size
        }
      })
    })

    return Object.entries(centerSales)
      .map(([name, data]) => ({ name, ...data }))
  }

  private static groupPaymentMethods(orders: any[]) {
    const paymentMethods: { [key: string]: { amount: number; count: number } } = {}
    
    orders.forEach(order => {
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

    return Object.entries(paymentMethods)
      .map(([method, data]) => ({ method, ...data }))
  }

  static async getRevenueTrends(restaurantId: string, days: number = 30) {
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    const orders = await OrderService.getOrders(restaurantId, {
      date_from: dateFrom.toISOString(),
      status: 'served'
    })

    const dailyRevenue = this.groupSalesByDay(orders)
    
    // Calculate growth rate
    const recentRevenue = dailyRevenue.slice(-7).reduce((sum, day) => sum + day.sales, 0)
    const previousRevenue = dailyRevenue.slice(-14, -7).reduce((sum, day) => sum + day.sales, 0)
    const growthRate = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    return {
      dailyRevenue,
      growthRate,
      totalRevenue: dailyRevenue.reduce((sum, day) => sum + day.sales, 0),
      averageDailyRevenue: dailyRevenue.length > 0 ? dailyRevenue.reduce((sum, day) => sum + day.sales, 0) / dailyRevenue.length : 0
    }
  }

  static async getCustomerInsights(restaurantId: string, filters?: ReportFilters) {
    const customerStats = await CustomerService.getCustomerStats(restaurantId)
    
    // Get customer acquisition over time
    const customers = await CustomerService.getCustomers(restaurantId, {
      date_from: filters?.date_from,
      date_to: filters?.date_to
    })

    const acquisitionByMonth = customers.reduce((acc, customer) => {
      const month = new Date(customer.created_at).toISOString().slice(0, 7)
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      ...customerStats,
      acquisitionByMonth: Object.entries(acquisitionByMonth).map(([month, count]) => ({
        month,
        count
      }))
    }
  }

  static async getMenuPerformance(restaurantId: string, filters?: ReportFilters) {
    const orders = await OrderService.getOrders(restaurantId, {
      date_from: filters?.date_from,
      date_to: filters?.date_to
    })

    const completedOrders = orders.filter(order => ['served', 'ready'].includes(order.status))

    // Analyze menu item performance
    const itemPerformance: { [key: string]: {
      name: string
      category: string
      quantity: number
      revenue: number
      orders: number
    } } = {}

    completedOrders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const itemId = item.menu_item_id || item.combo_meal_id
        const itemName = item.menu_items?.name || item.combo_meals?.name || 'Unknown'
        
        if (!itemPerformance[itemId]) {
          itemPerformance[itemId] = {
            name: itemName,
            category: item.menu_items?.menu_categories?.name || 'Combo',
            quantity: 0,
            revenue: 0,
            orders: 0
          }
        }
        
        itemPerformance[itemId].quantity += item.quantity
        itemPerformance[itemId].revenue += Number(item.total_price)
        itemPerformance[itemId].orders += 1
      })
    })

    const topPerformers = Object.values(itemPerformance)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)

    const lowPerformers = Object.values(itemPerformance)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10)

    return {
      topPerformers,
      lowPerformers,
      totalItems: Object.keys(itemPerformance).length
    }
  }

  static async exportReport(restaurantId: string, reportType: string, filters?: ReportFilters) {
    let reportData: any

    switch (reportType) {
      case 'sales':
        reportData = await this.generateSalesReport(restaurantId, filters)
        break
      case 'customers':
        reportData = await this.getCustomerInsights(restaurantId, filters)
        break
      case 'menu':
        reportData = await this.getMenuPerformance(restaurantId, filters)
        break
      default:
        throw new Error('Invalid report type')
    }

    const exportData = {
      reportType,
      restaurantId,
      filters,
      data: reportData,
      generatedAt: new Date().toISOString()
    }

    return exportData
  }

  static async getDashboardStats(restaurantId: string) {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const [
      orderStats,
      paymentStats,
      customerStats,
      menuStats
    ] = await Promise.all([
      OrderService.getOrderStats(restaurantId, today.toISOString().split('T')[0]),
      PaymentService.getPaymentStats(restaurantId, today.toISOString().split('T')[0]),
      CustomerService.getCustomerStats(restaurantId),
      MenuService.getMenuStats(restaurantId)
    ])

    // Get yesterday's stats for comparison
    const yesterdayOrderStats = await OrderService.getOrderStats(
      restaurantId, 
      yesterday.toISOString().split('T')[0],
      yesterday.toISOString().split('T')[0]
    )

    const salesGrowth = yesterdayOrderStats.totalSales > 0 
      ? ((orderStats.totalSales - yesterdayOrderStats.totalSales) / yesterdayOrderStats.totalSales) * 100 
      : 0

    return {
      sales: {
        today: orderStats.totalSales,
        yesterday: yesterdayOrderStats.totalSales,
        growth: salesGrowth
      },
      orders: {
        total: orderStats.totalOrders,
        pending: orderStats.statusDistribution.pending || 0,
        completed: (orderStats.statusDistribution.served || 0) + (orderStats.statusDistribution.ready || 0)
      },
      payments: {
        total: paymentStats.completedAmount,
        pending: paymentStats.pendingAmount
      },
      customers: {
        total: customerStats.totalCustomers,
        averageValue: customerStats.averageCustomerValue
      },
      menu: {
        totalItems: menuStats.totalItems,
        availableItems: menuStats.availableItems
      }
    }
  }
}