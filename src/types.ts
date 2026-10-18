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
  originalPrice?: number;
  discountPercentage?: number;
  stockQuantity?: number; // Alias rétrocompatible
  quantityAvailable?: number; // Quantité disponible en stock réel
  lowStockAlertThreshold?: number; // Alias rétrocompatible
  alertThreshold?: number; // Seuil d'alerte rupture / stock critique
  purchasePrice?: number; // Prix d'achat pour calcul de marge
  batches?: StockBatch[]; // Lots actifs
  batchHistory?: StockBatch[]; // Historique complet des lots et péremptions
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
  discountPercent?: number;
  savings?: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
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
  deliveryAddress: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  notes?: string;
  deliveryMode: 'livraison' | 'retrait';
  paymentMethod: 'especes' | 'airtel_money' | 'moov_money' | 'virement';
  mobilePayment?: MobilePaymentDetails;
  coordinates?: Coordinates;
  googleMapsUrl?: string;
  city?: string;
  deliveryFee?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variant: string;
  category?: string;
  price: number;
  quantity: number;
  total: number;
  isQuote: boolean;
  discountPercent?: number;
  savings?: number;
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
  mobilePayment?: MobilePaymentDetails;
  deliveryStage?: DeliveryStage;
  courier?: CourierInfo;
  deliveryZone?: string;
  deliveryEstimated?: string;
  deliveryFee?: number;
  lastWhatsAppNotifiedStage?: string;
  installments?: PaymentInstallment[];
  amountPaid?: number;
  deliveryProof?: {
    signatureUrl?: string;
    photoUrl?: string;
    receivedBy?: string;
    timestamp?: string;
  };
  isPartialDelivery?: boolean;
  partialDeliveryNotes?: string;
  invoices?: InvoiceRecord[];
}

export type ClientAccountStatus = 'actif' | 'en_attente' | 'suspendu' | 'bloque';
export type PaymentTerms = 'comptant' | '30_jours' | '60_jours' | 'acompte_solde';

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
  accountStatus?: ClientAccountStatus;
  creditLimit?: number; // Plafond de crédit accordé en FCFA
  paymentTerms?: PaymentTerms;
  outstandingBalance?: number; // Encours total impayé
  overdueDays?: number; // Ancienneté des impayés en jours
  isMergedInto?: string; // ID du compte principal si fusionné
  notes?: string;
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

// -------------------------------------------------------------
// NOUVEAUX TYPES ENTERPRISE : AUDIT, STOCKS, FINANCES, PARAMÈTRES
// -------------------------------------------------------------

export type AuditActionType =
  | 'statut_commande'
  | 'validation_paiement'
  | 'modification_prix'
  | 'suppression_produit'
  | 'creation_produit'
  | 'annulation_commande'
  | 'export_donnees'
  | 'import_donnees'
  | 'mouvement_stock'
  | 'reappro_fournisseur'
  | 'statut_client'
  | 'fusion_client'
  | 'modification_parametres'
  | 'creation_pack'
  | 'suppression_pack';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: AppRole;
  actionType: AuditActionType;
  targetEntity: string;
  targetId: string;
  deviceInfo: string;
  details: string;
  previousState?: string;
  newState?: string;
}

export interface StockBatch {
  id: string;
  productId: string;
  lotNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  initialQuantity?: number;
  purchasePrice: number;
  supplierName?: string;
  receivedDate: string;
  notes?: string;
  isArchived?: boolean;
}

export type StockMovementType = 
  | 'entree' 
  | 'sortie' 
  | 'sortie_commande' 
  | 'perte' 
  | 'perte_casse' 
  | 'inventaire' 
  | 'retour_client';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  lotNumber?: string;
  type: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  date: string;
  performedBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  country: string;
  leadTimeDays: number;
}

export interface PurchaseOrder {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  status: 'Brouillon' | 'Commandé' | 'Reçu' | 'Annulé';
  items: {
    productId: string;
    productName: string;
    quantity: number;
    purchaseUnitPrice: number;
  }[];
  totalAmount: number;
  expectedDate?: string;
}

export interface PaymentInstallment {
  id: string;
  type: 'acompte' | 'solde' | 'unique';
  amount: number;
  paymentMethod: 'especes' | 'airtel_money' | 'moov_money' | 'virement';
  transactionReference?: string;
  status: 'en_attente' | 'valide' | 'rejete';
  paidAt: string;
  validatedBy?: string;
  notes?: string;
}

export interface InvoiceRecord {
  id: string;
  orderId: string;
  orderReference: string;
  type: 'facture' | 'avoir';
  number: string; // FAC-2026-0001 ou AVOIR-2026-0001
  issueDate: string;
  clientFacilityName: string;
  tvaRate: number; // 0 ou 0.18
  tvaAmount: number;
  totalHT: number;
  totalTTC: number;
  reason?: string; // pour les avoirs / retours
  isCreditRefunded?: boolean;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  matricule: string;
  active: boolean;
  assignedOrdersCount: number;
}

export interface SystemPromoCode {
  code: string;
  discountPercentage: number;
  validUntil: string;
  minOrderAmount?: number;
  active: boolean;
}

export interface ClientCustomPrice {
  clientId: string;
  productId: string;
  customPrice: number;
}

export interface DeliveryZoneConfig {
  id: string;
  name: string;
  fee: number;
  delayHours: number;
  active: boolean;
}

export interface VolumeDiscountTier {
  minQuantity: number;
  discountPercentage: number;
}

export interface SystemSettings {
  minOrderAmount: number;
  openingHours: string;
  whatsappPrimaryPhone: string;
  whatsappSecondaryPhone: string;
  airtelMerchantPhone: string;
  moovMerchantPhone: string;
  deliveryZones: DeliveryZoneConfig[];
  volumeDiscounts: VolumeDiscountTier[];
  promoCodes: SystemPromoCode[];
  customPrices: ClientCustomPrice[];
  whatsappTemplates: {
    orderConfirmation: string;
    inTransit: string;
    delivered: string;
    reminderInactive: string;
  };
  pdfHeaderInfo: {
    companyName: string;
    legalNotice: string;
    rccm: string;
    nif: string;
    address: string;
    phone: string;
  };
}

