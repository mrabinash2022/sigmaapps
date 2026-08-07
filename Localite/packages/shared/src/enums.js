export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

export const UserAccountStatus = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  ON_HOLD: 'on_hold',
};

export const ShopStatus = {
  INVITED: 'invited',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const ShopOperationalStatus = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  ON_HOLD: 'on_hold',
};

export const ShopCategory = {
  SWEETS: 'Sweets',
  MEDICINES: 'Medicines',
  VEGETABLES: 'Vegetables',
  BAKERY: 'Bakery',
  GROCERY: 'Grocery',
  FLOWERS: 'Flowers',
  NURSERY: 'Nursery',
};

export const CatalogPublishStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
};

export const OrderType = {
  TEXT_LIST: 'Text_List',
  IMAGE_SCAN: 'Image_Scan',
  CATALOG: 'Catalog',
};

export const OrderStatus = {
  CREATED: 'Created',
  ACCEPTED: 'Accepted',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  RETURNED: 'Returned',
  BACKORDER_WAITING: 'Backorder_Waiting',
};

export const PaymentMethod = {
  UPI_INSTANT: 'UPI_Instant',
  CASH_ON_DELIVERY: 'Cash_On_Delivery',
};

export const PaymentStatus = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  NOT_REQUIRED: 'Not_Required',
  REFUND_PENDING: 'Refund_Pending',
  REFUNDED: 'Refunded',
};

export const TicketIssueType = {
  DELIVERY_INSTRUCTION: 'Delivery_Instruction',
  WRONG_ITEM: 'Wrong_Item',
  DAMAGED_PRODUCT: 'Damaged_Product',
  DELAYED_DELIVERY: 'Delayed_Delivery',
  OTHER: 'Other',
};

export const TicketStatus = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
};

export const ORDER_TRANSITIONS = {
  [OrderStatus.CREATED]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
  [OrderStatus.ACCEPTED]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.RETURNED]: [],
  [OrderStatus.BACKORDER_WAITING]: [OrderStatus.ACCEPTED, OrderStatus.REJECTED],
};

export const OfferScope = {
  SHOP: 'shop',
  PLATFORM: 'platform',
};

export const OfferAudience = {
  CUSTOMERS: 'customers',
  SHOPKEEPERS: 'shopkeepers',
  ALL: 'all',
};

export const DiscountType = {
  PERCENT: 'percent',
  FLAT: 'flat',
  TEXT: 'text',
};

export const AnnouncementAudience = {
  SHOPKEEPERS: 'shopkeepers',
  CUSTOMERS: 'customers',
  ALL: 'all',
};
