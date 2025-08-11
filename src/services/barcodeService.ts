import { supabase } from '../lib/supabase'

export interface CreateBarcodeData {
  restaurant_id: string
  code: string
  type: 'table' | 'counter' | 'menu'
  identifier?: string
}

export interface BarcodeFilters {
  type?: string
  is_active?: boolean
}

export class BarcodeService {
  static async getBarcodes(restaurantId: string, filters?: BarcodeFilters) {
    let query = supabase
      .from('barcodes')
      .select('*')
      .eq('restaurant_id', restaurantId)

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return data
  }

  static async getBarcodeById(barcodeId: string) {
    const { data, error } = await supabase
      .from('barcodes')
      .select('*')
      .eq('id', barcodeId)
      .single()

    if (error) throw error
    return data
  }

  static async getBarcodeByCode(code: string) {
    const { data, error } = await supabase
      .from('barcodes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async createBarcode(barcodeData: CreateBarcodeData) {
    const { data, error } = await supabase
      .from('barcodes')
      .insert(barcodeData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async createMultipleBarcodes(barcodesData: CreateBarcodeData[]) {
    const { data, error } = await supabase
      .from('barcodes')
      .insert(barcodesData)
      .select()

    if (error) throw error
    return data
  }

  static async updateBarcode(barcodeId: string, updates: Partial<CreateBarcodeData>) {
    const { data, error } = await supabase
      .from('barcodes')
      .update(updates)
      .eq('id', barcodeId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async toggleBarcodeStatus(barcodeId: string, isActive: boolean) {
    return this.updateBarcode(barcodeId, { is_active: isActive })
  }

  static async deleteBarcode(barcodeId: string) {
    const { error } = await supabase
      .from('barcodes')
      .delete()
      .eq('id', barcodeId)

    if (error) throw error
  }

  static generateUniqueCode(restaurantId: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const restaurantPrefix = restaurantId.slice(0, 8)
    return `${restaurantPrefix}-${timestamp}-${random}`
  }

  static async generateTableBarcodes(restaurantId: string, quantity: number) {
    const barcodes: CreateBarcodeData[] = []

    for (let i = 1; i <= quantity; i++) {
      barcodes.push({
        restaurant_id: restaurantId,
        code: this.generateUniqueCode(restaurantId),
        type: 'table',
        identifier: `Table ${i}`
      })
    }

    return this.createMultipleBarcodes(barcodes)
  }

  static async generateCounterBarcode(restaurantId: string, identifier?: string) {
    const barcodeData: CreateBarcodeData = {
      restaurant_id: restaurantId,
      code: this.generateUniqueCode(restaurantId),
      type: 'counter',
      identifier: identifier || 'Counter'
    }

    return this.createBarcode(barcodeData)
  }

  static async generateMenuBarcode(restaurantId: string, identifier?: string) {
    const barcodeData: CreateBarcodeData = {
      restaurant_id: restaurantId,
      code: this.generateUniqueCode(restaurantId),
      type: 'menu',
      identifier: identifier || 'Menu'
    }

    return this.createBarcode(barcodeData)
  }

  static async getBarcodeStats(restaurantId: string) {
    const { data, error } = await supabase
      .from('barcodes')
      .select('type, is_active')
      .eq('restaurant_id', restaurantId)

    if (error) throw error

    const total = data?.length || 0
    const active = data?.filter(barcode => barcode.is_active).length || 0
    
    const typeDistribution = data?.reduce((acc, barcode) => {
      acc[barcode.type] = (acc[barcode.type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return {
      total,
      active,
      inactive: total - active,
      typeDistribution
    }
  }

  static generateQRCodeData(barcode: any) {
    return {
      code: barcode.code,
      type: barcode.type,
      identifier: barcode.identifier,
      restaurant_id: barcode.restaurant_id,
      created_at: barcode.created_at
    }
  }

  static async validateBarcodeCode(code: string, restaurantId: string) {
    const barcode = await this.getBarcodeByCode(code)
    
    if (!barcode) {
      throw new Error('Invalid barcode')
    }

    if (barcode.restaurant_id !== restaurantId) {
      throw new Error('Barcode does not belong to this restaurant')
    }

    if (!barcode.is_active) {
      throw new Error('Barcode is inactive')
    }

    return barcode
  }
}