export type AppRole = 'client' | 'Super-Admin' | 'Admin simple' | 'Commercial' | 'Gestionnaire Catalogue' | 'Logistique' | 'Secrétaire';

export type FacilityType = 
  | 'Clinique' 
  | 'Polyclinique' 
  | 'Hôpital' 
  | 'Laboratoire' 
  | 'Pharmacie' 
  | 'Cabinet médical' 
  | 'Autre';

export type OrderStatus = 'À confirmer' | 'Confirmée' | 'En préparation' | 'Livrée' | 'Annulée';

export interface ProductSpecifications {
  gauge?: string;
  sterility?: 'Stérile' | 'Non stérile' | 'Usage unique';
  latexFree?: boolean;
  shelfLife?: string;
  material?: string;
  packaging?: string;
  storage?: string;
  recommendedUse?: string;
}

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
  specialty?: string;
  specifications?: ProductSpecifications;
  variants: ProductVariant[];
  status: 'disponible' | 'rupture';
  image?: string;
  thumbnailUrl?: string;
  galleryImages?: string[];
  pdfNoticeUrl?: string;
  pdfNoticeName?: string;
  description?: string;
  isPromotion?: boolean;
  isQuote?: boolean;
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;
  quantityAvailable?: number;
  stockQuantity?: number;
  alertThreshold?: number;
  lowStockAlertThreshold?: number;
  purchasePrice?: number;
  /** True only after an authorized operator explicitly confirms the recorded cost. */
  purchasePriceVerified?: boolean;
  hasPhysicalStock?: boolean;
}

export interface PackItem {
  productId?: string;
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
  isDeferredStock?: boolean;
  discountPercent?: number;
  savings?: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  source?: 'checkout' | 'neighborhood';
}

export interface MobilePaymentDetails {
  provider: 'airtel_money' | 'moov_money';
  merchantPhone: string;
  transactionReference?: string;
  senderPhone?: string;
  isPrePaid?: boolean;
  validatedAt?: string;
  screenshotUrl?: string;
  status?: 'pending' | 'submitted' | 'verified' | 'failed';
  amount?: number;
  ussdDialCode?: string;
  operatorNotes?: string;
}

export interface CustomerInfo {
  facilityName: string;
  facilityType?: FacilityType;
  facilityTypeOther?: string;
  contactName: string;
  phone: string;
  secondaryPhone?: string;
  deliveryAddress: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  notes?: string;
  deliveryMode: 'livraison' | 'retrait';
  paymentMethod: 'especes' | 'airtel_money' | 'moov_money' | 'virement' | 'cheque' | 'en_compte';
  mobilePayment?: MobilePaymentDetails;
  coordinates?: Coordinates;
  googleMapsUrl?: string;
  city?: string;
  deliveryFee?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  category?: string;
  variant: string;
  price: number;
  quantity: number;
  total: number;
  isQuote: boolean;
  isDeferredStock?: boolean;
  discountPercent?: number;
  savings?: number;
}

export type DeliveryStage = 'preparation' | 'picked_up' | 'in_transit' | 'delivered';

export interface CourierInfo {
  courierId?: string;
  name: string;
  phone: string;
  vehicle: string;
  matricule: string;
  currentZone?: string;
  estimatedTime?: string;
}

export interface Courier extends CourierInfo {
  id: string;
  active: boolean;
  assignedOrdersCount?: number;
}

export interface PaymentInstallment {
  id: string;
  type: 'acompte' | 'solde';
  amount: number;
  paymentMethod: 'especes' | 'airtel_money' | 'moov_money' | 'virement' | 'cheque';
  transactionReference?: string;
  status: 'en_attente' | 'valide' | 'rejete';
  paidAt: string;
  validatedBy?: string;
}

export type CollectionReminderChannel = 'telephone' | 'whatsapp' | 'sms' | 'email' | 'site' | 'visite' | 'autre';
export type CollectionReminderOutcome =
  | 'client_joint'
  | 'message_envoye'
  | 'message_prepare'
  | 'sans_reponse'
  | 'promesse_paiement'
  | 'contestation'
  | 'autre';

export interface CollectionReminder {
  id: string;
  orderId: string;
  orderReference: string;
  clientId?: string;
  clientName: string;
  occurredAt: string;
  channel: CollectionReminderChannel;
  outcome: CollectionReminderOutcome;
  notes?: string;
  nextFollowUpDate?: string;
  recordedById: string;
  recordedByName: string;
  recordedByRole: AppRole;
}

export interface InvoiceRecord {
  id: string;
  orderId: string;
  orderReference: string;
  type: 'facture' | 'avoir';
  number: string;
  issueDate: string;
  clientFacilityName: string;
  tvaRate: number;
  tvaAmount: number;
  totalHT: number;
  totalTTC: number;
  reason?: string;
}

export interface DeliveryProof {
  receivedBy: string;
  receiptReference?: string;
  signatureUrl?: string;
  photoUrl?: string;
  timestamp: string;
}

export interface DeliveryLocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
}

export interface CourierTrackingInfo {
  orderReference: string;
  courierName: string;
  facilityName: string;
  deliveryAddress: string;
  neighborhoodName?: string;
  destinationCoordinates?: {
    lat: number;
    lng: number;
  };
  contactName: string;
  contactPhone: string;
  expiresAt: string;
}

export interface OrderDraft {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
  customerInfo: Partial<CustomerInfo>;
  notes?: string;
  status: 'offline_saved' | 'ready_to_sync' | 'synced';
  totalAmount: number;
  itemsCount: number;
  autoSaved?: boolean;
}

export interface Order {
  id: string;
  reference: string; // GP-2026-00001
  idempotencyKey?: string;
  createdAt: string;
  userId?: string;
  createdByUserId?: string;
  createdByName?: string;
  createdByRole?: AppRole;
  customer: CustomerInfo;
  items: OrderItem[];
  estimatedTotal: number;
  hasQuoteItems: boolean;
  status: OrderStatus;
  cancellationReason?: string;
  isPaid: boolean;
  amountPaid?: number;
  collectionDueDate?: string;
  installments?: PaymentInstallment[];
  invoices?: InvoiceRecord[];
  deliveryProof?: DeliveryProof;
  isPartialDelivery?: boolean;
  partialDeliveryNotes?: string;
  pdfUrl?: string;
  assignedCommercialId?: string;
  mobilePayment?: MobilePaymentDetails;
  deliveryStage?: DeliveryStage;
  stockReserved?: boolean;
  courier?: CourierInfo;
  courierTrackingToken?: string;
  courierTrackingExpiresAt?: string;
  deliveryZone?: string;
  deliveryEstimated?: string;
  expectedDeliveryDate?: string;
  expectedDeliverySlot?: string;
  deliveryFee?: number;
  lastWhatsAppNotifiedStage?: string;
  whatsappLogs?: WhatsAppNotificationLog[];
}

export interface WhatsAppNotificationLog {
  id: string;
  stage: DeliveryStage;
  stageLabel: string;
  recipientRole: 'client' | 'coursier';
  recipientPhone: string;
  recipientName: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'failed';
  messagePreview: string;
  triggeredBy: string;
}

export type JobTitle = 'directeur' | 'docteur' | 'charge_commandes' | 'pharmacien' | 'autre';
export type DirectorApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ClientAccountStatus = 'actif' | 'en_attente' | 'suspendu' | 'bloque';
export type PaymentTerms = 'comptant' | '15_jours' | '30_jours' | '60_jours' | 'acompte_solde';

export interface HealthcareStructure {
  id: string;
  name: string;
  type: FacilityType;
  maxAccounts: number;
  city: string;
  deliveryAddress?: string;
  createdAt: string;
  directorName?: string;
  directorPhone?: string;
  directorUserId?: string;
}

export interface StockBatch {
  id: string;
  productId: string;
  productName?: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  initialQuantity?: number;
  quantityRemaining?: number;
  quantityDestroyed?: number;
  purchasePrice?: number;
  supplierName?: string;
  supplierReference?: string;
  receivedDate: string;
  receivedBy?: string;
  receivedById?: string;
  status?: 'disponible' | 'quarantaine' | 'perime' | 'detruit';
  statusReason?: string;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  isArchived?: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  lotNumber?: string;
  reference?: string;
  type: 'entree' | 'sortie_commande' | 'perte_casse' | 'ajustement' | 'retour';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  date: string;
  performedBy: string;
  performedById?: string;
  performedByRole?: AppRole;
}

export type OperatingExpenseCategory =
  | 'transport'
  | 'loyer'
  | 'salaires'
  | 'communication'
  | 'fournitures'
  | 'frais_bancaires'
  | 'autre';

export interface OperatingExpense {
  id: string;
  date: string;
  category: OperatingExpenseCategory;
  description: string;
  amount: number;
  paymentMethod?: string;
  supplier?: string;
  reference?: string;
  status: 'active' | 'annulee';
  recordedById: string;
  recordedByName: string;
  createdAt: string;
  voidedAt?: string;
  voidedById?: string;
  voidedByName?: string;
  voidReason?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  country: string;
  leadTimeDays?: number;
}

export interface PurchaseOrder {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  expectedDeliveryDate?: string;
  status: 'brouillon' | 'commande' | 'recu' | 'annule';
  items: { productId: string; productName: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
}

export interface User {
  id: string;
  phone: string;
  secondaryPhone?: string;
  facilityName: string;
  contactName?: string;
  facilityType?: FacilityType;
  facilityTypeOther?: string;
  role: AppRole;
  createdAt: string;
  email?: string;
  avatarUrl?: string;
  authProvider?: 'credentials' | 'google';
  jobTitle?: JobTitle;
  directorApprovalStatus?: DirectorApprovalStatus;
  structureId?: string;
  accountStatus?: ClientAccountStatus;
  creditLimit?: number;
  minimumCreditOrderAmount?: number;
  outstandingBalance?: number;
  paymentTerms?: PaymentTerms;
  notes?: string;
  isMergedInto?: string;
  assignedToCommercialId?: string;
  assignedToCommercialName?: string;
  coordinates?: Coordinates;
  deliveryAddress?: string;
  neighborhoodId?: string;
  deliveryInstructions?: string;
  googleMapsUrl?: string;
  lastActiveAt?: string;
  lastOrderDate?: string;
  totalOrdersCount?: number;
  totalSpent?: number;
  permissions?: StaffPermission[];
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
  senderRole?: AppRole;
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
  type: 'order_created' | 'status_changed' | 'payment_updated' | 'quote_created' | 'inactivity_reminder' | 'admin_message' | 'promotion' | 'password_recovery';
  title?: string;
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

export type StaffPermission =
  /** Legacy aggregate grant. Expanded to individual catalogue/stock permissions on load. */
  | 'catalog_stock'
  | 'catalog_view'
  | 'catalog_manage'
  | 'packs_manage'
  | 'stock_view'
  | 'stock_receive'
  | 'stock_adjust'
  | 'stock_batches_manage'
  | 'stock_availability_manage'
  | 'stock_costs_view'
  | 'stock_costs_manage'
  | 'stock_export'
  | 'orders_view'
  | 'orders_create_for_client'
  /** Legacy aggregate grant. Expanded to individual order/finance permissions on load. */
  | 'orders_manage'
  | 'orders_confirm'
  | 'orders_cancel'
  /** Legacy combined status grant. */
  | 'orders_status_manage'
  | 'orders_finance_view'
  | 'orders_finance_manage'
  | 'payments_manage'
  | 'quotes_view'
  | 'quotes_manage'
  | 'clients_view'
  | 'clients_manage'
  | 'clients_credit_manage'
  | 'messages_view'
  | 'messages_send'
  | 'campaigns_manage'
  | 'logistics_view'
  | 'logistics_manage'
  | 'receivables_view'
  | 'receivables_payments_manage'
  | 'receivables_reminders_manage'
  | 'finance_view'
  | 'expenses_manage'
  | 'stats_view'
  | 'audit_view'
  | 'settings_manage';

export interface VolumeDiscountSettings {
  enabled: boolean;
  tier1Qty: number;
  tier1Percent: number;
  tier2Qty: number;
  tier2Percent: number;
  tier3Qty: number;
  tier3Percent: number;
}

export interface StaffActivityStats {
  ordersProcessed: number;
  quotesManaged: number;
  deliveriesHandled: number;
  lastLoginAt?: string;
}

export type StaffLogCategory = 'stock_price' | 'orders' | 'finance' | 'access' | 'system';

export type StaffLogSeverity = 'info' | 'warning' | 'critical';

export interface StaffActivityLog {
  id: string;
  userId: string;
  actionType: string;
  entityType: 'product' | 'order' | 'staff' | 'settings' | 'quote' | 'client' | string;
  entityId: string;
  details: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: AppRole;
  category: StaffLogCategory;
  severity: StaffLogSeverity;
  actionLabel: string;
  targetType: 'product' | 'order' | 'staff' | 'settings' | 'quote' | 'expense';
  targetId?: string;
  targetLabel: string;
  previousValue?: string;
  newValue?: string;
}

export interface ClientPurchasedProductSummary {
  productId: string;
  productName: string;
  variant: string;
  totalQuantity: number;
  totalRevenue: number;
  ordersCount: number;
  lastPurchasedAt: string;
}

export interface ClientPurchaseHistoryRecord {
  clientId: string;
  facilityName: string;
  facilityType: FacilityType | string;
  contactName: string;
  phone: string;
  deliveryAddress: string;
  totalOrdersCount: number;
  totalSpent: number;
  paidAmount: number;
  unpaidAmount: number;
  averageOrderValue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  isInactive10Days: boolean;
  orders: Order[];
  purchasedProducts: ClientPurchasedProductSummary[];
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
  volumeDiscounts?: VolumeDiscountSettings;
}



