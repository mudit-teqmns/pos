// Export all services for easy importing
export { AuthService } from './authService'
export { KitchenOwnerService } from './kitchenOwnerService'
export { RestaurantService } from './restaurantService'
export { RevenueCenterService } from './revenueCenterService'
export { MenuService } from './menuService'
export { OrderService } from './orderService'
export { StaffService } from './staffService'
export { CustomerService } from './customerService'
export { BarcodeService } from './barcodeService'
export { PaymentService } from './paymentService'
export { BusinessHoursService } from './businessHoursService'
export { ReportService } from './reportService'

// Service types
export type {
  CreateKitchenOwnerData,
} from './kitchenOwnerService'

export type {
  CreateRestaurantData,
} from './restaurantService'

export type {
  CreateRevenueCenterData,
} from './revenueCenterService'

export type {
  CreateMenuCategoryData,
  CreateMenuItemData,
  CreateComboMealData,
  CreateDailyDealData,
} from './menuService'

export type {
  CreateOrderData,
  CreateOrderItemData,
  OrderFilters,
} from './orderService'

export type {
  CreateStaffData,
  StaffAssignment,
} from './staffService'

export type {
  CreateCustomerData,
  CustomerFilters,
} from './customerService'

export type {
  CreateBarcodeData,
  BarcodeFilters,
} from './barcodeService'

export type {
  CreatePaymentData,
  PaymentFilters,
} from './paymentService'

export type {
  CreateBusinessHourData,
} from './businessHoursService'

export type {
  ReportFilters,
  SalesReport,
} from './reportService'