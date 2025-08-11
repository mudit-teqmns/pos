import { supabase } from '../lib/supabase'
import { Order } from '../lib/supabase'

export interface CreateOrderData {
  restaurant_id: string
  customer_id?: string
  order_number: string
  type: 'dine_in' | 'takeaway' | 'delivery'
  table_number?: string
  delivery_location?: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes?: string
}

export interface CreateOrderItemData {
  order_id: string
  menu_item_id?: string
  combo_meal_id?: string
  revenue_center_id: string
  quantity: number
  unit_price: number
  total_price: number
  customizations?: any
  special_instructions?: string
}

export interface OrderFilters {
  status?: string
  type?: string
  revenue_center_id?: string
  date_from?: string
  date_to?: string
}

export class OrderService {
  static async getOrders(restaurantId: string, filters?: OrderFilters) {
    let query = supabase
      .from('orders')
      .select(`
        *,
        customers (name, phone, email),
        order_items (
          *,
          menu_items (name, price),
          combo_meals (name, price),
          revenue_centers (name, type)
        ),
        payments (status, method, amount)
      `)
      .eq('restaurant_id', restaurantId)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return data
  }

  static async getOrderById(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        order_items (
          *,
          menu_items (*),
          combo_meals (*),
          revenue_centers (*)
        ),
        payments (*)
      `)
      .eq('id', orderId)
      .single()

    if (error) throw error
    return data
  }

  static async getOrdersByRevenueCenter(restaurantId: string, revenueCenterId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (name, phone),
        order_items!inner (
          *,
          menu_items (name),
          combo_meals (name)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('order_items.revenue_center_id', revenueCenterId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async createOrder(orderData: CreateOrderData) {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateOrder(orderId: string, updates: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateOrderStatus(orderId: string, status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled') {
    return this.updateOrder(orderId, { status })
  }

  static async addOrderItems(orderItems: CreateOrderItemData[]) {
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select()

    if (error) throw error
    return data
  }

  static async updateOrderItem(itemId: string, updates: any) {
    const { data, error } = await supabase
      .from('order_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateOrderItemStatus(itemId: string, status: string) {
    return this.updateOrderItem(itemId, { status })
  }

  static async deleteOrder(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (error) throw error
  }

  static async generateOrderNumber(restaurantId: string): Promise<string> {
    const today = new Date()
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '')
    
    // Get the count of orders for today
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', `${today.toISOString().slice(0, 10)}T00:00:00.000Z`)
      .lt('created_at', `${today.toISOString().slice(0, 10)}T23:59:59.999Z`)

    if (error) throw error

    const orderNumber = `${datePrefix}-${String((count || 0) + 1).padStart(4, '0')}`
    return orderNumber
  }

  static async getOrderStats(restaurantId: string, dateFrom?: string, dateTo?: string) {
    let query = supabase
      .from('orders')
      .select('status, type, total_amount, created_at')
      .eq('restaurant_id', restaurantId)

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    const totalOrders = data?.length || 0
    const totalSales = data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    const statusDistribution = data?.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const typeDistribution = data?.reduce((acc, order) => {
      acc[order.type] = (acc[order.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return {
      totalOrders,
      totalSales,
      averageOrderValue,
      statusDistribution,
      typeDistribution
    }
  }

  static async getRecentOrders(restaurantId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (name, phone),
        order_items (
          quantity,
          menu_items (name),
          combo_meals (name)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }
}