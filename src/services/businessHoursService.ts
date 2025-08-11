import { supabase } from '../lib/supabase'

export interface CreateBusinessHourData {
  restaurant_id: string
  revenue_center_id: string
  day_of_week: number // 0 = Sunday, 1 = Monday, etc.
  open_time?: string
  close_time?: string
  is_closed: boolean
}

export class BusinessHoursService {
  static async getBusinessHours(restaurantId: string) {
    const { data, error } = await supabase
      .from('business_hours')
      .select(`
        *,
        revenue_centers (name, type)
      `)
      .eq('restaurant_id', restaurantId)
      .order('revenue_center_id')
      .order('day_of_week')

    if (error) throw error
    return data
  }

  static async getBusinessHoursByRevenueCenter(revenueCenterId: string) {
    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .eq('revenue_center_id', revenueCenterId)
      .order('day_of_week')

    if (error) throw error
    return data
  }

  static async createBusinessHours(hoursData: CreateBusinessHourData[]) {
    const { data, error } = await supabase
      .from('business_hours')
      .insert(hoursData)
      .select()

    if (error) throw error
    return data
  }

  static async updateBusinessHours(restaurantId: string, hoursData: CreateBusinessHourData[]) {
    // Delete existing hours for this restaurant
    const { error: deleteError } = await supabase
      .from('business_hours')
      .delete()
      .eq('restaurant_id', restaurantId)

    if (deleteError) throw deleteError

    // Insert new hours
    return this.createBusinessHours(hoursData)
  }

  static async updateBusinessHour(id: string, updates: Partial<CreateBusinessHourData>) {
    const { data, error } = await supabase
      .from('business_hours')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteBusinessHour(id: string) {
    const { error } = await supabase
      .from('business_hours')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  static async initializeBusinessHours(restaurantId: string, revenueCenterIds: string[]) {
    const defaultHours: CreateBusinessHourData[] = []

    // Create default hours for each revenue center and each day of the week
    revenueCenterIds.forEach(centerId => {
      for (let day = 0; day < 7; day++) {
        defaultHours.push({
          restaurant_id: restaurantId,
          revenue_center_id: centerId,
          day_of_week: day,
          open_time: '09:00',
          close_time: '22:00',
          is_closed: false
        })
      }
    })

    return this.createBusinessHours(defaultHours)
  }

  static async copyHoursToRevenueCenter(fromCenterId: string, toCenterId: string, restaurantId: string) {
    // Get hours from source revenue center
    const sourceHours = await this.getBusinessHoursByRevenueCenter(fromCenterId)

    // Delete existing hours for target revenue center
    await supabase
      .from('business_hours')
      .delete()
      .eq('revenue_center_id', toCenterId)

    // Create new hours for target revenue center
    const newHours = sourceHours.map(hour => ({
      restaurant_id: restaurantId,
      revenue_center_id: toCenterId,
      day_of_week: hour.day_of_week,
      open_time: hour.open_time,
      close_time: hour.close_time,
      is_closed: hour.is_closed
    }))

    return this.createBusinessHours(newHours)
  }

  static async isRevenueCenterOpen(revenueCenterId: string, dateTime?: Date): Promise<boolean> {
    const checkTime = dateTime || new Date()
    const dayOfWeek = checkTime.getDay()
    const currentTime = checkTime.toTimeString().slice(0, 5) // HH:MM format

    const { data, error } = await supabase
      .from('business_hours')
      .select('open_time, close_time, is_closed')
      .eq('revenue_center_id', revenueCenterId)
      .eq('day_of_week', dayOfWeek)
      .single()

    if (error || !data) return false

    if (data.is_closed) return false

    if (!data.open_time || !data.close_time) return false

    // Handle overnight hours (e.g., 22:00 to 02:00)
    if (data.close_time < data.open_time) {
      return currentTime >= data.open_time || currentTime <= data.close_time
    }

    return currentTime >= data.open_time && currentTime <= data.close_time
  }

  static async getOpenRevenueCenters(restaurantId: string, dateTime?: Date) {
    const revenueCenters = await supabase
      .from('revenue_centers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)

    if (revenueCenters.error) throw revenueCenters.error

    const openCenters = []

    for (const center of revenueCenters.data || []) {
      const isOpen = await this.isRevenueCenterOpen(center.id, dateTime)
      if (isOpen) {
        openCenters.push(center)
      }
    }

    return openCenters
  }

  static getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayOfWeek] || 'Unknown'
  }

  static formatTime(time: string): string {
    if (!time) return ''
    
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    
    return `${displayHour}:${minutes} ${ampm}`
  }

  static async getBusinessHoursStats(restaurantId: string) {
    const hours = await this.getBusinessHours(restaurantId)

    const totalHours = hours.length
    const openDays = hours.filter(h => !h.is_closed).length
    const closedDays = hours.filter(h => h.is_closed).length

    // Group by revenue center
    const centerStats = hours.reduce((acc, hour) => {
      const centerName = hour.revenue_centers.name
      if (!acc[centerName]) {
        acc[centerName] = { open: 0, closed: 0 }
      }
      if (hour.is_closed) {
        acc[centerName].closed++
      } else {
        acc[centerName].open++
      }
      return acc
    }, {} as Record<string, { open: number; closed: number }>)

    return {
      totalHours,
      openDays,
      closedDays,
      centerStats
    }
  }
}