import { supabase } from '../lib/supabase'
import { KitchenOwner } from '../lib/supabase'

export interface CreateKitchenOwnerData {
  email: string
  full_name: string
  subscription_plan: 'basic' | 'premium' | 'enterprise'
  payment_id: string
  subscription_amount: number
  subscription_expires_at: string
}

export class KitchenOwnerService {
  static async getAllKitchenOwners() {
    const { data, error } = await supabase
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

    if (error) throw error
    return data
  }

  static async getKitchenOwnerById(id: string) {
    const { data, error } = await supabase
      .from('kitchen_owners')
      .select(`
        *,
        restaurants (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async getKitchenOwnerByEmail(email: string) {
    const { data, error } = await supabase
      .from('kitchen_owners')
      .select('*')
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  }

  static async updateKitchenOwner(id: string, updates: Partial<KitchenOwner>) {
    const { data, error } = await supabase
      .from('kitchen_owners')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async markSetupCompleted(id: string) {
    return this.updateKitchenOwner(id, { is_setup_completed: true })
  }

  static async getSubscriptionStats() {
    const { data, error } = await supabase
      .from('kitchen_owners')
      .select('subscription_amount, subscription_plan, created_at')

    if (error) throw error

    const totalRevenue = data?.reduce((sum, owner) => sum + Number(owner.subscription_amount), 0) || 0
    const monthlyRevenue = data?.filter(owner => {
      const createdDate = new Date(owner.created_at)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
    }).reduce((sum, owner) => sum + Number(owner.subscription_amount), 0) || 0

    const planDistribution = data?.reduce((acc, owner) => {
      acc[owner.subscription_plan] = (acc[owner.subscription_plan] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return {
      totalRevenue,
      monthlyRevenue,
      planDistribution,
      totalOwners: data?.length || 0
    }
  }

  static async deleteKitchenOwner(id: string) {
    const { error } = await supabase
      .from('kitchen_owners')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}