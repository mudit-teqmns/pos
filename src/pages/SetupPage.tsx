import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Store, MapPin, Phone, Globe } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function SetupPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
    domain_name: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [domainChecking, setDomainChecking] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const checkDomainAvailability = async (domain: string) => {
    if (!domain) return true

    setDomainChecking(true)
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('domain_name', domain)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return !data // Domain is available if no data found
    } catch (error) {
      console.error('Error checking domain:', error)
      return false
    } finally {
      setDomainChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Check domain availability
      const isDomainAvailable = await checkDomainAvailability(formData.domain_name)
      if (!isDomainAvailable) {
        toast.error('Domain name is already taken. Please choose a different one.')
        setIsLoading(false)
        return
      }

      // Get kitchen owner record
      const { data: kitchenOwner, error: ownerError } = await supabase
        .from('kitchen_owners')
        .select('id')
        .eq('email', user?.email)
        .single()

      if (ownerError || !kitchenOwner) {
        throw new Error('Kitchen owner record not found')
      }

      // Create restaurant record
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          owner_id: kitchenOwner.id,
          name: formData.name,
          address: formData.address,
          phone_number: formData.phone_number,
          domain_name: formData.domain_name,
          status: 'active'
        })
        .select()
        .single()

      if (restaurantError) {
        throw restaurantError
      }

      // Update user record with restaurant_id
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ restaurant_id: restaurant.id })
        .eq('id', user?.id)

      if (userUpdateError) {
        throw userUpdateError
      }

      // Mark setup as completed
      const { error: setupError } = await supabase
        .from('kitchen_owners')
        .update({ is_setup_completed: true })
        .eq('id', kitchenOwner.id)

      if (setupError) {
        throw setupError
      }

      // Create default revenue centers
      const revenueCenters = [
        { name: 'Restaurant', type: 'restaurant' },
        { name: 'Bar', type: 'bar' }
      ]

      const { error: centersError } = await supabase
        .from('revenue_centers')
        .insert(
          revenueCenters.map(center => ({
            restaurant_id: restaurant.id,
            name: center.name,
            type: center.type,
            is_active: true
          }))
        )

      if (centersError) {
        console.error('Error creating revenue centers:', centersError)
      }

      // Refresh user data
      await refreshUser()

      toast.success('Restaurant setup completed successfully!')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Setup error:', error)
      toast.error(error.message || 'Failed to complete setup')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg">
              <Store className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Complete Your Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please provide your restaurant details to get started
          </p>
        </div>

        <div className="card">
          <div className="card-content">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Restaurant Name
                  </div>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="input"
                  placeholder="Enter your restaurant name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Restaurant Address
                  </div>
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  required
                  className="input resize-none"
                  placeholder="Enter your complete restaurant address"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </div>
                </label>
                <input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  required
                  className="input"
                  placeholder="Enter your restaurant phone number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="domain_name" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Domain Name
                  </div>
                </label>
                <div className="flex">
                  <input
                    id="domain_name"
                    name="domain_name"
                    type="text"
                    required
                    className="input rounded-r-none"
                    placeholder="yourrestaurant"
                    value={formData.domain_name}
                    onChange={handleChange}
                  />
                  <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    .teetours.com
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This will be your frontend application URL where customers can place orders
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || domainChecking}
                className="btn-primary btn-lg w-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Setting up...</span>
                  </div>
                ) : domainChecking ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Checking domain...</span>
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            You can modify these details later from your dashboard
          </p>
        </div>
      </div>
    </div>
  )
}