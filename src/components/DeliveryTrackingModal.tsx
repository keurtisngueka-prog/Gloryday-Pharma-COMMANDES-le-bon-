import React, { useEffect, useState } from 'react';
import { 
  X, 
  Truck, 
  Phone, 
  MessageCircle, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Building2, 
  Navigation, 
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Send,
  Eye,
  ChevronDown,
  Zap,
  History
} from 'lucide-react';
import { Order, DeliveryStage, CourierInfo, DeliveryProof, DeliveryLocationPoint } from '../types';
import { generateWhatsAppMessageForStage, generateCourierMissionWhatsApp } from '../utils/whatsappNotifications';
import { computeDeliveryTimeWindow } from '../data/librevilleZones';
import { api } from '../api';
import { LiveDeliveryMap } from './LiveDeliveryMap';

interface DeliveryTrackingModalProps {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
  onUpdateStage?: (
    orderId: string,
    stage: DeliveryStage,
    options?: { courier?: CourierInfo; deliveryProof?: DeliveryProof }
  ) => Promise<void>;
  isAdmin?: boolean;
}

export const DeliveryTrackingModal: React.FC<DeliveryTrackingModalProps> = ({
  isOpen,
  order,
  onClose,
  onUpdateStage,
  isAdmin = false,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [showMsgPreview, setShowMsgPreview] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [stageError, setStageError] = useState('');
  const [locationPoints, setLocationPoints] = useState<DeliveryLocationPoint[]>([]);
  const [locationLoadError, setLocationLoadError] = useState('');
  const [trackingActive, setTrackingActive] = useState(false);
  const [trackingExpiresAt, setTrackingExpiresAt] = useState('');
  const [trackingLink, setTrackingLink] = useState('');
  const [trackingLinkCopied, setTrackingLinkCopied] = useState(false);
  const [trackingActionError, setTrackingActionError] = useState('');
  const [trackingActionBusy, setTrackingActionBusy] = useState(false);
  const [showDeliveryProofForm, setShowDeliveryProofForm] = useState(false);
  const [receivedBy, setReceivedBy] = useState(order.deliveryProof?.receivedBy || '');
  const [receiptReference, setReceiptReference] = useState(order.deliveryProof?.receiptReference || '');
  const [courierDraft, setCourierDraft] = useState<CourierInfo>({
    name: order.courier?.name || '',
    phone: order.courier?.phone || '',
    vehicle: order.courier?.vehicle || '',
    matricule: order.courier?.matricule || '',
    currentZone: order.courier?.currentZone || '',
    estimatedTime: order.courier?.estimatedTime || ''
  });

  useEffect(() => {
    setReceivedBy(order.deliveryProof?.receivedBy || '');
    setReceiptReference(order.deliveryProof?.receiptReference || '');
    setCourierDraft({
      name: order.courier?.name || '',
      phone: order.courier?.phone || '',
      vehicle: order.courier?.vehicle || '',
      matricule: order.courier?.matricule || '',
      currentZone: order.courier?.currentZone || '',
      estimatedTime: order.courier?.estimatedTime || ''
    });
  }, [order.id, order.courier, order.deliveryProof]);

  useEffect(() => {
    setLocationPoints([]);
    setTrackingLink('');
    setTrackingLinkCopied(false);
    setTrackingActionError('');
  }, [order.id]);

  useEffect(() => {
    if (!isOpen || order.status === 'Livrée' || order.status === 'Annulée') {
      setLocationPoints([]);
      return;
    }
    let active = true;
    const refreshLocation = async () => {
      try {
        const points = await api.getDeliveryLocationHistory(order.id);
        if (active) {
          setLocationPoints(points);
          setLocationLoadError('');
        }
      } catch (error) {
        if (active) setLocationLoadError(error instanceof Error ? error.message : 'Impossible de charger la position du coursier.');
      }
    };
    void refreshLocation();
    const timer = window.setInterval(() => void refreshLocation(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isOpen, order.id, order.status]);

  useEffect(() => {
    if (!isOpen || !isAdmin || order.status === 'Livrée' || order.status === 'Annulée') {
      setTrackingActive(false);
      setTrackingExpiresAt('');
      return;
    }
    let active = true;
    const refreshTrackingStatus = async () => {
      try {
        const status = await api.getCourierTrackingStatus(order.id);
        if (active) {
          setTrackingActive(status.active);
          setTrackingExpiresAt(status.expiresAt || '');
        }
      } catch (error) {
        if (active) setTrackingActionError(error instanceof Error ? error.message : 'Impossible de vérifier le lien GPS.');
      }
    };
    void refreshTrackingStatus();
    const timer = window.setInterval(() => void refreshTrackingStatus(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isOpen, isAdmin, order.id, order.status]);

  if (!isOpen || !order) return null;

  const currentStage: DeliveryStage = order.status === 'Livrée' ? 'delivered' : order.deliveryStage || (
    order.status === 'En préparation' ? 'preparation' :
    'preparation'
  );

  const courierName = order.courier?.name || 'Aucun coursier affecté';
  const courierPhone = order.courier?.phone || '';
  const courierVehicle = order.courier?.vehicle || 'À renseigner';
  const deliveryZone = order.deliveryZone || (
    order.customer.deliveryAddress?.toLowerCase().includes('akanda') ? 'Akanda' :
    order.customer.deliveryAddress?.toLowerCase().includes('owendo') ? 'Owendo' :
    'Grand Libreville'
  );
  const deliveryEstimated = order.deliveryEstimated || 'Dans 45 minutes';
  const coordinates = order.customer.coordinates;
  const hasPreciseCoordinates = Boolean(coordinates &&
    Number.isFinite(coordinates.lat) && coordinates.lat >= -90 && coordinates.lat <= 90 &&
    Number.isFinite(coordinates.lng) && coordinates.lng >= -180 && coordinates.lng <= 180);
  const hasConfirmedOrderGps = hasPreciseCoordinates && coordinates?.source === 'checkout';
  const providedMapsUrl = (() => {
    try {
      const url = new URL(order.customer.googleMapsUrl || '');
      return url.protocol === 'https:' && (url.hostname === 'maps.app.goo.gl' || url.hostname === 'google.com' || url.hostname.endsWith('.google.com'))
        ? url.href
        : '';
    } catch {
      return '';
    }
  })();
  const addressQuery = [order.customer.deliveryAddress, order.customer.neighborhoodName, order.customer.city]
    .filter(value => typeof value === 'string' && value.trim())
    .join(', ');
  const mapDestination = hasConfirmedOrderGps
    ? `${coordinates!.lat},${coordinates!.lng}`
    : addressQuery;
  const mapQuery = mapDestination && /gabon/i.test(mapDestination) ? mapDestination : `${mapDestination}, Gabon`;
  const googleMapsUrl = order.customer.deliveryMode === 'retrait'
    ? ''
    : mapDestination
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}&travelmode=driving`
      : providedMapsUrl;

  const stages: {
    key: DeliveryStage;
    label: string;
    sublabel: string;
    icon: any;
    desc: string;
  }[] = [
    {
      key: 'preparation',
      label: 'En préparation à l’entrepôt',
      sublabel: 'Dépôt Central Gloryday Pharma',
      icon: Package,
      desc: 'Articles contrôlés, emballés sous scellé médical et bordereau imprimé.'
    },
    {
      key: 'picked_up',
      label: 'Pris en charge par le coursier',
      sublabel: `${courierName}`,
      icon: ShieldCheck,
      desc: 'Le coursier médical a chargé la commande sécurisée dans le caisson.'
    },
    {
      key: 'in_transit',
      label: 'En cours d’acheminement',
      sublabel: `Vers ${deliveryZone}`,
      icon: Truck,
      desc: 'En route vers votre établissement (Libreville / Akanda / Owendo).'
    },
    {
      key: 'delivered',
      label: 'Livré à l’établissement',
      sublabel: `${order.customer.facilityName}`,
      icon: CheckCircle2,
      desc: 'Colis réceptionné, vérifié et émargé par le responsable médical.'
    }
  ];

  const getStageIndex = (stage: DeliveryStage) => {
    switch (stage) {
      case 'preparation': return 0;
      case 'picked_up': return 1;
      case 'in_transit': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const currentStageIndex = getStageIndex(currentStage);
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1].key : null;
  const isOrderActive = order.status !== 'Livrée' && order.status !== 'Annulée';
  const canTrackCourier = isOrderActive && ['picked_up', 'in_transit'].includes(currentStage) &&
    Boolean(order.courier) && order.customer.deliveryMode !== 'retrait';
  const latestLocation = locationPoints[locationPoints.length - 1];
  const locationIsRecent = Boolean(latestLocation && Date.now() - Date.parse(latestLocation.recordedAt) < 60_000);

  const handleCreateTrackingLink = async () => {
    try {
      setTrackingActionBusy(true);
      setTrackingActionError('');
      const result = await api.createCourierTrackingLink(order.id);
      setTrackingLink(result.url);
      setTrackingActive(true);
      setTrackingExpiresAt(result.expiresAt);
    } catch (error) {
      setTrackingActionError(error instanceof Error ? error.message : 'Impossible de créer le lien GPS.');
    } finally {
      setTrackingActionBusy(false);
    }
  };

  const handleRevokeTrackingLink = async () => {
    try {
      setTrackingActionBusy(true);
      setTrackingActionError('');
      await api.revokeCourierTracking(order.id);
      setTrackingActive(false);
      setTrackingExpiresAt('');
      setTrackingLink('');
      setLocationPoints([]);
    } catch (error) {
      setTrackingActionError(error instanceof Error ? error.message : 'Impossible d’arrêter le suivi GPS.');
    } finally {
      setTrackingActionBusy(false);
    }
  };

  const handleCopyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingLink);
      setTrackingLinkCopied(true);
      window.setTimeout(() => setTrackingLinkCopied(false), 2000);
    } catch {
      setTrackingActionError('Impossible de copier le lien sur cet appareil.');
    }
  };
  const canAdvanceDelivery = order.status === 'En préparation' && Boolean(nextStage);
  const hasCompleteDeliveryProof = Boolean(order.deliveryProof?.receivedBy?.trim() && order.deliveryProof?.receiptReference?.trim());
  const needsLegacyDeliveryProof = order.status === 'Livrée' && !hasCompleteDeliveryProof;

  const handleStageChange = async (targetStage: DeliveryStage) => {
    if (!onUpdateStage) return;
    if (targetStage === 'delivered') {
      setStageError('');
      setShowDeliveryProofForm(true);
      return;
    }
    try {
      setIsUpdating(true);
      setStageError('');
      const courier = courierDraft.name.trim() || courierDraft.phone.trim()
        ? courierDraft
        : undefined;
      await onUpdateStage(order.id, targetStage, courier ? { courier } : undefined);
    } catch (error) {
      setStageError(error instanceof Error ? error.message : 'Impossible d’enregistrer le suivi.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCourier = async () => {
    if (!onUpdateStage) return;
    try {
      setIsUpdating(true);
      setStageError('');
      await onUpdateStage(order.id, currentStage, { courier: courierDraft });
    } catch (error) {
      setStageError(error instanceof Error ? error.message : 'Impossible d’enregistrer le coursier.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!onUpdateStage) return;
    if (!receivedBy.trim() || !receiptReference.trim()) {
      setStageError('Indique le nom de la personne qui reçoit et la référence du bon signé.');
      return;
    }
    try {
      setIsUpdating(true);
      setStageError('');
      const courier = !needsLegacyDeliveryProof && (courierDraft.name.trim() || courierDraft.phone.trim())
        ? courierDraft
        : undefined;
      const deliveryProof: DeliveryProof = {
        receivedBy: receivedBy.trim(),
        receiptReference: receiptReference.trim(),
        timestamp: new Date().toISOString()
      };
      await onUpdateStage(order.id, 'delivered', {
        ...(courier ? { courier } : {}),
        deliveryProof
      });
      setShowDeliveryProofForm(false);
    } catch (error) {
      setStageError(error instanceof Error ? error.message : 'Impossible de confirmer la réception.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(courierPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // WhatsApp Message
  const whatsappText = encodeURIComponent(
    `Bonjour ${courierName}, je vous contacte concernant la livraison de la commande Gloryday Pharma n° *${order.reference}* destinée à *${order.customer.facilityName}* (${order.customer.deliveryAddress}). Quel est votre délai estimé d'arrivée ? Merci !`
  );
  const whatsappUrl = `https://wa.me/${courierPhone.replace(/\D/g, '')}?text=${whatsappText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 bg-[#0d44e8]/30 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-400/20">
              <Truck className="w-3 h-3" />
              Suivi de Livraison
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Commande {order.reference}
            </h2>
            <p className="text-slate-300 text-xs mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{order.customer.facilityName}</span>
              <span>·</span>
              <span className="text-slate-400">{order.customer.city || 'Libreville'}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Alert Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            currentStage === 'delivered'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                currentStage === 'delivered' ? 'bg-emerald-600' : 'bg-[#0d44e8]'
              }`}>
                {currentStage === 'delivered' ? <CheckCircle2 className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Statut Actuel</span>
                <span className="font-extrabold text-sm sm:text-base">
                  {stages[currentStageIndex]?.label}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Créneau estimé</span>
              <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                {currentStage === 'delivered' 
                  ? (hasCompleteDeliveryProof ? 'Livré · Réception enregistrée' : 'Livré')
                  : computeDeliveryTimeWindow(order.customer.neighborhoodId).shortWindow}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                {currentStage === 'delivered' ? 'Commande terminée' : deliveryEstimated}
              </span>
            </div>
          </div>

          {/* Interactive Timeline (4 Steps) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Timeline de la Livraison
            </h3>

            <div className="relative pl-7 sm:pl-9 space-y-6 before:content-[''] before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {stages.map((st, idx) => {
                const IconComponent = st.icon;
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const isPending = idx > currentStageIndex;

                return (
                  <div key={st.key} className="relative">
                    {/* Circle Node */}
                    <div className={`absolute -left-7 sm:-left-9 top-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isPassed 
                        ? 'bg-emerald-600 text-white' 
                        : isCurrent 
                          ? 'bg-[#0d44e8] text-white ring-4 ring-blue-100' 
                          : 'bg-slate-100 text-slate-400 border border-slate-300'
                    }`}>
                      {isPassed ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <IconComponent className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm font-bold ${
                          isCurrent ? 'text-[#0d44e8]' : isPassed ? 'text-slate-800' : 'text-slate-400'
                        }`}>
                          {st.label}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#0d44e8]">
                            EN COURS
                          </span>
                        )}
                        {isPassed && (
                          <span className="text-[10px] font-semibold text-emerald-600">
                            Validé ✓
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        {st.sublabel}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                        {st.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Courier Card with Direct Call & WhatsApp */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-xs shrink-0">
                  🛵
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">{courierName}</span>
                    {order.courier?.name && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Coursier affecté</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Véhicule : <strong className="text-slate-700">{courierVehicle}</strong> · Zone : <strong className="text-slate-700">{deliveryZone}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Action Buttons: Call & WhatsApp */}
            {order.courier?.phone && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Call Courier */}
              <a
                href={`tel:${courierPhone}`}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Appeler le Coursier</span>
              </a>

              {/* WhatsApp Courier */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Direct</span>
              </a>
            </div>}

            {/* Quick copy phone number */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/80 px-1">
              <span>Numéro direct : <strong className="text-slate-800 font-mono">{courierPhone}</strong></span>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="text-[#0d44e8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPhone ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          {/* GPS link for the courier's phone and live route map */}
          {order.customer.deliveryMode !== 'retrait' && (
            <section className="space-y-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-slate-950 p-4 text-white">
                <div>
                <h3 className="flex items-center gap-2 text-sm font-black tracking-tight text-white">
                  <MapPin className="h-4 w-4 text-[#0d44e8]" /> Position du livreur
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {latestLocation
                    ? `Dernière mise à jour à ${new Date(latestLocation.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · précision GPS ±${Math.round(latestLocation.accuracy)} m`
                    : 'La carte affichera la position du téléphone du coursier dès qu’il aura accepté le partage GPS.'}
                </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[10px] font-extrabold tracking-wide">
                  <span className={`h-2 w-2 rounded-full ${locationIsRecent ? 'animate-pulse bg-emerald-400' : 'bg-amber-300'}`} />
                  {locationIsRecent ? 'GPS EN DIRECT' : trackingActive ? 'GPS EN ATTENTE' : 'APERÇU GPS'}
                </span>
              </div>

              {isAdmin && canTrackCourier && (
                <div className="space-y-3 rounded-xl border border-blue-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold text-slate-800">
                      {trackingActive
                        ? (locationIsRecent ? 'GPS actif sur le téléphone du coursier' : 'Lien GPS envoyé ou en attente d’activation')
                        : 'Aucun lien de partage actif'}
                    </div>
                    {trackingActive && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />}
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-600">
                    Créez un lien pour cette commande puis transmettez-le au coursier. Il l’ouvrira sur son téléphone et autorisera la géolocalisation.
                    {trackingExpiresAt ? ` Le lien expire le ${new Date(trackingExpiresAt).toLocaleString('fr-FR')}.` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={trackingActionBusy}
                      onClick={() => void handleCreateTrackingLink()}
                      className="rounded-xl bg-[#0d44e8] px-3 py-2 text-[11px] font-extrabold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {trackingActionBusy ? 'Préparation…' : trackingActive ? 'Créer un nouveau lien' : 'Créer le lien du coursier'}
                    </button>
                    {trackingActive && (
                      <button
                        type="button"
                        disabled={trackingActionBusy}
                        onClick={() => void handleRevokeTrackingLink()}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-[11px] font-extrabold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Arrêter le suivi
                      </button>
                    )}
                  </div>
                  {trackingLink && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <input aria-label="Lien de suivi GPS du coursier" readOnly value={trackingLink} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] text-slate-700" />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button type="button" onClick={() => void handleCopyTrackingLink()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                          {trackingLinkCopied ? 'Lien copié' : 'Copier le lien'}
                        </button>
                        {courierPhone && (
                          <a
                            href={`https://wa.me/${courierPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${courierName}, ouvrez ce lien sur votre téléphone et autorisez le GPS pour partager votre position pendant la livraison ${order.reference} : ${trackingLink}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-center text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            Envoyer par WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {trackingActionError && <div role="alert" className="rounded-lg bg-amber-50 p-2 text-[11px] font-semibold text-amber-800">{trackingActionError}</div>}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(235px,0.8fr)]">
              <div>
              {locationPoints.length ? (
                <LiveDeliveryMap
                  points={locationPoints}
                  destination={hasConfirmedOrderGps ? { lat: coordinates!.lat, lng: coordinates!.lng } : undefined}
                />
              ) : (
                <div className="hidden">
                  {trackingActive ? 'En attente de la première position envoyée par le coursier…' : 'Aucune position GPS reçue pour le moment.'}
                </div>
              )}
              {!locationPoints.length && <LiveDeliveryMap points={[]} destination={hasConfirmedOrderGps ? { lat: coordinates!.lat, lng: coordinates!.lng } : undefined} destinationLabel={order.customer.facilityName} />}
              </div>
              <aside className="flex flex-col gap-3 rounded-[24px] bg-slate-50 p-3 sm:p-4">
                <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Arrivée estimée</div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{deliveryEstimated}</div>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                    <span className={`h-2 w-2 rounded-full ${locationIsRecent ? 'animate-pulse bg-emerald-500' : 'bg-amber-400'}`} />
                    {locationIsRecent ? 'Position actualisée' : trackingActive ? 'En attente du signal GPS' : 'Partage GPS à démarrer'}
                  </div>
                </div>
                <div className="relative flex-1 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
                  <div className="absolute bottom-9 left-[25px] top-10 w-px bg-slate-200" />
                  <div className="relative flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-black text-blue-700">1</span>
                    <div><div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Départ</div><div className="mt-0.5 text-xs font-extrabold text-slate-900">Dépôt Gloryday Pharma</div></div>
                  </div>
                  <div className="relative flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700"><MapPin className="h-3 w-3" /></span>
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Destination de la commande {order.reference}</div>
                      <div className="mt-0.5 truncate text-xs font-extrabold text-slate-900">{order.customer.facilityName}</div>
                      <div className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{order.customer.deliveryAddress || deliveryZone}</div>
                      {hasConfirmedOrderGps ? (
                        <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
                          <div className="text-[9px] font-black uppercase tracking-wider text-emerald-800">GPS relevé pour cette commande</div>
                          <div className="mt-1 font-mono text-[11px] font-extrabold tabular-nums text-slate-900">{coordinates!.lat.toFixed(6)}, {coordinates!.lng.toFixed(6)}</div>
                          <div className="mt-0.5 text-[10px] font-semibold text-slate-600">{Number.isFinite(coordinates!.accuracy) ? `Précision au relevé ±${Math.round(coordinates!.accuracy!)} m` : 'Précision du relevé non conservée'}</div>
                        </div>
                      ) : hasPreciseCoordinates ? (
                        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                          <div className="text-[9px] font-black uppercase tracking-wider text-amber-800">Ancien point GPS à confirmer</div>
                          <div className="mt-1 font-mono text-[11px] font-extrabold tabular-nums text-slate-900">{coordinates!.lat.toFixed(6)}, {coordinates!.lng.toFixed(6)}</div>
                          <div className="mt-0.5 text-[10px] font-semibold leading-relaxed text-amber-900">Ce point provient d’une ancienne commande ou du profil. L’itinéraire utilise l’adresse écrite tant qu’un GPS n’est pas relevé au passage de commande.</div>
                        </div>
                      ) : (
                        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-amber-900">GPS précis non enregistré pour cette commande. L’itinéraire utilise seulement l’adresse et le quartier saisis.</div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-3"><div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Étape actuelle</div><div className="mt-1 text-xs font-bold text-slate-800">{stages[currentStageIndex]?.label}</div></div>
                  {latestLocation && <div className="border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-500">Dernier signal à {new Date(latestLocation.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · précision ±{Math.round(latestLocation.accuracy)} m</div>}
                </div>
                {googleMapsUrl && <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"><Navigation className="h-4 w-4" /> Ouvrir l’itinéraire <ExternalLink className="h-3.5 w-3.5" /></a>}
              </aside>
              </div>
              <div className="rounded-xl bg-blue-50 px-3 py-2 text-[10px] leading-relaxed text-blue-900">
                Épingle rouge : destination de cette commande. Point bleu : dernière position transmise par le livreur. Le trait bleu relie les relevés reçus ; il ne calcule pas un itinéraire routier.
              </div>
              {locationLoadError && <div role="alert" className="rounded-lg bg-rose-50 p-2 text-[11px] font-semibold text-rose-800">{locationLoadError}</div>}
              {isAdmin && canTrackCourier && <p className="text-[10px] leading-relaxed text-slate-600">La position est actualisée environ toutes les 15 secondes pendant que le coursier garde la page ouverte. Le client de cette commande et la logistique voient la carte.</p>}
            </section>
          )}

          {/* Delivery Destination Recap */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 text-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Détails de la Livraison
            </span>
            <div className="flex items-start gap-2.5 text-slate-700">
              <MapPin className="w-4 h-4 text-[#0d44e8] shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">{order.customer.facilityName}</strong>
                <div className="text-slate-500 text-[11px]">{order.customer.deliveryAddress}</div>
                <div className="text-slate-500 text-[11px]">Contact réception : {order.customer.contactName} ({order.customer.phone})</div>
                {googleMapsUrl ? (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 font-bold text-[#0d44e8] hover:bg-blue-100"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Ouvrir l’itinéraire dans Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : order.customer.deliveryMode === 'retrait' ? (
                  <div className="mt-2 text-[11px] text-slate-500">Retrait au dépôt Gloryday Pharma.</div>
                ) : null}
                <div className="text-[10px] text-slate-400 mt-1">
                  Google Maps ouvre l’itinéraire vers l’établissement. La position du coursier n’est pas suivie en direct.
                </div>
                {order.deliveryProof && (
                  <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-900">
                    Réception enregistrée : <strong>{order.deliveryProof.receivedBy}</strong>
                    {order.deliveryProof.receiptReference ? ` · Bon signé : ${order.deliveryProof.receiptReference}` : ''}
                  </div>
                )}
                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                  {order.isPaid ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Déjà Réglé ({order.mobilePayment?.provider === 'airtel_money' ? 'Airtel Money' : order.mobilePayment?.provider === 'moov_money' ? 'Moov Money' : order.customer.paymentMethod.toUpperCase()}) {order.mobilePayment?.transactionReference ? `· Réf ${order.mobilePayment.transactionReference}` : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      ⚠️ Encaisser {order.estimatedTotal.toLocaleString('fr-FR')} FCFA ({order.customer.paymentMethod === 'airtel_money' ? 'Airtel 077 00 30 04' : order.customer.paymentMethod === 'moov_money' ? 'Moov 066 24 03 99' : 'Espèces'})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Automated WhatsApp Notifications Section (RESERVED STRICTLY FOR STAFF & ADMINS) */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  Notification WhatsApp ({stages[currentStageIndex]?.label})
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-900 font-extrabold bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                    <Zap className="w-3 h-3 text-emerald-600" />
                    Envoi manuel
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                    Staff Only
                  </span>
                </div>
              </div>

              <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Message prêt à envoyer :</span>
                </div>
                Aucun message ne part automatiquement et aucun envoi n’est archivé. Ouvrez WhatsApp ci-dessous puis envoyez le message manuellement si nécessaire.
              </div>

              {/* Action buttons (Backup manuel pour la logistique) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href={generateWhatsAppMessageForStage(order, currentStage).directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Renvoyer Manuellement (WhatsApp)</span>
                </a>

                <a
                  href={generateCourierMissionWhatsApp(order).directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer text-center"
                >
                  <Truck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ordre de Mission Coursier</span>
                </a>
              </div>

              {/* Toggle Preview, Copy & Audit Logs */}
              <div className="pt-1 flex items-center justify-between text-xs border-t border-emerald-200/60 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMsgPreview(!showMsgPreview)}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showMsgPreview ? 'Masquer texte' : 'Aperçu du message'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showMsgPreview ? 'rotate-180' : ''}`} />
                  </button>

                  {order.whatsappLogs && order.whatsappLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowLogs(!showLogs)}
                      className="text-[11px] font-bold text-[#0d44e8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Journal d'audit ({order.whatsappLogs.length})</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const payload = generateWhatsAppMessageForStage(order, currentStage);
                    navigator.clipboard.writeText(payload.messageText);
                    setCopiedMsg(true);
                    setTimeout(() => setCopiedMsg(false), 2000);
                  }}
                  className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                >
                  {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMsg ? 'Texte copié !' : 'Copier le texte'}</span>
                </button>
              </div>

              {/* Expandable Preview */}
              {showMsgPreview && (
                <div className="p-3 rounded-xl bg-white border border-emerald-200 text-[11px] font-mono text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {generateWhatsAppMessageForStage(order, currentStage).messageText}
                </div>
              )}

              {/* Expandable Audit Log */}
              {showLogs && order.whatsappLogs && order.whatsappLogs.length > 0 && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                  <div className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#0d44e8]" />
                    Historique WhatsApp hérité (aucun envoi automatique configuré)
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {order.whatsappLogs.map((log) => (
                      <div key={log.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-[11px]">{log.stageLabel}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-black text-emerald-700 bg-emerald-100">
                              ✓ {log.status === 'sent' ? 'Envoyé API' : log.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Destinataire : <strong className="text-slate-700">{log.recipientName}</strong> ({log.recipientPhone})
                          </div>
                          <div className="text-[10px] text-slate-400 italic">
                            Déclenché par : {log.triggeredBy}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Staff / Logistics Controls */}
          {isAdmin && onUpdateStage && (
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Gestion de la livraison
                </span>
                <span className="text-[11px] text-purple-700 font-medium">
                  Mise à jour du suivi et de la cloche client
                </span>
              </div>

              {['Confirmée', 'En préparation'].includes(order.status) && (
                <div className="rounded-xl border border-purple-200 bg-white p-3 space-y-2">
                  <strong className="block text-xs text-slate-800">Affecter le coursier</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input aria-label="Nom du coursier" value={courierDraft.name} onChange={event => setCourierDraft(previous => ({ ...previous, name: event.target.value }))} placeholder="Nom du coursier" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                    <input aria-label="Téléphone du coursier" value={courierDraft.phone} onChange={event => setCourierDraft(previous => ({ ...previous, phone: event.target.value }))} placeholder="Téléphone du coursier" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                    <input aria-label="Véhicule du coursier" value={courierDraft.vehicle || ''} onChange={event => setCourierDraft(previous => ({ ...previous, vehicle: event.target.value }))} placeholder="Véhicule (facultatif)" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                    <input aria-label="Matricule du coursier" value={courierDraft.matricule || ''} onChange={event => setCourierDraft(previous => ({ ...previous, matricule: event.target.value }))} placeholder="Matricule (facultatif)" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                    <input aria-label="Zone actuelle du coursier" value={courierDraft.currentZone || ''} onChange={event => setCourierDraft(previous => ({ ...previous, currentZone: event.target.value }))} placeholder="Zone actuelle (facultatif)" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                    <input aria-label="Délai estimé du coursier" value={courierDraft.estimatedTime || ''} onChange={event => setCourierDraft(previous => ({ ...previous, estimatedTime: event.target.value }))} placeholder="Délai estimé (facultatif)" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                  </div>
                  <button type="button" disabled={isUpdating || !courierDraft.name.trim() || !courierDraft.phone.trim()} onClick={handleSaveCourier} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {isUpdating ? 'Enregistrement…' : 'Enregistrer le coursier'}
                  </button>
                </div>
              )}
              {order.status === 'À confirmer' && (
                <p className="text-[11px] text-slate-600">Affectez le coursier après confirmation de la commande.</p>
              )}

              {needsLegacyDeliveryProof && !showDeliveryProofForm && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  Cette ancienne commande est marquée livrée sans preuve complète.
                  <button type="button" onClick={() => { setStageError(''); setShowDeliveryProofForm(true); }} className="ml-2 font-bold underline">Ajouter la preuve</button>
                </div>
              )}

              {showDeliveryProofForm && (
                <div className="rounded-xl border border-emerald-300 bg-white p-3 space-y-2">
                  <strong className="block text-xs text-slate-800">Confirmer la réception</strong>
                  <input aria-label="Nom de la personne qui reçoit" value={receivedBy} onChange={event => setReceivedBy(event.target.value)} placeholder="Nom de la personne qui reçoit" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                  <input aria-label="Référence du bon de livraison signé" value={receiptReference} onChange={event => setReceiptReference(event.target.value)} placeholder="Référence du bon de livraison signé" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                  <div className="flex gap-2">
                    <button type="button" disabled={isUpdating} onClick={handleConfirmDelivery} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{isUpdating ? 'Enregistrement…' : 'Enregistrer la réception'}</button>
                    <button type="button" disabled={isUpdating} onClick={() => setShowDeliveryProofForm(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Retour</button>
                  </div>
                </div>
              )}

              {canAdvanceDelivery && nextStage && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-600">Prochaine étape : <strong>{stages[currentStageIndex + 1]?.label}</strong></div>
                  <button
                    type="button"
                    disabled={isUpdating || (nextStage === 'picked_up' && !(order.courier || (courierDraft.name.trim() && courierDraft.phone.trim())))}
                    onClick={() => handleStageChange(nextStage)}
                    className="w-full rounded-xl bg-purple-700 px-3 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdating ? 'Enregistrement…' : nextStage === 'delivered' ? 'Confirmer la livraison' : 'Passer à l’étape suivante'}
                  </button>
                </div>
              )}

              {isOrderActive && order.status !== 'En préparation' && (
                <p className="text-[11px] text-slate-600">Le suivi du coursier commence après confirmation de la commande et lancement du colisage.</p>
              )}
              {order.status === 'Annulée' && <p className="text-[11px] font-semibold text-rose-700">Commande annulée : son suivi ne peut plus avancer.</p>}

              {stageError && <div role="alert" className="rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-800">{stageError}</div>}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Assistance Logistique : <a href="tel:+24177003004" className="font-bold text-[#0d44e8] hover:underline">+241 77 003 004</a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
