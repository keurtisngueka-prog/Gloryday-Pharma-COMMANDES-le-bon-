import React, { useEffect, useState } from 'react';
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
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Order } from '../types';
import { getOrderRemainingBalance } from '../utils/orderFinance';

interface MobilePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  allOrders?: Order[];
  onPaymentConfirmed?: (payment: {
    transactionId: string;
    operator: 'airtel_money' | 'moov_money';
    amount: number;
    paymentType: 'total' | 'partial';
    plannedRemainderDueDate?: string;
  }) => Promise<void>;
}

export const MobilePaymentModal: React.FC<MobilePaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  allOrders,
  onPaymentConfirmed
}) => {
  const [operator, setOperator] = useState<'airtel_money' | 'moov_money'>('airtel_money');
  const [paymentType, setPaymentType] = useState<'total' | 'partial' | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [plannedRemainderDueDate, setPlannedRemainderDueDate] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPaymentType(null);
    setPartialAmount('');
    setPlannedRemainderDueDate('');
    setTransactionRef('');
    setError(null);
    setSuccess(false);
    setCopiedCode(false);
    setCopiedPhone(false);
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const airtelNumber = '+241 77 003 004';
  const moovNumber = '+241 66 240 399';
  const activeNumber = operator === 'airtel_money' ? airtelNumber : moovNumber;
  const activeUssd = operator === 'airtel_money' ? '*150#' : '*555#';
  const remainingBalance = getOrderRemainingBalance(order);
  const paymentAmount = paymentType === 'total'
    ? remainingBalance
    : paymentType === 'partial' ? Math.trunc(Number(partialAmount) || 0) : 0;
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const todayDateKey = `${dateParts.find((part) => part.type === 'year')?.value}-${dateParts.find((part) => part.type === 'month')?.value}-${dateParts.find((part) => part.type === 'day')?.value}`;
  const nextDate = new Date(`${todayDateKey}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const minimumRemainderDate = nextDate.toISOString().slice(0, 10);
  const validPaymentAmount = paymentType !== null && paymentAmount > 0 && paymentAmount <= remainingBalance &&
    (paymentType === 'total' || (paymentAmount < remainingBalance && Boolean(plannedRemainderDueDate) && plannedRemainderDueDate > todayDateKey));

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

  // Check for duplicate transaction references
  const duplicateOrder = transactionRef.trim() && allOrders
    ? allOrders.find(
        o => o.id !== order.id && 
        o.mobilePayment?.transactionReference?.toLowerCase() === transactionRef.trim().toLowerCase()
      )
    : null;

  const handleValidatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentType) {
      setError('Choisissez d’abord un paiement total ou partiel.');
      return;
    }
    if (!transactionRef.trim()) {
      setError('Veuillez renseigner le numéro de transaction ou référence SMS reçu.');
      return;
    }
    if (!validPaymentAmount) {
      setError(paymentType === 'partial'
        ? 'Pour un paiement partiel, indiquez un montant inférieur au solde et la date prévue du règlement restant.'
        : 'Le montant à régler n’est pas valide. Actualisez la commande puis réessayez.');
      return;
    }

    if (duplicateOrder) {
      setError('Cette référence est déjà associée à une autre de vos commandes. Utilisez une référence unique.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      if (!onPaymentConfirmed) throw new Error('La transmission de la référence de paiement n’est pas disponible.');
      await onPaymentConfirmed({
        transactionId: transactionRef.trim(),
        operator,
        amount: paymentAmount,
        paymentType,
        ...(paymentType === 'partial' ? { plannedRemainderDueDate } : {})
      });
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
    const paymentPeriod = paymentType === 'partial' ? `\n- Solde prévu le : *${plannedRemainderDueDate}*` : '';
    const msg = `Bonjour Gloryday Pharma Gabon,\nJe transmets le justificatif de paiement ${paymentType === 'partial' ? 'partiel' : 'total'} pour la commande *${order.reference}* :\n- Montant versé : *${paymentAmount.toLocaleString('fr-FR')} FCFA*${paymentPeriod}\n- Opérateur : *${operator === 'airtel_money' ? 'Airtel Money' : 'Moov Money'}*\n- Réf Transaction : *${transactionRef || 'En attente'}*\n- Établissement : *${order.customer.facilityName}*\nMerci de vérifier le versement.`;
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
          {/* Remaining balance */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-600 font-bold uppercase text-[10px]">
              Solde restant de la commande
            </span>
            <div className="text-right">
              <span className="text-lg font-black text-slate-900 tabular-nums">
                {remainingBalance.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-[#0d44e8] ml-1">FCFA</span>
            </div>
          </div>

          <section aria-labelledby="payment-type-label" className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5">
            <h3 id="payment-type-label" className="text-[11px] font-black uppercase tracking-wide text-slate-800">Comment souhaitez-vous régler ? <span className="text-rose-700">(obligatoire)</span></h3>
            <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-labelledby="payment-type-label">
              <button type="button" aria-pressed={paymentType === 'total'} onClick={() => { setPaymentType('total'); setError(null); }} className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${paymentType === 'total' ? 'border-emerald-600 bg-white text-emerald-900 ring-2 ring-emerald-100' : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'}`}>
                <span className="block text-xs font-black">Paiement total</span>
                <span className="mt-0.5 block text-[10px] text-slate-600">{remainingBalance.toLocaleString('fr-FR')} FCFA</span>
              </button>
              <button type="button" aria-pressed={paymentType === 'partial'} onClick={() => { setPaymentType('partial'); setError(null); }} className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${paymentType === 'partial' ? 'border-emerald-600 bg-white text-emerald-900 ring-2 ring-emerald-100' : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'}`}>
                <span className="block text-xs font-black">Paiement partiel</span>
                <span className="mt-0.5 block text-[10px] text-slate-600">Choisir le montant</span>
              </button>
            </div>
            {paymentType === 'partial' ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-[11px] font-bold text-slate-700">Montant versé (FCFA)
                  <input type="number" inputMode="numeric" min="1" max={Math.max(0, remainingBalance - 1)} step="1" required value={partialAmount} onChange={(event) => setPartialAmount(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold tabular-nums outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" placeholder="Ex. 25 000" />
                </label>
                <label className="text-[11px] font-bold text-slate-700">Date prévue pour le solde
                  <input type="date" min={minimumRemainderDate} required value={plannedRemainderDueDate} onChange={(event) => setPlannedRemainderDueDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
                </label>
                <p className="text-[10px] leading-relaxed text-slate-600 sm:col-span-2">Gloryday vérifiera le versement et la date proposée avant de mettre à jour le solde dû.</p>
              </div>
            ) : (
              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700">{paymentType === 'total' ? 'Le montant à envoyer est le solde restant affiché ci-dessus.' : 'Choisissez le type de paiement pour afficher le montant à envoyer.'}</p>
            )}
          </section>

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
                <span>Ouvrez le menu <strong>{activeUssd}</strong> sur votre téléphone.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-200 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Choisissez le transfert vers un numéro, puis saisissez le numéro de réception indiqué ci-dessous :</span>
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
                <span>{paymentType ? <>Saisissez <strong>{paymentAmount.toLocaleString('fr-FR')} FCFA</strong>, vérifiez le nom du bénéficiaire et confirmez dans le menu opérateur.</> : 'Choisissez d’abord le paiement total ou partiel pour connaître le montant à envoyer.'}</span>
              </div>
            </div>
            <a
              href={`tel:${encodeURIComponent(activeUssd)}`}
              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-xs ${operator === 'airtel_money' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-blue-700 hover:bg-blue-800'}`}
            >
              <ExternalLink className="h-4 w-4" /> Ouvrir {operator === 'airtel_money' ? 'Airtel Money' : 'Moov Money'} ({activeUssd})
            </a>
            <p className="text-[10px] leading-relaxed text-slate-500">Le lien ouvre le composeur du téléphone avec le code. Selon le téléphone et la SIM, vous devrez encore appuyer sur Appeler. Le menu demande ensuite les informations et le montant.</p>
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
              <span>Demande de paiement transmise ({paymentType === 'partial' ? 'partielle' : 'totale'} · {paymentAmount.toLocaleString('fr-FR')} FCFA). Gloryday vérifiera le versement avant d’actualiser le solde.</span>
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


            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting || success || !validPaymentAmount || Boolean(duplicateOrder)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'Transmission...' : 'Transmettre ma référence'}</span>
              </button>

              <a
              href={validPaymentAmount ? generateWhatsAppProofUrl() : undefined}
                target="_blank"
                rel="noopener noreferrer"
              aria-disabled={!validPaymentAmount}
              onClick={(event) => { if (!validPaymentAmount) event.preventDefault(); }}
              className={`py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs text-center ${validPaymentAmount ? 'hover:bg-emerald-700 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
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
