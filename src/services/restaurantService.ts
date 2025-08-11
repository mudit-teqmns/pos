import { supabase } from '../lib/supabase'
import { Restaurant } from '../lib/supabase'

export interface CreateRestaurantData {
  owner_id: string
  name: string
  address: string
  phone_number: string
  domain_name: string
}

export class RestaurantService {
  static async getAllRestaurants() {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        kitchen_owners (
          full_name,
          email,
          subscription_plan
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getRestaurantById(id: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        kitchen_owners (*),
        revenue_centers (*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  static async getRestaurantByOwnerId(ownerId: string) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', ownerId)
      .single()

    if (error) throw error
    return data
  }

  static async createRestaurant(restaurantData: CreateRestaurantData) {
    // Check domain availability
    const { data: existingDomain } = await supabase
      .from('restaurants')
      .select('id')
      .eq('domain_name', restaurantData.domain_name)
      .single()

    if (existingDomain) {
      throw new Error('Domain name is already taken')
    }

    const { data, error } = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateRestaurant(id: string, updates: Partial<Restaurant>) {
    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateRestaurantStatus(id: string, status: 'active' | 'inactive' | 'suspended') {
    return this.updateRestaurant(id, { status })
  }

  static async checkDomainAvailability(domain: string, excludeId?: string) {
    let query = supabase
      .from('restaurants')
      .select('id')
      .eq('domain_name', domain)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return !data // Domain is available if no data found
  }

  static async deleteRestaurant(id: string) {
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  static async getRestaurantStats() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('status, created_at')

    if (error) throw error

    const total = data?.length || 0
    const active = data?.filter(r => r.status === 'active').length || 0
    const inactive = data?.filter(r => r.status === 'inactive').length || 0
    const suspended = data?.filter(r => r.status === 'suspended').length || 0

    return {
      total,
      active,
      inactive,
      suspended,
      statusDistribution: { active, inactive, suspended }
    }
  }
}