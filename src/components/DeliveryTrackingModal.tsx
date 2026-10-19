import React, { useState } from 'react';
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
import { Order, DeliveryStage } from '../types';
import { generateWhatsAppMessageForStage, generateCourierMissionWhatsApp } from '../utils/whatsappNotifications';
import { computeDeliveryTimeWindow } from '../data/librevilleZones';

interface DeliveryTrackingModalProps {
  isOpen: boolean;
  order: Order;
  onClose: () => void;
  onUpdateStage?: (orderId: string, stage: DeliveryStage) => Promise<void>;
  isAdmin?: boolean;
}

export const DeliveryTrackingModal: React.FC<DeliveryTrackingModalProps> = ({
  isOpen,
  order,
  onClose,
  onUpdateStage,
  isAdmin = false
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [showMsgPreview, setShowMsgPreview] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !order) return null;

  const currentStage: DeliveryStage = order.deliveryStage || (
    order.status === 'Livrée' ? 'delivered' :
    order.status === 'En préparation' ? 'preparation' :
    'picked_up'
  );

  const courierName = order.courier?.name || 'Alexandre Moundounga (Livreur Médical)';
  const courierPhone = order.courier?.phone || '+24177003004';
  const courierVehicle = order.courier?.vehicle || 'Moto Médicale GP-04';
  const deliveryZone = order.deliveryZone || (
    order.customer.deliveryAddress?.toLowerCase().includes('akanda') ? 'Akanda' :
    order.customer.deliveryAddress?.toLowerCase().includes('owendo') ? 'Owendo' :
    'Grand Libreville'
  );
  const deliveryEstimated = order.deliveryEstimated || 'Dans 45 minutes';

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

  const handleStageChange = async (targetStage: DeliveryStage) => {
    if (!onUpdateStage) return;
    try {
      setIsUpdating(true);
      await onUpdateStage(order.id, targetStage);
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
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 bg-[#0d44e8]/30 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-400/20">
              <Truck className="w-3 h-3" />
              Suivi de Livraison en Direct
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
                {currentStage === 'delivered' ? <CheckCircle2 className="w-5 h-5" /> : <Truck className="w-5 h-5 animate-pulse" />}
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
                  ? 'Livré & Émargé' 
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
                          ? 'bg-[#0d44e8] text-white ring-4 ring-blue-100 animate-pulse' 
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
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Certifié Gloryday
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Véhicule : <strong className="text-slate-700">{courierVehicle}</strong> · Zone : <strong className="text-slate-700">{deliveryZone}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Action Buttons: Call & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
            </div>

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
                    Automate API Actif
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                    Staff Only
                  </span>
                </div>
              </div>

              <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100 text-[11px] text-emerald-900 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Déclenchement automatique via module 'api' :</span>
                </div>
                À chaque mise à jour de statut ci-dessous, le message WhatsApp médical est automatiquement expédié et archivé dans le journal d'audit pour <strong>{order.customer.facilityName}</strong> ({order.customer.phone}).
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
                    Historique des envois automatiques API
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

          {/* Staff / Logistics Controls (Cycle stages to test or update) */}
          {isAdmin && onUpdateStage && (
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Contrôle Logistique (Staff Only)
                </span>
                <span className="text-[11px] text-purple-700 font-medium">
                  Changer l'étape & déclencher la notif
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
                {stages.map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    disabled={isUpdating || currentStage === st.key}
                    onClick={() => handleStageChange(st.key)}
                    className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer ${
                      currentStage === st.key
                        ? 'bg-purple-700 text-white shadow-xs font-black ring-2 ring-purple-400'
                        : 'bg-white hover:bg-purple-100 text-purple-950 border border-purple-200'
                    }`}
                  >
                    {st.key === 'preparation' ? '1. Préparation' :
                     st.key === 'picked_up' ? '2. Prise en charge' :
                     st.key === 'in_transit' ? '3. Acheminement' :
                     '4. Livré'}
                  </button>
                ))}
              </div>
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
