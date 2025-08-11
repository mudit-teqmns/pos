import { supabase } from '../lib/supabase'
import { MenuItem } from '../lib/supabase'

export interface CreateMenuCategoryData {
  restaurant_id: string
  revenue_center_id: string
  name: string
  description?: string
  sort_order?: number
}

export interface CreateMenuItemData {
  restaurant_id: string
  category_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  customizable_options?: any[]
  allergen_info?: string
  preparation_time?: number
  sort_order?: number
}

export interface CreateComboMealData {
  restaurant_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  items: any[]
}

export interface CreateDailyDealData {
  restaurant_id: string
  title: string
  description?: string
  discount_percentage?: number
  discount_amount?: number
  applicable_items?: string[]
  valid_from: string
  valid_until: string
}

export class MenuService {
  // Menu Categories
  static async getMenuCategories(restaurantId: string) {
    const { data, error } = await supabase
      .from('menu_categories')
      .select(`
        *,
        revenue_centers (name, type)
      `)
      .eq('restaurant_id', restaurantId)
      .order('sort_order')

    if (error) throw error
    return data
  }

  static async createMenuCategory(categoryData: CreateMenuCategoryData) {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert(categoryData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateMenuCategory(id: string, updates: Partial<CreateMenuCategoryData>) {
    const { data, error } = await supabase
      .from('menu_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteMenuCategory(id: string) {
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Menu Items
  static async getMenuItems(restaurantId: string) {
    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        menu_categories (name, revenue_centers (name, type))
      `)
      .eq('restaurant_id', restaurantId)
      .order('sort_order')

    if (error) throw error
    return data
  }

  static async getMenuItemsByCategory(categoryId: string) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_available', true)
      .order('sort_order')

    if (error) throw error
    return data
  }

  static async createMenuItem(itemData: CreateMenuItemData) {
    const { data, error } = await supabase
      .from('menu_items')
      .insert(itemData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateMenuItem(id: string, updates: Partial<CreateMenuItemData>) {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async toggleMenuItemAvailability(id: string, isAvailable: boolean) {
    return this.updateMenuItem(id, { is_available: isAvailable })
  }

  static async deleteMenuItem(id: string) {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Combo Meals
  static async getComboMeals(restaurantId: string) {
    const { data, error } = await supabase
      .from('combo_meals')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async createComboMeal(comboData: CreateComboMealData) {
    const { data, error } = await supabase
      .from('combo_meals')
      .insert(comboData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateComboMeal(id: string, updates: Partial<CreateComboMealData>) {
    const { data, error } = await supabase
      .from('combo_meals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteComboMeal(id: string) {
    const { error } = await supabase
      .from('combo_meals')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Daily Deals
  static async getDailyDeals(restaurantId: string) {
    const { data, error } = await supabase
      .from('daily_deals')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getActiveDailyDeals(restaurantId: string) {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('daily_deals')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now)

    if (error) throw error
    return data
  }

  static async createDailyDeal(dealData: CreateDailyDealData) {
    const { data, error } = await supabase
      .from('daily_deals')
      .insert(dealData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateDailyDeal(id: string, updates: Partial<CreateDailyDealData>) {
    const { data, error } = await supabase
      .from('daily_deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteDailyDeal(id: string) {
    const { error } = await supabase
      .from('daily_deals')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Menu Statistics
  static async getMenuStats(restaurantId: string) {
    const [categories, items, combos, deals] = await Promise.all([
      this.getMenuCategories(restaurantId),
      this.getMenuItems(restaurantId),
      this.getComboMeals(restaurantId),
      this.getDailyDeals(restaurantId)
    ])

    const availableItems = items?.filter(item => item.is_available).length || 0
    const unavailableItems = items?.filter(item => !item.is_available).length || 0
    const activeDeals = deals?.filter(deal => deal.is_active).length || 0

    return {
      totalCategories: categories?.length || 0,
      totalItems: items?.length || 0,
      availableItems,
      unavailableItems,
      totalCombos: combos?.length || 0,
      totalDeals: deals?.length || 0,
      activeDeals
    }
  }
}