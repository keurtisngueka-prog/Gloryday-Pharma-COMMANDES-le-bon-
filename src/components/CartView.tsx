import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Building2, 
  Phone, 
  MapPin, 
  Truck, 
  FileText,
  AlertTriangle,
  HelpCircle,
  Clock,
  Compass,
  ShieldCheck,
  TrendingDown,
  Download,
  Printer,
  Check,
  Smartphone,
  Copy,
  CreditCard,
  Wifi,
  WifiOff,
  Save
} from 'lucide-react';
import { CartItem, CustomerInfo, User, Order } from '../types';
import { getStoredCustomerInfo, setStoredCustomerInfo } from '../api';
import { 
  LIBREVILLE_ZONE_GROUPS, 
  getNeighborhoodById, 
  detectNeighborhoodFromAddress 
} from '../data/librevilleZones';
import { calculateCartVolumeSummary, calculateItemVolumePrice } from '../utils/volumeDiscount';
import { generateInternalPurchaseOrderPdf } from '../utils/pdfGenerator';
import { MobilePaymentModal } from './MobilePaymentModal';
import { useOnlineStatus } from '../utils/pwa';
import { saveDraft, saveAutoDraft } from '../utils/draftsStorage';

interface CartViewProps {
  items: CartItem[];
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onProceedToPreview: (customerInfo: CustomerInfo) => void;
  onContinueShopping: () => void;
  onOpenDraftsModal?: () => void;
  draftsCount?: number;
  initialCustomerInfo?: Partial<CustomerInfo>;
}

export const CartView: React.FC<CartViewProps> = ({
  items,
  currentUser,
  onOpenAuth,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToPreview,
  onContinueShopping,
  onOpenDraftsModal,
  draftsCount = 0,
  initialCustomerInfo
}) => {
  const isOnline = useOnlineStatus();
  const [draftToast, setDraftToast] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhoodId, setNeighborhoodId] = useState('centre-ville');
  const [deliveryAddress, setDeliveryAddress] = useState('Centre-Ville, Libreville');
  const [addressDetails, setAddressDetails] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'livraison' | 'retrait'>('livraison');
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'airtel_money' | 'moov_money' | 'virement'>('especes');
  const [mobileTransactionRef, setMobileTransactionRef] = useState('');
  const [mobileSenderPhone, setMobileSenderPhone] = useState('');
  const [mobileScreenshotUrl, setMobileScreenshotUrl] = useState<string | undefined>(undefined);
  const [isMobilePaymentPreDone, setIsMobilePaymentPreDone] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.facilityName) setFacilityName(currentUser.facilityName);
      if (currentUser.contactName) setContactName(currentUser.contactName);
      if (currentUser.phone) setPhone(currentUser.phone);
      if (currentUser.deliveryAddress) {
        setDeliveryAddress(currentUser.deliveryAddress);
        const detected = detectNeighborhoodFromAddress(currentUser.deliveryAddress);
        if (detected) setNeighborhoodId(detected.id);
      }
    } else {
      const saved = getStoredCustomerInfo();
      if (saved) {
        if (saved.facilityName) setFacilityName(saved.facilityName);
        if (saved.contactName) setContactName(saved.contactName);
        if (saved.phone) setPhone(saved.phone);
        if (saved.deliveryAddress) setDeliveryAddress(saved.deliveryAddress);
        if (saved.neighborhoodId) setNeighborhoodId(saved.neighborhoodId);
        if (saved.deliveryMode) setDeliveryMode(saved.deliveryMode);
        if (saved.paymentMethod) setPaymentMethod(saved.paymentMethod);
      } else {
        setFacilityName('');
        setContactName('');
        setPhone('');
        setNeighborhoodId('centre-ville');
        setDeliveryAddress('Centre-Ville, Libreville');
      }
    }
  }, [currentUser]);

  // Load from selected draft if provided
  useEffect(() => {
    if (initialCustomerInfo) {
      if (initialCustomerInfo.facilityName) setFacilityName(initialCustomerInfo.facilityName);
      if (initialCustomerInfo.contactName) setContactName(initialCustomerInfo.contactName);
      if (initialCustomerInfo.phone) setPhone(initialCustomerInfo.phone);
      if (initialCustomerInfo.deliveryAddress) setDeliveryAddress(initialCustomerInfo.deliveryAddress);
      if (initialCustomerInfo.neighborhoodId) setNeighborhoodId(initialCustomerInfo.neighborhoodId);
      if (initialCustomerInfo.deliveryMode) setDeliveryMode(initialCustomerInfo.deliveryMode);
      if (initialCustomerInfo.paymentMethod) setPaymentMethod(initialCustomerInfo.paymentMethod);
      if (initialCustomerInfo.notes) setNotes(initialCustomerInfo.notes);
      if (initialCustomerInfo.mobilePayment) {
        if (initialCustomerInfo.mobilePayment.transactionReference) setMobileTransactionRef(initialCustomerInfo.mobilePayment.transactionReference);
        if (initialCustomerInfo.mobilePayment.senderPhone) setMobileSenderPhone(initialCustomerInfo.mobilePayment.senderPhone);
        if (initialCustomerInfo.mobilePayment.screenshotUrl) setMobileScreenshotUrl(initialCustomerInfo.mobilePayment.screenshotUrl);
        setIsMobilePaymentPreDone(!!initialCustomerInfo.mobilePayment.isPrePaid);
      }
    }
  }, [initialCustomerInfo]);

  // Auto-save draft when cart or customer info changes (offline resilience)
  useEffect(() => {
    if (items.length > 0) {
      const timeout = setTimeout(() => {
        saveAutoDraft(items, {
          facilityName,
          contactName,
          phone,
          deliveryAddress,
          neighborhoodId,
          deliveryMode,
          paymentMethod,
          notes
        }, currentUser?.phone);
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [items, facilityName, contactName, phone, deliveryAddress, neighborhoodId, deliveryMode, paymentMethod, notes, currentUser]);

  const handleSaveAsDraft = (customName?: string) => {
    if (items.length === 0) return;
    const nameToUse = customName || (facilityName.trim() ? `Brouillon ${facilityName.trim()}` : `Brouillon du ${new Date().toLocaleDateString('fr-FR')}`);
    saveDraft({
      name: nameToUse,
      items,
      customerInfo: {
        facilityName,
        contactName,
        phone,
        deliveryAddress,
        neighborhoodId,
        deliveryMode,
        paymentMethod,
        notes,
        mobilePayment: (paymentMethod === 'airtel_money' || paymentMethod === 'moov_money') ? {
          provider: paymentMethod,
          merchantPhone: paymentMethod === 'airtel_money' ? '077003004' : '066240399',
          transactionReference: mobileTransactionRef.trim() || undefined,
          senderPhone: mobileSenderPhone.trim() || undefined,
          isPrePaid: isMobilePaymentPreDone,
          screenshotUrl: mobileScreenshotUrl
        } : undefined
      },
      status: 'offline_saved'
    }, currentUser?.phone);

    setDraftToast('Commande enregistrée dans vos brouillons hors-ligne !');
    setTimeout(() => setDraftToast(null), 3500);
  };

  const fixedItems = items.filter(it => !it.isQuote);
  const quoteItems = items.filter(it => it.isQuote);
  const volumeSummary = calculateCartVolumeSummary(items);
  const itemsSubtotal = volumeSummary.netTotal;
  const originalGrossTotal = volumeSummary.grossTotal;
  const totalVolumeSavings = volumeSummary.totalSavings;

  const selectedNeighborhood = getNeighborhoodById(neighborhoodId);
  const deliveryDelayText = deliveryMode === 'retrait' 
    ? 'Prêt sous 20 à 30 min (Dépôt Central Oloumi)'
    : (selectedNeighborhood ? selectedNeighborhood.estimatedText : '45 à 60 minutes');

  // Free delivery for orders >= 50,000 FCFA or for pickup
  const baseDeliveryFee = deliveryMode === 'retrait' ? 0 : (selectedNeighborhood?.baseDeliveryFee || 0);
  const deliveryFee = itemsSubtotal >= 50000 ? 0 : baseDeliveryFee;
  const estimatedTotal = itemsSubtotal + deliveryFee;

  const [isGeneratingVisaPdf, setIsGeneratingVisaPdf] = useState(false);
  const [visaPdfSuccess, setVisaPdfSuccess] = useState(false);

  const handleDownloadInternalVisaOrder = async () => {
    setIsGeneratingVisaPdf(true);
    try {
      const currentCustomer: CustomerInfo = {
        facilityName: facilityName.trim() || 'Clinique Demandeur',
        contactName: contactName.trim() || 'Responsable Achat / Major de Bloc',
        phone: phone.trim() || '+241 77 00 00 00',
        deliveryAddress: deliveryAddress.trim() || 'Libreville, Gabon',
        deliveryMode,
        paymentMethod,
        deliveryFee
      };
      const year = new Date().getFullYear();
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const tempOrder: Order = {
        id: `ord-visa-${Date.now()}`,
        reference: `DEM-INT-${year}-${randNum}`,
        createdAt: new Date().toISOString(),
        customer: currentCustomer,
        items: items.map(it => {
          const calc = calculateItemVolumePrice(it.price, it.quantity, it.isQuote);
          return {
            productId: it.productId,
            productName: it.productName,
            variant: it.variant,
            price: calc.discountedUnitPrice,
            quantity: it.quantity,
            total: calc.totalWithDiscount,
            isQuote: it.isQuote,
            discountPercent: calc.discountPercent,
            savings: calc.savings
          };
        }),
        estimatedTotal: estimatedTotal,
        hasQuoteItems: items.some(it => it.isQuote),
        status: 'À confirmer',
        isPaid: false
      };

      const { blob } = await generateInternalPurchaseOrderPdf(tempOrder, {
        department: notes || 'Bloc Chirurgical / Pharmacie Centrale',
        requesterTitle: contactName || 'Major de Bloc'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bon_Visa_Interne_${tempOrder.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setVisaPdfSuccess(true);
      setTimeout(() => setVisaPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating internal visa order PDF', err);
    } finally {
      setIsGeneratingVisaPdf(false);
    }
  };

  const handleNeighborhoodChange = (newId: string) => {
    setNeighborhoodId(newId);
    const found = getNeighborhoodById(newId);
    if (found) {
      const landmarkSuffix = addressDetails ? ` (${addressDetails})` : '';
      setDeliveryAddress(`${found.name}, ${found.zone}, Libreville${landmarkSuffix}`);
    }
  };

  const handleAddressDetailsChange = (details: string) => {
    setAddressDetails(details);
    const found = getNeighborhoodById(neighborhoodId);
    if (found) {
      const landmarkSuffix = details.trim() ? ` · Repère : ${details.trim()}` : '';
      setDeliveryAddress(`${found.name}, Libreville${landmarkSuffix}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) {
      setError('Votre panier est vide.');
      return;
    }
    if (!facilityName.trim() || !phone.trim()) {
      setError('Veuillez remplir le nom de l\'établissement et le téléphone WhatsApp.');
      return;
    }

    const fullAddress = deliveryMode === 'retrait'
      ? 'Retrait sur place : Dépôt Central Gloryday Pharma, Zone Industrielle Oloumi, Libreville'
      : (deliveryAddress.trim() || `${selectedNeighborhood?.name || 'Libreville'}`);

    const mobilePayment = (paymentMethod === 'airtel_money' || paymentMethod === 'moov_money') ? {
      provider: paymentMethod as 'airtel_money' | 'moov_money',
      merchantPhone: paymentMethod === 'airtel_money' ? '077003004' : '066240399',
      transactionReference: mobileTransactionRef.trim() || undefined,
      senderPhone: mobileSenderPhone.trim() || phone.trim(),
      isPrePaid: isMobilePaymentPreDone,
      screenshotUrl: mobileScreenshotUrl,
      status: (mobileTransactionRef.trim() ? (isMobilePaymentPreDone ? 'submitted' : 'pending') : 'pending') as 'submitted' | 'pending'
    } : undefined;

    const customerInfo: CustomerInfo = {
      facilityName: facilityName.trim(),
      contactName: contactName.trim() || facilityName.trim(),
      phone: phone.trim(),
      deliveryAddress: fullAddress,
      neighborhoodId,
      neighborhoodName: selectedNeighborhood?.name || 'Libreville',
      notes: notes.trim() || undefined,
      deliveryMode,
      paymentMethod,
      mobilePayment,
      deliveryFee
    };

    setStoredCustomerInfo(customerInfo);
    onProceedToPreview(customerInfo);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Votre panier est vide</h2>
        <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
          Sélectionnez les consommables ou packs dont votre structure médicale a besoin.
        </p>
        <button
          type="button"
          onClick={onContinueShopping}
          className="px-6 py-3 rounded-[14px] bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          style={{
            boxShadow: 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
          }}
        >
          Parcourir le catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#161618] tracking-tight">
              Mon panier
            </h1>
            {!isOnline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                <WifiOff className="w-3 h-3 text-amber-600" />
                Mode Hors-ligne
              </span>
            )}
          </div>
          <p className="text-xs text-[#6a6a6b] mt-0.5">
            {items.length} ligne(s) · estimation sans TVA
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenDraftsModal && (
            <button
              type="button"
              onClick={onOpenDraftsModal}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
              title="Ouvrir le gestionnaire de brouillons hors-ligne"
            >
              <FileText className="w-3.5 h-3.5 text-[#0d44e8]" />
              <span>Brouillons</span>
              {draftsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#0d44e8] text-white text-[10px] font-black">
                  {draftsCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveAsDraft()}
            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0d44e8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200 shadow-2xs"
            title="Enregistrer la commande actuelle en brouillon hors-ligne"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Sauvegarder brouillon</span>
          </button>

          <button
            type="button"
            onClick={onClearCart}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vider</span>
          </button>
        </div>
      </div>

      {/* Draft Success Feedback Toast */}
      {draftToast && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{draftToast}</span>
          </div>
          {onOpenDraftsModal && (
            <button
              type="button"
              onClick={onOpenDraftsModal}
              className="underline text-[11px] text-white hover:text-emerald-100 cursor-pointer ml-2"
            >
              Voir mes brouillons →
            </button>
          )}
        </div>
      )}

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-bold">Connexion internet instable ou absente</strong>
            <p className="text-amber-800 text-[11px] mt-0.5">
              Vos articles et coordonnées sont sauvegardés localement. Vous pouvez enregistrer ce panier en brouillon, générer un Bon de commande PDF hors-ligne ou le transmettre par WhatsApp à l'équipe Gloryday.
            </p>
          </div>
        </div>
      )}

      {/* Session / Account Attribution Notice */}
      <div className={`p-3 rounded-xl mb-4 text-xs flex items-center justify-between border ${
        currentUser
          ? 'bg-blue-50/70 border-blue-200 text-blue-900'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center gap-2.5">
          <Building2 className={`w-4 h-4 shrink-0 ${currentUser ? 'text-[#0d44e8]' : 'text-slate-500'}`} />
          <div>
            <span className="font-bold">
              {currentUser
                ? `Panier attribué à : ${currentUser.facilityName}`
                : 'Panier Visiteur Invité (Session Temporaire)'}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {currentUser
                ? `Enregistré sous votre compte (${currentUser.phone}) · Totalement indépendant et isolé des autres sessions.`
                : 'Articles conservés temporairement sur ce navigateur. Connectez-vous pour enregistrer votre panier.'}
            </p>
          </div>
        </div>
        {!currentUser && onOpenAuth && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-2.5 py-1 rounded-lg bg-[#0d44e8] text-white font-bold text-[11px] hover:bg-blue-700 transition-colors shrink-0 cursor-pointer shadow-xs ml-2"
          >
            Se connecter
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Items */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
            {items.map((item, index) => {
              const itemCalc = calculateItemVolumePrice(item.price, item.quantity, item.isQuote);
              return (
                <div key={`${item.productId}-${item.variant}-${index}`} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] text-[#6a6a6b] font-medium truncate">
                        {item.category}
                      </span>
                      {itemCalc.discountPercent > 0 && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          -{itemCalc.discountPercent}% volume
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {item.productName}
                    </h4>
                    {item.variant && item.variant !== 'Standard' && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.variant}
                      </p>
                    )}
                    <div className="mt-1 text-xs flex items-center gap-2">
                      {item.isQuote ? (
                        <span className="text-[11px] font-bold text-amber-700">Tarif sur devis</span>
                      ) : (
                        <>
                          <span className="text-slate-600 font-medium">
                            {itemCalc.discountedUnitPrice.toLocaleString('fr-FR')} FCFA l'unité
                          </span>
                          {itemCalc.discountPercent > 0 && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {item.price.toLocaleString('fr-FR')} F
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {!item.isQuote && item.quantity < 5 && (
                      <p className="text-[10px] text-[#0d44e8] font-medium mt-1">
                        💡 Ajoutez {5 - item.quantity} unité(s) pour débloquer -5%
                      </p>
                    )}
                    {!item.isQuote && item.quantity >= 5 && item.quantity < 10 && (
                      <p className="text-[10px] text-[#0d44e8] font-medium mt-1">
                        💡 Ajoutez {10 - item.quantity} unité(s) pour passer à -10%
                      </p>
                    )}
                  </div>

                  {/* Stepper & Price */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs tabular-nums text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!item.isQuote ? (
                        <div className="text-right">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 tabular-nums block">
                            {itemCalc.totalWithDiscount.toLocaleString('fr-FR')} FCFA
                          </span>
                          {itemCalc.savings > 0 && (
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              Écon. {itemCalc.savings.toLocaleString('fr-FR')} F
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700">À chiffrer</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Retirer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {quoteItems.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>{quoteItems.length} article(s) sur devis :</strong> Les tarifs définitifs de ces équipements seront confirmés directement par Gloryday Pharma.
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onContinueShopping}
            className="text-xs text-[#0d44e8] font-bold hover:underline flex items-center gap-1 cursor-pointer pt-1"
          >
            ← Ajouter d'autres articles
          </button>
        </div>

        {/* Right Column: Order Form */}
        <div className="lg:col-span-5">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-2xs">
            <h3 className="font-bold text-sm text-[#161618] flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-[#0d44e8]" />
              Coordonnées de l'établissement
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Nom de l'établissement *
              </label>
              <input
                type="text"
                required
                placeholder="Clinique, Pharmacie, Hôpital..."
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Responsable / Contact
              </label>
              <input
                type="text"
                placeholder="Dr. / Responsable approvisionnement"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Téléphone WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="+241 77 003 004"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Mode de réception
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDeliveryMode('livraison')}
                  className={`p-2 rounded-xl border font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    deliveryMode === 'livraison'
                      ? 'bg-[#0f0f12] text-white border-[#0f0f12]'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Livraison sur site
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('retrait')}
                  className={`p-2 rounded-xl border font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    deliveryMode === 'retrait'
                      ? 'bg-[#0f0f12] text-white border-[#0f0f12]'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Retrait au dépôt
                </button>
              </div>
            </div>

            {deliveryMode === 'livraison' ? (
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0d44e8]" />
                      <span>Quartier de Libreville & Environs *</span>
                    </label>
                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Calcul automatique du délai
                    </span>
                  </div>
                  <select
                    value={neighborhoodId}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-900 focus:ring-2 focus:ring-[#0d44e8]"
                  >
                    {LIBREVILLE_ZONE_GROUPS.map((group) => (
                      <optgroup key={group.zoneName} label={`${group.zoneName} (~${group.averageDelay})`}>
                        {group.neighborhoods.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name} · ~{n.estimatedMinutes}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Real-time Delivery Delay Card */}
                {selectedNeighborhood && (
                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 space-y-1.5 text-xs text-blue-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-[#0d44e8]">
                        <Clock className="w-4 h-4 text-[#0d44e8] shrink-0" />
                        <span>Délai estimé : <strong>{selectedNeighborhood.estimatedText}</strong></span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-blue-800 bg-white/80 px-2 py-0.5 rounded-md border border-blue-200">
                        {selectedNeighborhood.zone}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-0.5">
                      <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Repère conseillé : <em className="text-slate-800 not-italic font-medium">{selectedNeighborhood.landmarkExample}</em></span>
                    </div>
                    <div className="text-[11px] text-emerald-800 flex items-center gap-1 pt-0.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {itemsSubtotal >= 50000 
                          ? 'Livraison offerte (commande > 50 000 FCFA)' 
                          : `Frais standard : ${baseDeliveryFee > 0 ? baseDeliveryFee.toLocaleString('fr-FR') + ' FCFA' : 'Inclus'}`}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Précision d'adresse & Repère médical *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Face Clinique Chambrier, 1er étage, Service Bloc..."
                    value={addressDetails}
                    onChange={(e) => handleAddressDetailsChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-[#0d44e8]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span>Retrait au Dépôt Central Gloryday Pharma</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Zone Industrielle Oloumi, Libreville · Prêt sous <strong>20 à 30 minutes</strong> après confirmation.
                </p>
                <p className="text-[10px] text-emerald-700 font-bold">
                  ✓ Aucun frais de livraison appliqué.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Mode de règlement prévu
              </label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#0d44e8]"
              >
                <option value="especes">Espèces à la livraison</option>
                <option value="airtel_money">Airtel Money (+241 77 003 004)</option>
                <option value="moov_money">Moov Money (+241 66 240 399)</option>
                <option value="virement">Virement bancaire professionnel</option>
              </select>
            </div>

            {/* Interactive Mobile Payment Validation Assistant (Airtel Money / Moov Money) */}
            {(paymentMethod === 'airtel_money' || paymentMethod === 'moov_money') && (
              <div className={`p-4 rounded-2xl border text-xs space-y-3.5 animate-in fade-in zoom-in-95 duration-150 ${
                paymentMethod === 'airtel_money'
                  ? 'bg-red-50/60 border-red-200'
                  : 'bg-blue-50/60 border-blue-200'
              }`}>
                {/* Header Provider Banner */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                      paymentMethod === 'airtel_money' ? 'bg-red-600' : 'bg-[#0d44e8]'
                    }`}>
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">
                        {paymentMethod === 'airtel_money' ? 'Airtel Money Gabon' : 'Moov Money Gabon'}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Paiement sécurisé marchand Gloryday Pharma
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    paymentMethod === 'airtel_money' 
                      ? 'bg-red-100 text-red-800 border-red-200' 
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {paymentMethod === 'airtel_money' ? 'Code *150#' : 'Code *555#'}
                  </span>
                </div>

                {/* Merchant Account Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Compte Marchand Officiel
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-extrabold text-slate-900 text-xs">
                        {paymentMethod === 'airtel_money' ? '077 00 30 04' : '066 24 03 99'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(
                          paymentMethod === 'airtel_money' ? '077003004' : '066240399',
                          'merchant-num'
                        )}
                        className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
                        title="Copier le numéro marchand"
                      >
                        {copiedKey === 'merchant-num' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Montant net à régler
                    </span>
                    <span className="font-mono font-extrabold text-slate-900 text-xs block">
                      {estimatedTotal.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>

                {/* Direct USSD Quick String */}
                <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
                  <div className="truncate">
                    <span className="text-slate-500 block text-[10px]">Syntaxe USSD directe :</span>
                    <code className="font-mono font-bold text-slate-800 text-[11px]">
                      {paymentMethod === 'airtel_money' 
                        ? `*150*1*1*077003004*${estimatedTotal}#` 
                        : `*555*1*1*066240399*${estimatedTotal}#`}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      paymentMethod === 'airtel_money' 
                        ? `*150*1*1*077003004*${estimatedTotal}#` 
                        : `*555*1*1*066240399*${estimatedTotal}#`,
                      'ussd-syntax'
                    )}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] shrink-0 flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'ussd-syntax' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copier USSD</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Payment Execution Mode Choice */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-800 block">
                    Statut du règlement mobile :
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMobilePaymentPreDone(false)}
                      className={`p-2.5 rounded-xl border text-[11px] text-left transition-all ${
                        !isMobilePaymentPreDone
                          ? 'bg-white border-[#0d44e8] font-bold text-slate-900 shadow-2xs ring-1 ring-[#0d44e8]'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <span>À la réception</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Paiement après validation</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMobilePaymentPreDone(true)}
                      className={`p-2.5 rounded-xl border text-[11px] text-left transition-all ${
                        isMobilePaymentPreDone
                          ? 'bg-white border-emerald-600 font-bold text-slate-900 shadow-2xs ring-1 ring-emerald-600'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Déjà effectué
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Renseigner l'ID SMS</p>
                    </button>
                  </div>
                </div>

                {/* Transaction Reference Input (Enabled if Pre-done or optional for pre-verification) */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        {isMobilePaymentPreDone ? 'Référence de transaction SMS *' : 'Référence de transaction (si déjà initié)'}
                      </label>
                      <span className="text-[10px] text-slate-400">ID reçu par SMS</span>
                    </div>
                    <input
                      type="text"
                      placeholder={paymentMethod === 'airtel_money' ? 'Ex: CI261016.1432.B94821 ou 894021' : 'Ex: TXN26101694821 ou 749201'}
                      value={mobileTransactionRef}
                      onChange={(e) => setMobileTransactionRef(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono focus:ring-2 focus:ring-[#0d44e8]"
                    />
                  </div>

                  {mobileTransactionRef.trim() && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Référence validée : elle figurera sur le bon de commande et le WhatsApp.</span>
                    </div>
                  )}

                  {mobileScreenshotUrl && (
                    <div className="p-2 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img src={mobileScreenshotUrl} alt="Preuve" className="w-8 h-8 rounded object-cover border border-slate-200" />
                        <span className="text-[11px] font-bold text-emerald-800">Preuve de transfert attachée</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileScreenshotUrl(undefined)}
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Retirer
                      </button>
                    </div>
                  )}

                  {/* Full Assistant Modal Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsMobileModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#0d44e8]" />
                    <span>Ouvrir l'assistant interactif pas-à-pas & joindre un reçu</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Remarques (facultatif)
              </label>
              <textarea
                rows={2}
                placeholder="Ex. : livraison urgente avant 12 h"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Articles à prix standard</span>
                <span className="font-bold tabular-nums text-slate-900">{originalGrossTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {totalVolumeSavings > 0 && (
                <div className="flex justify-between text-emerald-700 bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200 font-semibold text-[11px]">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Remise Volume Clinique appliquée
                  </span>
                  <span className="tabular-nums font-bold">-{totalVolumeSavings.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              {quoteItems.length > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Articles sur devis</span>
                  <span className="font-bold">{quoteItems.length} à chiffrer</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>
                  {deliveryMode === 'livraison' 
                    ? `Frais d'acheminement (${selectedNeighborhood?.name || 'Libreville'})` 
                    : 'Retrait Dépôt Oloumi'}
                </span>
                <span className="font-semibold">
                  {deliveryMode === 'retrait' 
                    ? 'Offert' 
                    : deliveryFee === 0 
                      ? <span className="text-emerald-700 font-bold">Offert (&gt; 50 000 F)</span> 
                      : `${deliveryFee.toLocaleString('fr-FR')} FCFA`}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 italic text-[11px]">
                <span>TVA</span>
                <span>Non soumis</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex items-baseline justify-between">
                <span className="font-bold text-slate-900">Total net estimé</span>
                <div className="text-right">
                  <span className="text-xl font-black text-[#000000] tabular-nums">
                    {estimatedTotal.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1">FCFA</span>
                </div>
              </div>
            </div>

            {/* Internal Purchase Order / Visa Hiérarchique button */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  Circuit de Visa Clinique & Hôpital :
                </span>
                <span className="text-[10px] text-slate-500">Format A4</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadInternalVisaOrder}
                disabled={isGeneratingVisaPdf}
                className="w-full py-2 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                {visaPdfSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Bon de Visa téléchargé !</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-[#0d44e8]" />
                    <span>Télécharger Bon de Demande d'Achat Interne (PDF)</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-400 leading-tight">
                Génère un bon imprimable avec cases de visas : Major de Bloc, Direction Médicale, et Comptabilité.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                className="w-full h-12 rounded-[14px] bg-[#0d44e8] hover:bg-[#0b3ac7] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                style={{
                  boxShadow: 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
                }}
              >
                <span>{isOnline ? 'Vérifier le bon de commande' : 'Vérifier & Préparer la commande (Hors-ligne)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSaveAsDraft()}
                className="w-full h-10 rounded-[12px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-[#0d44e8]" />
                <span>Enregistrer cette commande en brouillon</span>
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              {isOnline 
                ? "Étape suivante : aperçu du bon de commande PDF avant l'envoi sur WhatsApp."
                : "Réseau instable : votre commande est sécurisée en local et prête à être transmise dès reconnexion."}
            </p>
          </form>
        </div>
      </div>

      {/* Interactive Mobile Payment Validation Modal */}
      <MobilePaymentModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
        orderTotal={estimatedTotal}
        facilityName={facilityName || 'Votre Établissement'}
        initialProvider={paymentMethod === 'moov_money' ? 'moov_money' : 'airtel_money'}
        initialDetails={{
          provider: paymentMethod === 'moov_money' ? 'moov_money' : 'airtel_money',
          merchantPhone: paymentMethod === 'moov_money' ? '066240399' : '077003004',
          transactionReference: mobileTransactionRef,
          senderPhone: mobileSenderPhone,
          isPrePaid: isMobilePaymentPreDone,
          screenshotUrl: mobileScreenshotUrl
        }}
        onSavePayment={(details) => {
          setPaymentMethod(details.provider);
          setMobileTransactionRef(details.transactionReference || '');
          if (details.senderPhone) setMobileSenderPhone(details.senderPhone);
          setIsMobilePaymentPreDone(!!details.isPrePaid);
          setMobileScreenshotUrl(details.screenshotUrl);
        }}
      />
    </div>
  );
};
