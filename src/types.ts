export type AppRole = 'client' | 'Super-Admin' | 'Commercial' | 'Gestionnaire Catalogue' | 'Logistique';

export type FacilityType = 
  | 'Clinique' 
  | 'Polyclinique' 
  | 'Hôpital' 
  | 'Laboratoire' 
  | 'Pharmacie' 
  | 'Cabinet médical' 
  | 'Autre';

export type OrderStatus = 'À confirmer' | 'Confirmée' | 'En préparation' | 'Livrée' | 'Annulée';

export interface ProductVariant {
  label: string;
  price: number; // 0 means "Sur devis"
  originalPrice?: number;
  discountPercentage?: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  variants: ProductVariant[];
  status: 'disponible' | 'rupture';
  image?: string;
  thumbnailUrl?: string;
  galleryImages?: string[];
  pdfNoticeUrl?: string;
  pdfNoticeName?: string;
  description?: string;
  isPromotion?: boolean;
  originalPrice?: number;
  discountPercentage?: number;
}

export interface PackItem {
  productName: string;
  variant?: string;
  quantity: number;
}

export interface Pack {
  id: string;
  title: string;
  description: string;
  price: number;
  items: PackItem[];
  image: string;
  thumbnailUrl?: string;
  endDate?: string;
  active: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  category: string;
  variant: string;
  price: number; // 0 = sur devis
  quantity: number;
  isQuote: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CustomerInfo {
  facilityName: string;
  facilityType?: FacilityType;
  facilityTypeOther?: string;
  contactName: string;
  phone: string;
  deliveryAddress: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  notes?: string;
  deliveryMode: 'livraison' | 'retrait';
  paymentMethod: 'especes' | 'airtel_money' | 'moov_money' | 'virement';
  coordinates?: Coordinates;
  googleMapsUrl?: string;
  city?: string;
  deliveryFee?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variant: string;
  price: number;
  quantity: number;
  total: number;
  isQuote: boolean;
}

export type DeliveryStage = 'preparation' | 'picked_up' | 'in_transit' | 'delivered';

export interface CourierInfo {
  name: string;
  phone: string;
  vehicle: string;
  matricule: string;
  currentZone?: string;
  estimatedTime?: string;
}

export interface Order {
  id: string;
  reference: string; // GP-2026-00001
  createdAt: string;
  userId?: string;
  customer: CustomerInfo;
  items: OrderItem[];
  estimatedTotal: number;
  hasQuoteItems: boolean;
  status: OrderStatus;
  cancellationReason?: string;
  isPaid: boolean;
  pdfUrl?: string;
  assignedCommercialId?: string;
  deliveryStage?: DeliveryStage;
  courier?: CourierInfo;
  deliveryZone?: string;
  deliveryEstimated?: string;
  deliveryFee?: number;
  lastWhatsAppNotifiedStage?: string;
}

export interface User {
  id: string;
  phone: string;
  facilityName: string;
  contactName?: string;
  facilityType?: FacilityType;
  facilityTypeOther?: string;
  role: AppRole;
  createdAt: string;
  assignedToCommercialId?: string;
  assignedToCommercialName?: string;
  coordinates?: Coordinates;
  deliveryAddress?: string;
  googleMapsUrl?: string;
  lastActiveAt?: string;
  lastOrderDate?: string;
  totalOrdersCount?: number;
  totalSpent?: number;
}

export interface CommercialQuote {
  id: string;
  reference: string; // DEV-2026-0001
  createdAt: string;
  validUntil: string;
  commercialId: string;
  commercialName: string;
  customerId: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  discountType: 'percent' | 'amount';
  discountValue: number;
  discountAmount: number;
  finalTotal: number;
  status: 'Brouillon' | 'Transmis' | 'Accepté' | 'Refusé';
  notes?: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  url: string;
  thumbnailUrl: string;
  uploadedBy?: string;
  createdAt: string;
  tags?: string[];
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  recipientFacilityName?: string;
  recipientPhone?: string;
  subject: string;
  content: string;
  channel: 'in_app' | 'whatsapp' | 'both';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  timestamp: string;
  type: 'order_created' | 'status_changed' | 'payment_updated' | 'quote_created' | 'inactivity_reminder' | 'admin_message' | 'promotion';
  orderId?: string;
  orderReference?: string;
  message: string;
  userId?: string;
  targetRole: AppRole | 'all';
  read?: boolean;
  actionUrl?: string;
  productId?: string;
  discountBadge?: string;
}

export interface ClientPurchaseStats {
  clientId: string;
  facilityName: string;
  contactName: string;
  phone: string;
  facilityType: FacilityType;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  preferredPaymentMethod: string;
  topOrderedProducts: { name: string; quantity: number; revenue: number }[];
  isInactive10Days: boolean;
  orderStatusCounts: Record<OrderStatus, number>;
}

export interface AdminStats {
  totalRevenue: number;
  ordersToConfirm: number;
  monthOrdersCount: number;
  averageBasket: number;
  totalClients: number;
  pendingPaymentAmount: number;
  salesLast14Days: { date: string; amount: number; count: number }[];
  ordersByStatus: Record<OrderStatus, number>;
  topProducts: { name: string; quantity: number; revenue: number }[];
  priorityOrders: Order[];
  inactiveClientsCount: number;
  clientPurchases?: ClientPurchaseStats[];
}
