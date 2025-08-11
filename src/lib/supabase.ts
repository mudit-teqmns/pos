import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  auth_user_id: string
  email: string
  full_name: string
  role: 'super_admin' | 'kitchen_owner' | 'manager' | 'staff'
  restaurant_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface KitchenOwner {
  id: string
  user_id: string
  email: string
  full_name: string
  subscription_plan: 'basic' | 'premium' | 'enterprise'
  payment_id: string
  subscription_amount: number
  subscription_expires_at: string
  password_hash: string
  is_setup_completed: boolean
  created_at: string
  updated_at: string
}

export interface Restaurant {
  id: string
  owner_id: string
  name: string
  address: string
  phone_number: string
  domain_name: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface RevenueCenter {
  id: string
  restaurant_id: string
  name: string
  type: 'restaurant' | 'bar' | 'patio' | 'takeout'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  is_available: boolean
  customizable_options: any[]
  allergen_info?: string
  preparation_time: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  restaurant_id: string
  customer_id?: string
  order_number: string
  type: 'dine_in' | 'takeaway' | 'delivery'
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  table_number?: string
  delivery_location?: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  restaurant_id: string
  name?: string
  email?: string
  phone?: string
  total_orders: number
  total_spent: number
  last_order_at?: string
  created_at: string
  updated_at: string
}