import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Building2, 
  MapPin, 
  Truck, 
  FileText,
  AlertTriangle,
  HelpCircle,
  Clock,
  Compass,
  ShieldCheck,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';
import { CartItem, Coordinates, CustomerInfo, User } from '../types';
import { PhoneNumberInput } from './PhoneNumberInput';
import { calculateCartVolumeSummary, calculateItemVolumePrice } from '../utils/volumeDiscount';
import { 
  LIBREVILLE_ZONE_GROUPS, 
  buildNeighborhoodDeliveryAddress,
  getNeighborhoodById, 
  detectNeighborhoodFromAddress,
  extractDeliveryInstructions,
  computeDeliveryTimeWindow
} from '../data/librevilleZones';

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
  onContinueShopping
}) => {
  const [facilityName, setFacilityName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhoodId, setNeighborhoodId] = useState('centre-ville');
  const [deliveryAddress, setDeliveryAddress] = useState('Centre-Ville, Libreville');
  const [addressDetails, setAddressDetails] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'livraison' | 'retrait'>('livraison');
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'airtel_money' | 'moov_money' | 'virement'>('especes');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<Coordinates | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsMessage, setGpsMessage] = useState('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const facilityInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.facilityName) setFacilityName(currentUser.facilityName);
      if (currentUser.contactName) setContactName(currentUser.contactName);
      if (currentUser.phone) setPhone(currentUser.phone);
      setDeliveryCoordinates(null);
      setGpsMessage('Relevez le GPS à l’adresse de livraison pour associer un point exact à cette commande.');
      const detected = (currentUser.neighborhoodId && getNeighborhoodById(currentUser.neighborhoodId))
        || detectNeighborhoodFromAddress(currentUser.deliveryAddress || '');
      const instructions = currentUser.deliveryInstructions !== undefined
        ? currentUser.deliveryInstructions
        : extractDeliveryInstructions(currentUser.deliveryAddress || '', detected?.id);
      if (detected) {
        setNeighborhoodId(detected.id);
        setAddressDetails(instructions);
        setDeliveryAddress(buildNeighborhoodDeliveryAddress(detected.id, instructions));
      } else if (currentUser.deliveryAddress) {
        setAddressDetails(instructions);
        setDeliveryAddress(currentUser.deliveryAddress);
      }
    } else {
      setFacilityName('');
      setContactName('');
      setPhone('');
      setNeighborhoodId('centre-ville');
      setDeliveryAddress('Centre-Ville, Libreville');
      setAddressDetails('');
      setNotes('');
      setDeliveryCoordinates(null);
      setGpsError(null);
      setGpsMessage('');
    }
  }, [currentUser]);

  const quoteItems = items.filter(it => it.isQuote);
  const volumeSummary = calculateCartVolumeSummary(items);
  const itemsSubtotal = volumeSummary.netTotal;

  const selectedNeighborhood = getNeighborhoodById(neighborhoodId);
  const deliveryWindow = computeDeliveryTimeWindow(neighborhoodId);

  // Free delivery for orders >= 50,000 FCFA or for pickup
  const baseDeliveryFee = deliveryMode === 'retrait' ? 0 : (selectedNeighborhood?.baseDeliveryFee || 0);
  const deliveryFee = itemsSubtotal >= 50000 ? 0 : baseDeliveryFee;
  const estimatedTotal = itemsSubtotal + deliveryFee;

  const handleNeighborhoodChange = (newId: string) => {
    setNeighborhoodId(newId);
    setDeliveryCoordinates(null);
    setGpsError(null);
    setGpsMessage('Quartier modifié : reprenez le GPS à l’adresse de livraison pour confirmer le point exact.');
    const found = getNeighborhoodById(newId);
    if (found) {
      setDeliveryAddress(buildNeighborhoodDeliveryAddress(newId, addressDetails));
    }
  };

  const handleAddressDetailsChange = (details: string) => {
    setAddressDetails(details);
    setDeliveryCoordinates(null);
    setGpsError(null);
    setGpsMessage('Adresse modifiée : reprenez le GPS à l’adresse de livraison pour confirmer le point exact.');
    const found = getNeighborhoodById(neighborhoodId);
    if (found) {
      setDeliveryAddress(buildNeighborhoodDeliveryAddress(neighborhoodId, details));
    }
  };

  const captureDeliveryGps = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('La localisation GPS n’est pas disponible dans ce navigateur.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'checkout',
        });
        setGpsMessage('Point relevé sur ce téléphone. Vérifiez que vous êtes bien à l’adresse de livraison.');
        setIsLocatingGps(false);
      },
      (geoError) => {
        setIsLocatingGps(false);
        setGpsError(geoError.code === geoError.PERMISSION_DENIED
          ? 'Autorisez la localisation du navigateur, puis réessayez.'
          : geoError.code === geoError.TIMEOUT
            ? 'Le GPS met trop de temps à répondre. Réessayez dehors ou vérifiez le réseau.'
            : 'Position GPS indisponible. Vous pouvez tout de même commander avec l’adresse écrite.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  };

  const triggerOrderConfirmation = () => {
    setError(null);
    if (items.length === 0) {
      setError('Votre panier est vide.');
      return;
    }
    if (!currentUser && onOpenAuth) {
      onOpenAuth();
      return;
    }
    if (currentUser && currentUser.role !== 'client') {
      setError('La validation de commande est réservée aux comptes Établissements / Clients.');
      return;
    }
    if (!facilityName.trim() || !phone.trim()) {
      setError('Veuillez vérifier le nom de l\'établissement et le téléphone WhatsApp ci-dessous.');
      facilityInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      facilityInputRef.current?.focus();
      return;
    }

    const fullAddress = deliveryMode === 'retrait'
      ? 'Retrait sur place : Dépôt Central Gloryday Pharma, Zone Industrielle Oloumi, Libreville'
      : (deliveryAddress.trim() || `${selectedNeighborhood?.name || 'Libreville'}`);

    const customerInfo: CustomerInfo = {
      facilityName: facilityName.trim(),
      contactName: contactName.trim() || facilityName.trim(),
      phone: phone.trim(),
      deliveryAddress: fullAddress,
      coordinates: deliveryMode === 'livraison' ? deliveryCoordinates || undefined : undefined,
      neighborhoodId,
      neighborhoodName: `${selectedNeighborhood?.name || 'Libreville'} (${deliveryWindow.shortWindow})`,
      notes: notes.trim() || undefined,
      deliveryMode,
      paymentMethod,
      deliveryFee
    };

    onProceedToPreview(customerInfo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerOrderConfirmation();
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
    <div className="max-w-6xl mx-auto pb-36 lg:pb-24 px-2 sm:px-0">
      {/* Header with Immediate Top CTA so the user never has to scroll */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#161618] tracking-tight">
            Mon panier & Bon de commande
          </h1>
          <p className="text-xs text-[#6a6a6b] mt-0.5">
            {items.length} ligne(s) · Total estimé : <strong className="text-slate-900">{estimatedTotal.toLocaleString('fr-FR')} FCFA</strong> (sans TVA)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClearCart}
            className="px-3 py-2 rounded-xl border border-rose-200 text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vider
          </button>
          <button
            type="button"
            onClick={triggerOrderConfirmation}
            className="px-4 py-2.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmer le bon de commande</span>
          </button>
        </div>
      </div>

      {/* Session / Account Attribution Notice */}
      <div className={`p-3 rounded-xl mb-4 text-xs flex items-center justify-between border ${
        currentUser
          ? 'bg-blue-50/70 border-blue-200 text-blue-900'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-2.5">
          <Building2 className={`w-4 h-4 shrink-0 ${currentUser ? 'text-[#0d44e8]' : 'text-amber-700'}`} />
          <div>
            <span className="font-bold">
              {currentUser
                ? `Panier attribué à : ${currentUser.facilityName}`
                : 'Connexion requise pour enregistrer et générer le Bon de Commande PDF'}
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {currentUser
                ? `Compte actif (${currentUser.phone}) · Vos coordonnées sont pré-remplies automatiquement.`
                : 'Connectez-vous ou créez votre compte établissement en 30 secondes. Votre panier actuel est conservé.'}
            </p>
          </div>
        </div>
        {!currentUser && onOpenAuth && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-3 py-1.5 rounded-xl bg-[#0d44e8] text-white font-bold text-xs hover:bg-blue-700 transition-colors shrink-0 cursor-pointer shadow-xs ml-2"
          >
            Se connecter / S'inscrire
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Cart Items */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
            {items.map((item, index) => {
              const calc = calculateItemVolumePrice(item.price, item.quantity, item.isQuote);
              return (
                <div key={`${item.productId}-${item.variant}-${index}`} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-[#6a6a6b] font-medium truncate">
                        {item.category}
                      </span>
                      {calc.discountPercent > 0 && (
                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Remise -{calc.discountPercent}%
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate mt-0.5">
                      {item.productName}
                    </h4>
                    {item.variant && item.variant !== 'Standard' && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.variant}
                      </p>
                    )}
                    <div className="mt-1 text-xs">
                      {item.isQuote ? (
                        <span className="text-[11px] font-bold text-amber-700">Tarif sur devis</span>
                      ) : (
                        <span className="text-slate-600 font-medium">
                          {calc.discountedUnitPrice.toLocaleString('fr-FR')} FCFA l'unité
                          {calc.discountPercent > 0 && (
                            <span className="text-[10px] text-slate-400 line-through ml-1.5">
                              {item.price.toLocaleString('fr-FR')} F
                            </span>
                          )}
                        </span>
                      )}
                    </div>
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
                        <span className="font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
                          {calc.totalWithDiscount.toLocaleString('fr-FR')} FCFA
                        </span>
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
                <strong>Articles sur devis :</strong> Votre bon de commande PDF sera généré immédiatement et transmis à notre équipe commerciale pour confirmation.
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

        {/* Right Column: Sticky Summary + Compact Confirmation Form */}
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-sm">
            {/* TOP CONFIRMATION SUMMARY CARD (No scrolling required to see total & confirm button) */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Sous-total articles</span>
                <span className="font-bold tabular-nums text-white">{volumeSummary.grossTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {volumeSummary.totalSavings > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Remise sur volume appliquée
                  </span>
                  <span>-{volumeSummary.totalSavings.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>
                  {deliveryMode === 'livraison'
                    ? `Livraison (${selectedNeighborhood?.name || 'Libreville'})`
                    : 'Retrait Dépôt Oloumi'}
                </span>
                <span className="font-semibold text-emerald-300">
                  {deliveryMode === 'retrait' || deliveryFee === 0
                    ? 'Offert'
                    : `${deliveryFee.toLocaleString('fr-FR')} FCFA`}
                </span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex items-baseline justify-between">
                <span className="font-bold text-xs text-slate-200">Total net estimé (Sans TVA)</span>
                <div className="text-right">
                  <span className="text-xl font-black text-white tabular-nums">
                    {estimatedTotal.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-xs font-bold text-slate-300 ml-1">FCFA</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-1"
              >
                <span>Vérifier & Confirmer le bon de commande</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2 pt-1">
              <FileText className="w-3.5 h-3.5 text-[#0d44e8]" />
              Coordonnées de l'établissement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nom de l'établissement *
                </label>
                <input
                  ref={facilityInputRef}
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
                  placeholder="Dr. / Approvisionnement"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
                />
              </div>

              <div>
                <label htmlFor="checkout-phone" className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Téléphone WhatsApp *
                </label>
                <PhoneNumberInput id="checkout-phone" required value={phone} onChange={setPhone} placeholder="77 00 30 04" className="text-xs" />
              </div>
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
              <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-800 uppercase flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0d44e8]" />
                    <span>Quartier de Libreville & Environs *</span>
                  </label>
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

                {selectedNeighborhood && (
                  <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 flex items-center justify-between text-xs text-blue-950">
                    <span className="font-bold flex items-center gap-1.5 text-[#0d44e8]">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Arrivée estimée : <strong>{deliveryWindow.timeWindow}</strong></span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800">
                      {itemsSubtotal >= 50000 ? 'Livraison offerte' : `${baseDeliveryFee.toLocaleString('fr-FR')} F`}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Précision d'adresse & Repère médical *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Face Clinique Chambrier, 1er étage..."
                    value={addressDetails}
                    onChange={(e) => handleAddressDetailsChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-[#0d44e8]"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-600">
                    {deliveryCoordinates
                      ? `✓ Point GPS relevé (${deliveryCoordinates.lat.toFixed(4)}, ${deliveryCoordinates.lng.toFixed(4)})`
                      : 'Point GPS optionnel pour le livreur'}
                  </span>
                  <button
                    type="button"
                    onClick={captureDeliveryGps}
                    disabled={isLocatingGps}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-blue-300 text-[#0d44e8] font-bold text-[11px] hover:bg-blue-50 cursor-pointer shrink-0"
                  >
                    {isLocatingGps ? 'Recherche GPS…' : deliveryCoordinates ? 'Actualiser GPS' : '📍 Relever GPS'}
                  </button>
                </div>
                {gpsError && <p role="alert" className="text-[10px] font-semibold text-rose-700">{gpsError}</p>}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span>Retrait Dépôt Central Oloumi (20-30 min · Sans frais)</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Mode de règlement
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                >
                  <option value="especes">Espèces à la livraison</option>
                  <option value="airtel_money">Airtel Money (+241 77 003 004)</option>
                  <option value="moov_money">Moov Money (+241 66 240 399)</option>
                  <option value="virement">Virement bancaire</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Remarques (facultatif)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Urgent avant 12h"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-[14px] bg-[#0d44e8] hover:bg-[#0b3ac7] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              style={{
                boxShadow: 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
              }}
            >
              <span>Vérifier le bon de commande</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* MOBILE FIXED BOTTOM CONFIRMATION BAR (Always visible without scrolling) */}
      <div className="fixed bottom-14 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-3.5 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block leading-none">
              Total estimé ({items.length} réf.)
            </span>
            <span className="text-base font-black text-slate-900 tabular-nums">
              {estimatedTotal.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">FCFA</span>
            </span>
          </div>
          <button
            type="button"
            onClick={triggerOrderConfirmation}
            className="px-4 py-2.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>Vérifier le bon de commande</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
