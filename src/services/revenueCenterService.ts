import { supabase } from '../lib/supabase'
import { RevenueCenter } from '../lib/supabase'

export interface CreateRevenueCenterData {
  restaurant_id: string
  name: string
  type: 'restaurant' | 'bar' | 'patio' | 'takeout'
}

export class RevenueCenterService {
  static async getRevenueCentersByRestaurant(restaurantId: string) {
    const { data, error } = await supabase
      .from('revenue_centers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  static async getActiveRevenueCentersByRestaurant(restaurantId: string) {
    const { data, error } = await supabase
      .from('revenue_centers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  static async createRevenueCenter(centerData: CreateRevenueCenterData) {
    const { data, error } = await supabase
      .from('revenue_centers')
      .insert(centerData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateRevenueCenter(id: string, updates: Partial<RevenueCenter>) {
    const { data, error } = await supabase
      .from('revenue_centers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async toggleRevenueCenterStatus(id: string, isActive: boolean) {
    return this.updateRevenueCenter(id, { is_active: isActive })
  }

  static async deleteRevenueCenter(id: string) {
    const { error } = await supabase
      .from('revenue_centers')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  static async createDefaultRevenueCenters(restaurantId: string) {
    const defaultCenters = [
      { name: 'Restaurant', type: 'restaurant' as const },
      { name: 'Bar', type: 'bar' as const }
    ]

    const centersToCreate = defaultCenters.map(center => ({
      restaurant_id: restaurantId,
      name: center.name,
      type: center.type,
      is_active: true
    }))

    const { data, error } = await supabase
      .from('revenue_centers')
      .insert(centersToCreate)
      .select()

    if (error) throw error
    return data
  }

  static async getRevenueCenterStats(restaurantId: string) {
    const { data, error } = await supabase
      .from('revenue_centers')
      .select('type, is_active')
      .eq('restaurant_id', restaurantId)

    if (error) throw error

    const total = data?.length || 0
    const active = data?.filter(rc => rc.is_active).length || 0
    const typeDistribution = data?.reduce((acc, rc) => {
      acc[rc.type] = (acc[rc.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return {
      total,
      active,
      inactive: total - active,
      typeDistribution
    }
  }
}