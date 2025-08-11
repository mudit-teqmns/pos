import { supabase } from '../lib/supabase'

export interface CreatePaymentData {
  order_id: string
  amount: number
  method: 'cash' | 'card' | 'gift_card' | 'online'
  transaction_id?: string
}

export interface PaymentFilters {
  status?: string
  method?: string
  date_from?: string
  date_to?: string
}

export class PaymentService {
  static async getPayments(restaurantId: string, filters?: PaymentFilters) {
    let query = supabase
      .from('payments')
      .select(`
        *,
        orders!inner (
          restaurant_id,
          order_number,
          total_amount,
          customers (name, email)
        )
      `)
      .eq('orders.restaurant_id', restaurantId)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.method) {
      query = query.eq('method', filters.method)
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

  static async getPaymentById(paymentId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          *,
          customers (*)
        )
      `)
      .eq('id', paymentId)
      .single()

    if (error) throw error
    return data
  }

  static async getPaymentsByOrder(orderId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async createPayment(paymentData: CreatePaymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updatePayment(paymentId: string, updates: any) {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updatePaymentStatus(paymentId: string, status: 'pending' | 'completed' | 'failed' | 'refunded') {
    const updates: any = { status }
    
    if (status === 'completed') {
      updates.processed_at = new Date().toISOString()
    }

    return this.updatePayment(paymentId, updates)
  }

  static async processPayment(paymentId: string, transactionId?: string) {
    const updates: any = {
      status: 'completed',
      processed_at: new Date().toISOString()
    }

    if (transactionId) {
      updates.transaction_id = transactionId
    }

    return this.updatePayment(paymentId, updates)
  }

  static async refundPayment(paymentId: string, reason?: string) {
    const updates = {
      status: 'refunded',
      processed_at: new Date().toISOString()
    }

    return this.updatePayment(paymentId, updates)
  }

  static async deletePayment(paymentId: string) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)

    if (error) throw error
  }

  static async getPaymentStats(restaurantId: string, dateFrom?: string, dateTo?: string) {
    let query = supabase
      .from('payments')
      .select(`
        status,
        method,
        amount,
        created_at,
        orders!inner (restaurant_id)
      `)
      .eq('orders.restaurant_id', restaurantId)

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    const totalPayments = data?.length || 0
    const totalAmount = data?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0
    const completedPayments = data?.filter(p => p.status === 'completed') || []
    const completedAmount = completedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)

    const statusDistribution = data?.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const methodDistribution = data?.reduce((acc, payment) => {
      if (payment.status === 'completed') {
        acc[payment.method] = (acc[payment.method] || 0) + Number(payment.amount)
      }
      return acc
    }, {} as Record<string, number>) || {}

    const averagePaymentAmount = totalPayments > 0 ? totalAmount / totalPayments : 0

    return {
      totalPayments,
      totalAmount,
      completedPayments: completedPayments.length,
      completedAmount,
      pendingAmount: totalAmount - completedAmount,
      statusDistribution,
      methodDistribution,
      averagePaymentAmount
    }
  }

  static async getPendingPayments(restaurantId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders!inner (
          restaurant_id,
          order_number,
          customers (name)
        )
      `)
      .eq('orders.restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  static async getRecentPayments(restaurantId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders!inner (
          restaurant_id,
          order_number,
          customers (name)
        )
      `)
      .eq('orders.restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  static calculateOrderPaymentStatus(payments: any[]) {
    if (!payments || payments.length === 0) {
      return 'pending'
    }

    const hasCompleted = payments.some(p => p.status === 'completed')
    const hasPending = payments.some(p => p.status === 'pending')
    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const completedAmount = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    if (completedAmount >= totalAmount) {
      return 'completed'
    } else if (hasCompleted && hasPending) {
      return 'partial'
    } else {
      return 'pending'
    }
  }
}