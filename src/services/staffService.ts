import { supabase } from '../lib/supabase'
import { User } from '../lib/supabase'

export interface CreateStaffData {
  email: string
  full_name: string
  role: 'manager' | 'staff'
  restaurant_id: string
  password?: string
  revenue_center_ids?: string[]
}

export interface StaffAssignment {
  user_id: string
  revenue_center_id: string
}

export class StaffService {
  static async getStaffByRestaurant(restaurantId: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        staff_assignments (
          revenue_centers (id, name, type)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .in('role', ['manager', 'staff'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async getStaffById(staffId: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        staff_assignments (
          revenue_centers (*)
        )
      `)
      .eq('id', staffId)
      .single()

    if (error) throw error
    return data
  }

  static async createStaff(staffData: CreateStaffData) {
    const { email, full_name, role, restaurant_id, password, revenue_center_ids } = staffData

    // Generate random password if not provided
    const staffPassword = password || this.generateRandomPassword()

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: staffPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    })

    if (authError) throw authError

    // Create user record
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email,
        full_name,
        role,
        restaurant_id,
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      // Clean up auth user if user record creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw userError
    }

    // Create staff assignments if provided
    if (revenue_center_ids && revenue_center_ids.length > 0) {
      await this.assignStaffToRevenueCenters(newUser.id, revenue_center_ids)
    }

    return {
      user: newUser,
      password: staffPassword
    }
  }

  static async updateStaff(staffId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', staffId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateStaffStatus(staffId: string, isActive: boolean) {
    return this.updateStaff(staffId, { is_active: isActive })
  }

  static async deleteStaff(staffId: string) {
    // Get auth_user_id before deleting
    const { data: staff, error: fetchError } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', staffId)
      .single()

    if (fetchError) throw fetchError

    // Delete user record (this will cascade delete staff assignments)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', staffId)

    if (deleteError) throw deleteError

    // Delete auth user
    if (staff.auth_user_id) {
      await supabase.auth.admin.deleteUser(staff.auth_user_id)
    }
  }

  static async assignStaffToRevenueCenters(staffId: string, revenueCenterIds: string[]) {
    // First, remove existing assignments
    await supabase
      .from('staff_assignments')
      .delete()
      .eq('user_id', staffId)

    // Create new assignments
    const assignments = revenueCenterIds.map(centerId => ({
      user_id: staffId,
      revenue_center_id: centerId
    }))

    const { data, error } = await supabase
      .from('staff_assignments')
      .insert(assignments)
      .select()

    if (error) throw error
    return data
  }

  static async getStaffAssignments(staffId: string) {
    const { data, error } = await supabase
      .from('staff_assignments')
      .select(`
        *,
        revenue_centers (*)
      `)
      .eq('user_id', staffId)

    if (error) throw error
    return data
  }

  static async removeStaffFromRevenueCenter(staffId: string, revenueCenterId: string) {
    const { error } = await supabase
      .from('staff_assignments')
      .delete()
      .eq('user_id', staffId)
      .eq('revenue_center_id', revenueCenterId)

    if (error) throw error
  }

  static async getStaffStats(restaurantId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('restaurant_id', restaurantId)
      .in('role', ['manager', 'staff'])

    if (error) throw error

    const total = data?.length || 0
    const active = data?.filter(staff => staff.is_active).length || 0
    const managers = data?.filter(staff => staff.role === 'manager').length || 0
    const staff = data?.filter(staff => staff.role === 'staff').length || 0

    return {
      total,
      active,
      inactive: total - active,
      managers,
      staff,
      roleDistribution: { managers, staff }
    }
  }

  private static generateRandomPassword(length: number = 8): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  static async resetStaffPassword(staffId: string, newPassword?: string) {
    const password = newPassword || this.generateRandomPassword()

    // Get staff auth_user_id
    const { data: staff, error: fetchError } = await supabase
      .from('users')
      .select('auth_user_id, email')
      .eq('id', staffId)
      .single()

    if (fetchError) throw fetchError

    // Update auth user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      staff.auth_user_id,
      { password }
    )

    if (updateError) throw updateError

    return {
      email: staff.email,
      password
    }
  }
}