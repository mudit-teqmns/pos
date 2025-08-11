import { supabase } from '../lib/supabase'
import { Customer } from '../lib/supabase'

export interface CreateCustomerData {
  restaurant_id: string
  name?: string
  email?: string
  phone?: string
}

export interface CustomerFilters {
  search?: string
  date_from?: string
  date_to?: string
}

export class CustomerService {
  static async getCustomers(restaurantId: string, filters?: CustomerFilters) {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    query = query.order('total_spent', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return data
  }

  static async getCustomerById(customerId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error) throw error
    return data
  }

  static async getCustomerByEmail(restaurantId: string, email: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async getCustomerByPhone(restaurantId: string, phone: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('phone', phone)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async createCustomer(customerData: CreateCustomerData) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateCustomer(customerId: string, updates: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteCustomer(customerId: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (error) throw error
  }

  static async updateCustomerOrderStats(customerId: string, orderAmount: number) {
    // Get current customer data
    const customer = await this.getCustomerById(customerId)
    
    const updates = {
      total_orders: customer.total_orders + 1,
      total_spent: Number(customer.total_spent) + orderAmount,
      last_order_at: new Date().toISOString()
    }

    return this.updateCustomer(customerId, updates)
  }

  static async getCustomerOrders(customerId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (name),
          combo_meals (name)
        ),
        payments (*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getCustomerStats(restaurantId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('total_orders, total_spent, created_at')
      .eq('restaurant_id', restaurantId)

    if (error) throw error

    const totalCustomers = data?.length || 0
    const totalRevenue = data?.reduce((sum, customer) => sum + Number(customer.total_spent), 0) || 0
    const totalOrders = data?.reduce((sum, customer) => sum + customer.total_orders, 0) || 0
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const averageCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0

    // Get top customers
    const topCustomers = data
      ?.sort((a, b) => Number(b.total_spent) - Number(a.total_spent))
      .slice(0, 10) || []

    return {
      totalCustomers,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      averageCustomerValue,
      topCustomers
    }
  }

  static async getRecentCustomers(restaurantId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  static async findOrCreateCustomer(restaurantId: string, customerInfo: { name?: string; email?: string; phone?: string }) {
    let customer = null

    // Try to find existing customer by email or phone
    if (customerInfo.email) {
      customer = await this.getCustomerByEmail(restaurantId, customerInfo.email)
    }

    if (!customer && customerInfo.phone) {
      customer = await this.getCustomerByPhone(restaurantId, customerInfo.phone)
    }

    // Create new customer if not found
    if (!customer) {
      customer = await this.createCustomer({
        restaurant_id: restaurantId,
        ...customerInfo
      })
    } else if (customerInfo.name || customerInfo.email || customerInfo.phone) {
      // Update existing customer with new information
      const updates: Partial<Customer> = {}
      if (customerInfo.name && !customer.name) updates.name = customerInfo.name
      if (customerInfo.email && !customer.email) updates.email = customerInfo.email
      if (customerInfo.phone && !customer.phone) updates.phone = customerInfo.phone

      if (Object.keys(updates).length > 0) {
        customer = await this.updateCustomer(customer.id, updates)
      }
    }

    return customer
  }
}