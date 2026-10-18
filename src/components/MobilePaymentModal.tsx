import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  CheckCircle2, 
  Copy, 
  Check, 
  MessageCircle, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Order } from '../types';

interface MobilePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  allOrders?: Order[];
  onPaymentConfirmed?: (transactionId: string, operator: 'airtel_money' | 'moov_money', status?: 'verified' | 'failed') => Promise<void>;
}

export const MobilePaymentModal: React.FC<MobilePaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  allOrders,
  onPaymentConfirmed
}) => {
  const [operator, setOperator] = useState<'airtel_money' | 'moov_money'>('airtel_money');
  const [transactionRef, setTransactionRef] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !order) return null;

  const airtelNumber = '+241 77 003 004';
  const moovNumber = '+241 66 240 399';
  const airtelMerchantCode = 'GLORYDAY-AIRTEL';
  const moovMerchantCode = 'GLORYDAY-MOOV';

  const activeNumber = operator === 'airtel_money' ? airtelNumber : moovNumber;
  const activeCode = operator === 'airtel_money' ? airtelMerchantCode : moovMerchantCode;
  const activeUssd = operator === 'airtel_money' ? '*150#' : '*555#';

  const handleCopy = (text: string, type: 'code' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const [paymentStatusChoice, setPaymentStatusChoice] = useState<'verified' | 'failed'>('verified');

  // Check for duplicate transaction references
  const duplicateOrder = transactionRef.trim() && allOrders
    ? allOrders.find(
        o => o.id !== order.id && 
        o.mobilePayment?.transactionReference?.toLowerCase() === transactionRef.trim().toLowerCase()
      )
    : null;

  const handleValidatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      setError('Veuillez renseigner le numéro de transaction ou référence SMS reçu.');
      return;
    }

    if (duplicateOrder) {
      const confirmDup = window.confirm(
        `ALERTE SÉCURITÉ : La référence ${transactionRef.trim()} a DÉJÀ été utilisée sur la commande ${duplicateOrder.reference} (${duplicateOrder.customer.facilityName}).\n\nSouhaitez-vous continuer malgré le risque de doublon / fraude ?`
      );
      if (!confirmDup) return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      if (onPaymentConfirmed) {
        await onPaymentConfirmed(transactionRef.trim(), operator, paymentStatusChoice);
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la validation du paiement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp verification link
  const generateWhatsAppProofUrl = () => {
    const cleanNum = (operator === 'airtel_money' ? '24177003004' : '24166240399');
    const msg = `Bonjour Gloryday Pharma Gabon,\nJe vous transmets la preuve de paiement Mobile Money pour la commande *${order.reference}* :\n- Montant : *${order.estimatedTotal.toLocaleString('fr-FR')} FCFA*\n- Opérateur : *${operator === 'airtel_money' ? 'Airtel Money' : 'Moov Money'}*\n- Réf Transaction : *${transactionRef || 'En attente'}*\n- Établissement : *${order.customer.facilityName}*\nMerci de valider l'encaissement et de lancer la livraison.`;
    return `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Top Header */}
        <div className="bg-[#0f0f12] text-white p-5 flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-emerald-400/20">
              <ShieldCheck className="w-3 h-3" />
              Paiement Sécurisé Gabon
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Paiement Mobile Money
            </h2>
            <p className="text-slate-300 text-xs mt-0.5">
              Réf Commande : <strong className="text-white font-mono">{order.reference}</strong>
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Amount Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-600 font-bold uppercase text-[10px]">
              Montant Net à Régler
            </span>
            <div className="text-right">
              <span className="text-lg font-black text-slate-900 tabular-nums">
                {order.estimatedTotal.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-[#0d44e8] ml-1">FCFA</span>
            </div>
          </div>

          {/* Operator Selector (Airtel Money vs Moov Money) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
              Choisissez votre opérateur au Gabon :
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOperator('airtel_money')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                  operator === 'airtel_money'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs ring-2 ring-rose-200'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-black text-rose-600">Airtel Money</div>
                <span className="text-[10px] text-slate-500">Syntaxe : *150#</span>
              </button>

              <button
                type="button"
                onClick={() => setOperator('moov_money')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                  operator === 'moov_money'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-black text-blue-600">Moov Money</div>
                <span className="text-[10px] text-slate-500">Syntaxe : *555#</span>
              </button>
            </div>
          </div>

          {/* Instructions Step by Step */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
              Instructions de Règlement Rapide :
            </span>
            <div className="space-y-1.5 text-[11px] text-slate-700">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Composez <strong>{activeUssd}</strong> sur votre téléphone.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Sélectionnez <strong>Paiement / Marchand</strong> ou <strong>Transfert direct</strong> vers le numéro :</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between ml-6">
                <strong className="font-mono text-slate-900 text-xs">{activeNumber}</strong>
                <button
                  type="button"
                  onClick={() => handleCopy(activeNumber.replace(/\s+/g, ''), 'phone')}
                  className="text-[#0d44e8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPhone ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Indiquez le montant exact de <strong>{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong> et validez avec votre code secret.</span>
              </div>
            </div>
          </div>

          {/* Transaction Confirmation Form */}
          <form onSubmit={handleValidatePayment} className="space-y-3 pt-1">
            {duplicateOrder && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>DOUBLON DÉTECTÉ : Référence déjà existante</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Cette référence est déjà liée à la commande <strong>{duplicateOrder.reference}</strong> ({duplicateOrder.customer.facilityName}).
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Rapprochement enregistré avec succès !</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Numéro de Transaction / Réf SMS reçu * :
              </label>
              <input
                type="text"
                required
                placeholder="Ex: MP260408.1422.B04523 ou REF-12345"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:ring-2 focus:ring-[#0d44e8] ${
                  duplicateOrder ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300'
                }`}
              />
            </div>

            {/* Status selection : verified vs failed */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Résultat du rapprochement bancaire / opérateur :
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatusChoice('verified')}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    paymentStatusChoice === 'verified'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  ✓ Conforme (Verified)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusChoice('failed')}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    paymentStatusChoice === 'failed'
                      ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  ✗ Rejeté (Failed)
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting || success}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'Validation...' : 'Valider mon règlement'}</span>
              </button>

              <a
                href={generateWhatsAppProofUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs text-center"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Preuve WhatsApp</span>
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
