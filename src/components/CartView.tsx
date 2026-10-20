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
  ShieldCheck
} from 'lucide-react';
import { CartItem, CustomerInfo, User } from '../types';
import { getStoredCustomerInfo, setStoredCustomerInfo } from '../api';
import { 
  LIBREVILLE_ZONE_GROUPS, 
  getNeighborhoodById, 
  detectNeighborhoodFromAddress,
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
        if (saved.addressDetails) setAddressDetails(saved.addressDetails);
        if (saved.notes) setNotes(saved.notes);
      } else {
        setFacilityName('');
        setContactName('');
        setPhone('');
        setNeighborhoodId('centre-ville');
        setDeliveryAddress('Centre-Ville, Libreville');
      }
    }
  }, [currentUser]);

  // Synchronous auto-save of delivery draft to localStorage to prevent data loss on browser close
  useEffect(() => {
    if (facilityName.trim() || phone.trim() || addressDetails.trim() || notes.trim()) {
      setStoredCustomerInfo({
        facilityName,
        contactName,
        phone,
        neighborhoodId,
        deliveryAddress,
        addressDetails,
        deliveryMode,
        paymentMethod,
        notes
      });
    }
  }, [facilityName, contactName, phone, neighborhoodId, deliveryAddress, addressDetails, deliveryMode, paymentMethod, notes]);

  const fixedItems = items.filter(it => !it.isQuote);
  const quoteItems = items.filter(it => it.isQuote);
  const itemsSubtotal = fixedItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

  const selectedNeighborhood = getNeighborhoodById(neighborhoodId);
  const deliveryWindow = computeDeliveryTimeWindow(neighborhoodId);
  const deliveryDelayText = deliveryMode === 'retrait' 
    ? 'Prêt sous 20 à 30 min (Dépôt Central Oloumi)'
    : (selectedNeighborhood ? `${selectedNeighborhood.estimatedText} (${deliveryWindow.timeWindow})` : '45 à 60 minutes');

  // Free delivery for orders >= 50,000 FCFA or for pickup
  const baseDeliveryFee = deliveryMode === 'retrait' ? 0 : (selectedNeighborhood?.baseDeliveryFee || 0);
  const deliveryFee = itemsSubtotal >= 50000 ? 0 : baseDeliveryFee;
  const estimatedTotal = itemsSubtotal + deliveryFee;

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

    const customerInfo: CustomerInfo = {
      facilityName: facilityName.trim(),
      contactName: contactName.trim() || facilityName.trim(),
      phone: phone.trim(),
      deliveryAddress: fullAddress,
      neighborhoodId,
      neighborhoodName: `${selectedNeighborhood?.name || 'Libreville'} (${deliveryWindow.shortWindow})`,
      notes: notes.trim() || undefined,
      deliveryMode,
      paymentMethod,
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
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#161618] tracking-tight">
            Mon panier
          </h1>
          <p className="text-xs text-[#6a6a6b] mt-0.5">
            {items.length} ligne(s) · estimation sans TVA
          </p>
        </div>
        <button
          type="button"
          onClick={onClearCart}
          className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Vider
        </button>
      </div>

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
            {items.map((item, index) => (
              <div key={`${item.productId}-${item.variant}-${index}`} className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-[#6a6a6b] font-medium block truncate">
                    {item.category}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
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
                        {item.price.toLocaleString('fr-FR')} FCFA l'unité
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
                      className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs tabular-nums text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {!item.isQuote ? (
                      <span className="font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
                        {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700">À chiffrer</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Retirer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                  <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 space-y-2 text-xs text-blue-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-[#0d44e8]">
                        <Clock className="w-4 h-4 text-[#0d44e8] shrink-0" />
                        <span>Délai d'acheminement : <strong>{selectedNeighborhood.estimatedText}</strong></span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                        {selectedNeighborhood.zone}
                      </span>
                    </div>

                    {/* Precise Time Window Badge */}
                    <div className="p-2.5 rounded-xl bg-white border border-blue-200/90 flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-slate-600 font-medium">Heure d'arrivée prévue :</span>
                        <strong className="text-blue-900 font-black">{deliveryWindow.timeWindow}</strong>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Heure Libreville (WAT)</span>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
              >
                <option value="especes">Espèces à la livraison</option>
                <option value="airtel_money">Airtel Money (+241 77 003 004)</option>
                <option value="moov_money">Moov Money (+241 66 240 399)</option>
                <option value="virement">Virement bancaire professionnel</option>
              </select>
            </div>

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
                <span>Articles à prix fixe</span>
                <span className="font-bold tabular-nums text-slate-900">{estimatedTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
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
                <span className="font-bold text-slate-900">Total estimé</span>
                <div className="text-right">
                  <span className="text-xl font-black text-[#000000] tabular-nums">
                    {estimatedTotal.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1">FCFA</span>
                </div>
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
            <p className="text-[11px] text-center text-slate-400">
              Étape suivante : aperçu du bon de commande PDF avant l'envoi sur WhatsApp.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
