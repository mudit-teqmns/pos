import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  Plus,
  QrCode,
  Download,
  Trash2,
  Copy,
  Check,
  Table,
  Coffee,
  Utensils
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

interface Barcode {
  id: string
  code: string
  type: 'table' | 'counter' | 'menu'
  identifier?: string
  is_active: boolean
  created_at: string
}

export default function BarcodeManagement() {
  const { user } = useAuth()
  const [barcodes, setBarcodes] = useState<Barcode[]>([])
  const [loading, setLoading] = useState(true)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const [barcodeForm, setBarcodeForm] = useState({
    type: 'table' as 'table' | 'counter' | 'menu',
    identifier: '',
    quantity: 1
  })

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchBarcodes()
    }
  }, [user])

  const fetchBarcodes = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('barcodes')
        .select('*')
        .eq('restaurant_id', user?.restaurant_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setBarcodes(data || [])
    } catch (error) {
      console.error('Error fetching barcodes:', error)
      toast.error('Failed to load barcodes')
    } finally {
      setLoading(false)
    }
  }

  const generateUniqueCode = () => {
    return `${user?.restaurant_id?.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const barcodesToCreate = []

      if (barcodeForm.type === 'table') {
        // Create multiple table barcodes
        for (let i = 1; i <= barcodeForm.quantity; i++) {
          barcodesToCreate.push({
            restaurant_id: user?.restaurant_id,
            code: generateUniqueCode(),
            type: barcodeForm.type,
            identifier: `Table ${i}`,
            is_active: true
          })
        }
      } else {
        // Create single barcode
        barcodesToCreate.push({
          restaurant_id: user?.restaurant_id,
          code: generateUniqueCode(),
          type: barcodeForm.type,
          identifier: barcodeForm.identifier || undefined,
          is_active: true
        })
      }

      const { error } = await supabase
        .from('barcodes')
        .insert(barcodesToCreate)

      if (error) throw error

      toast.success(`${barcodesToCreate.length} barcode(s) created successfully`)
      setShowBarcodeModal(false)
      setBarcodeForm({
        type: 'table',
        identifier: '',
        quantity: 1
      })
      fetchBarcodes()

    } catch (error: any) {
      console.error('Error creating barcodes:', error)
      toast.error(error.message || 'Failed to create barcodes')
    }
  }

  const handleDelete = async (barcodeId: string) => {
    if (!confirm('Are you sure you want to delete this barcode?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('barcodes')
        .delete()
        .eq('id', barcodeId)

      if (error) throw error

      toast.success('Barcode deleted successfully')
      fetchBarcodes()
    } catch (error: any) {
      console.error('Error deleting barcode:', error)
      toast.error(error.message || 'Failed to delete barcode')
    }
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      toast.success('Code copied to clipboard')
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      toast.error('Failed to copy code')
    }
  }

  const downloadQRCode = (barcode: Barcode) => {
    // In a real implementation, you would generate a QR code image
    // For now, we'll create a simple text file with the barcode data
    const qrData = {
      code: barcode.code,
      type: barcode.type,
      identifier: barcode.identifier,
      restaurant_id: user?.restaurant_id
    }

    const dataStr = JSON.stringify(qrData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `qr-code-${barcode.identifier || barcode.type}-${barcode.code.slice(-8)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('QR code data downloaded')
  }

  const getBarcodeIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <Table className="h-5 w-5 text-primary-600" />
      case 'counter':
        return <Coffee className="h-5 w-5 text-warning-600" />
      case 'menu':
        return <Utensils className="h-5 w-5 text-success-600" />
      default:
        return <QrCode className="h-5 w-5 text-gray-600" />
    }
  }

  const getBarcodeTypeBadge = (type: string) => {
    const typeConfig = {
      table: { color: 'badge-primary', text: 'Table' },
      counter: { color: 'badge-warning', text: 'Counter' },
      menu: { color: 'badge-success', text: 'Menu' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.table
    return <span className={`badge ${config.color}`}>{config.text}</span>
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
            <p className="text-gray-600">Generate and manage QR codes for tables, counters, and menus</p>
          </div>
          <button
            onClick={() => setShowBarcodeModal(true)}
            className="btn-primary btn-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate QR Code
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Table className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Table QR Codes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {barcodes.filter(b => b.type === 'table').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <Coffee className="h-6 w-6 text-warning-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Counter QR Codes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {barcodes.filter(b => b.type === 'counter').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-100 rounded-lg">
                  <Utensils className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Menu QR Codes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {barcodes.filter(b => b.type === 'menu').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barcodes Grid */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Generated QR Codes</h3>
          </div>
          <div className="card-content">
            {barcodes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {barcodes.map((barcode) => (
                  <div key={barcode.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getBarcodeIcon(barcode.type)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {barcode.identifier || `${barcode.type} QR Code`}
                          </p>
                          {getBarcodeTypeBadge(barcode.type)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(barcode.id)}
                        className="text-gray-400 hover:text-error-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* QR Code Placeholder */}
                    <div className="bg-gray-100 rounded-lg p-8 mb-3 flex items-center justify-center">
                      <QrCode className="h-16 w-16 text-gray-400" />
                    </div>

                    {/* Code */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-1">Code</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                          {barcode.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(barcode.code)}
                          className="p-1 text-gray-400 hover:text-primary-600"
                        >
                          {copiedCode === barcode.code ? (
                            <Check className="h-4 w-4 text-success-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadQRCode(barcode)}
                        className="btn-sm btn-secondary flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No QR codes generated yet</p>
                <button
                  onClick={() => setShowBarcodeModal(true)}
                  className="btn-primary btn-sm mt-2"
                >
                  Generate First QR Code
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Generate Barcode Modal */}
        {showBarcodeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Generate QR Code
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR Code Type
                    </label>
                    <select
                      required
                      className="input"
                      value={barcodeForm.type}
                      onChange={(e) => setBarcodeForm(prev => ({ 
                        ...prev, 
                        type: e.target.value as 'table' | 'counter' | 'menu',
                        identifier: '',
                        quantity: 1
                      }))}
                    >
                      <option value="table">Table QR Code</option>
                      <option value="counter">Counter QR Code</option>
                      <option value="menu">Menu QR Code</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {barcodeForm.type === 'table' && 'For customer tables - allows ordering from table'}
                      {barcodeForm.type === 'counter' && 'For pickup counters or golf course locations'}
                      {barcodeForm.type === 'menu' && 'For general menu access without table assignment'}
                    </p>
                  </div>

                  {barcodeForm.type === 'table' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Tables
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        className="input"
                        value={barcodeForm.quantity}
                        onChange={(e) => setBarcodeForm(prev => ({ 
                          ...prev, 
                          quantity: Number(e.target.value) 
                        }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This will create QR codes for Table 1, Table 2, etc.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Identifier (Optional)
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder={
                          barcodeForm.type === 'counter' 
                            ? 'e.g., Golf Course Counter, Bar Counter' 
                            : 'e.g., Main Menu, Drinks Menu'
                        }
                        value={barcodeForm.identifier}
                        onChange={(e) => setBarcodeForm(prev => ({ 
                          ...prev, 
                          identifier: e.target.value 
                        }))}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowBarcodeModal(false)}
                      className="btn-secondary btn-md flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary btn-md flex-1"
                    >
                      Generate
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}