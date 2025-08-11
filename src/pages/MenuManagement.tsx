import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Eye,
  EyeOff,
  Image as ImageIcon
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

interface MenuCategory {
  id: string
  name: string
  description?: string
  revenue_center_id: string
  is_active: boolean
  sort_order: number
  revenue_centers: {
    name: string
    type: string
  }
}

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  is_available: boolean
  category_id: string
  preparation_time: number
  menu_categories: {
    name: string
  }
}

export default function MenuManagement() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [revenueCenters, setRevenueCenters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    revenue_center_id: '',
    sort_order: 0
  })

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    preparation_time: '15',
    image_url: ''
  })

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch revenue centers
      const { data: centers, error: centersError } = await supabase
        .from('revenue_centers')
        .select('*')
        .eq('restaurant_id', user?.restaurant_id)
        .eq('is_active', true)

      if (centersError) throw centersError

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select(`
          *,
          revenue_centers (name, type)
        `)
        .eq('restaurant_id', user?.restaurant_id)
        .order('sort_order')

      if (categoriesError) throw categoriesError

      // Fetch menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories (name)
        `)
        .eq('restaurant_id', user?.restaurant_id)
        .order('sort_order')

      if (itemsError) throw itemsError

      setRevenueCenters(centers || [])
      setCategories(categoriesData || [])
      setMenuItems(itemsData || [])

    } catch (error) {
      console.error('Error fetching menu data:', error)
      toast.error('Failed to load menu data')
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const categoryData = {
        ...categoryForm,
        restaurant_id: user?.restaurant_id,
        sort_order: Number(categoryForm.sort_order)
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('menu_categories')
          .update(categoryData)
          .eq('id', editingCategory.id)

        if (error) throw error
        toast.success('Category updated successfully')
      } else {
        const { error } = await supabase
          .from('menu_categories')
          .insert(categoryData)

        if (error) throw error
        toast.success('Category created successfully')
      }

      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryForm({
        name: '',
        description: '',
        revenue_center_id: '',
        sort_order: 0
      })
      fetchData()

    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Failed to save category')
    }
  }

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const itemData = {
        ...itemForm,
        restaurant_id: user?.restaurant_id,
        price: Number(itemForm.price),
        preparation_time: Number(itemForm.preparation_time)
      }

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id)

        if (error) throw error
        toast.success('Menu item updated successfully')
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData)

        if (error) throw error
        toast.success('Menu item created successfully')
      }

      setShowItemModal(false)
      setEditingItem(null)
      setItemForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        preparation_time: '15',
        image_url: ''
      })
      fetchData()

    } catch (error: any) {
      console.error('Error saving menu item:', error)
      toast.error(error.message || 'Failed to save menu item')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? All menu items in this category will also be deleted.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error
      toast.success('Category deleted successfully')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast.error(error.message || 'Failed to delete category')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      toast.success('Menu item deleted successfully')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting menu item:', error)
      toast.error(error.message || 'Failed to delete menu item')
    }
  }

  const toggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', itemId)

      if (error) throw error
      toast.success(`Menu item ${!currentStatus ? 'enabled' : 'disabled'} successfully`)
      fetchData()
    } catch (error: any) {
      console.error('Error updating item availability:', error)
      toast.error(error.message || 'Failed to update item availability')
    }
  }

  const openCategoryModal = (category?: MenuCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        revenue_center_id: category.revenue_center_id,
        sort_order: category.sort_order
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({
        name: '',
        description: '',
        revenue_center_id: '',
        sort_order: 0
      })
    }
    setShowCategoryModal(true)
  }

  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
      setItemForm({
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        category_id: item.category_id,
        preparation_time: item.preparation_time.toString(),
        image_url: item.image_url || ''
      })
    } else {
      setEditingItem(null)
      setItemForm({
        name: '',
        description: '',
        price: '',
        category_id: '',
        preparation_time: '15',
        image_url: ''
      })
    }
    setShowItemModal(true)
  }

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

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
            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-gray-600">Manage your restaurant and bar menus</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => openCategoryModal()}
              className="btn-secondary btn-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </button>
            <button
              onClick={() => openItemModal()}
              className="btn-primary btn-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </button>
          </div>
        </div>

        {/* Categories Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Menu Categories</h3>
          </div>
          <div className="card-content">
            {categories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {category.revenue_centers.name} ({category.revenue_centers.type})
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openCategoryModal(category)}
                          className="p-1 text-gray-400 hover:text-primary-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1 text-gray-400 hover:text-error-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`badge ${category.is_active ? 'badge-success' : 'badge-gray'}`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Order: {category.sort_order}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No categories created yet</p>
                <button
                  onClick={() => openCategoryModal()}
                  className="btn-primary btn-sm mt-2"
                >
                  Create First Category
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items Section */}
        <div className="card">
          <div className="card-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Menu Items</h3>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    className="input pl-10 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="input w-48"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="card-content">
            {filteredItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Prep Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              {item.description && (
                                <p className="text-sm text-gray-600 truncate max-w-xs">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{item.menu_categories.name}</td>
                        <td className="font-medium">${item.price.toFixed(2)}</td>
                        <td>{item.preparation_time} min</td>
                        <td>
                          <button
                            onClick={() => toggleItemAvailability(item.id, item.is_available)}
                            className={`badge ${item.is_available ? 'badge-success' : 'badge-error'} cursor-pointer`}
                          >
                            {item.is_available ? (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Available
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Unavailable
                              </>
                            )}
                          </button>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openItemModal(item)}
                              className="btn-sm btn-secondary"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="btn-sm btn-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {searchTerm || selectedCategory ? 'No items match your filters' : 'No menu items created yet'}
                </p>
                {!searchTerm && !selectedCategory && (
                  <button
                    onClick={() => openItemModal()}
                    className="btn-primary btn-sm mt-2"
                  >
                    Create First Menu Item
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Revenue Center
                    </label>
                    <select
                      required
                      className="input"
                      value={categoryForm.revenue_center_id}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, revenue_center_id: e.target.value }))}
                    >
                      <option value="">Select Revenue Center</option>
                      {revenueCenters.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name} ({center.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={categoryForm.sort_order}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(false)}
                      className="btn-secondary btn-md flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary btn-md flex-1"
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Item Modal */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </h3>
                <form onSubmit={handleItemSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={itemForm.name}
                      onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      value={itemForm.description}
                      onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      required
                      className="input"
                      value={itemForm.category_id}
                      onChange={(e) => setItemForm(prev => ({ ...prev, category_id: e.target.value }))}
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        className="input"
                        value={itemForm.price}
                        onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prep Time (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="input"
                        value={itemForm.preparation_time}
                        onChange={(e) => setItemForm(prev => ({ ...prev, preparation_time: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL
                    </label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://example.com/image.jpg"
                      value={itemForm.image_url}
                      onChange={(e) => setItemForm(prev => ({ ...prev, image_url: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowItemModal(false)}
                      className="btn-secondary btn-md flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary btn-md flex-1"
                    >
                      {editingItem ? 'Update' : 'Create'}
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