import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Check, 
  Copy, 
  PhoneCall, 
  ShieldCheck, 
  Upload, 
  Trash2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  MessageCircle,
  HelpCircle,
  FileCheck2
} from 'lucide-react';
import { MobilePaymentDetails } from '../types';

interface MobilePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderTotal: number;
  orderReference?: string;
  facilityName?: string;
  initialProvider?: 'airtel_money' | 'moov_money';
  initialDetails?: MobilePaymentDetails;
  onSavePayment: (details: MobilePaymentDetails) => Promise<void> | void;
  onSendWhatsApp?: (details: MobilePaymentDetails) => void;
}

export const MobilePaymentModal: React.FC<MobilePaymentModalProps> = ({
  isOpen,
  onClose,
  orderTotal,
  orderReference = 'Nouvelle Commande',
  facilityName,
  initialProvider = 'airtel_money',
  initialDetails,
  onSavePayment,
  onSendWhatsApp
}) => {
  const [provider, setProvider] = useState<'airtel_money' | 'moov_money'>(
    initialDetails?.provider || initialProvider
  );
  const [isPrePaid, setIsPrePaid] = useState<boolean>(
    initialDetails?.isPrePaid ?? true
  );
  const [transactionRef, setTransactionRef] = useState<string>(
    initialDetails?.transactionReference || ''
  );
  const [senderPhone, setSenderPhone] = useState<string>(
    initialDetails?.senderPhone || ''
  );
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(
    initialDetails?.screenshotUrl
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUssdGuide, setShowUssdGuide] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAirtel = provider === 'airtel_money';
  const merchantPhone = isAirtel ? '077003004' : '066240399';
  const formattedMerchantPhone = isAirtel ? '077 00 30 04' : '066 24 03 99';
  const ussdCode = isAirtel ? '*150#' : '*555#';
  const directUssdSyntax = isAirtel 
    ? `*150*1*1*077003004*${orderTotal}#` 
    : `*555*1*1*066240399*${orderTotal}#`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('L\'image dépasse 4 Mo. Veuillez sélectionner une capture plus légère.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const res = uploadEvent.target?.result as string;
      setScreenshotUrl(res);
    };
    reader.readAsDataURL(file);
  };

  // Transaction reference validity check
  const cleanRef = transactionRef.trim().toUpperCase();
  const isValidRefFormat = cleanRef.length >= 5;
  const isAirtelTypical = cleanRef.startsWith('CI') || /^[A-Z0-9]{6,16}$/.test(cleanRef);
  const isMoovTypical = cleanRef.startsWith('TXN') || cleanRef.startsWith('TRX') || /^[A-Z0-9]{6,16}$/.test(cleanRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    const details: MobilePaymentDetails = {
      provider,
      merchantPhone,
      transactionReference: cleanRef || undefined,
      senderPhone: senderPhone.trim() || undefined,
      isPrePaid,
      screenshotUrl,
      status: cleanRef ? (isPrePaid ? 'submitted' : 'pending') : 'pending',
      amount: orderTotal,
      ussdDialCode: directUssdSyntax,
      validatedAt: cleanRef ? new Date().toISOString() : undefined
    };

    try {
      await onSavePayment(details);
      setSuccessMessage('Règlement mobile enregistré avec succès !');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to save mobile payment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header with Provider Theme */}
        <div className={`p-4 sm:p-5 text-white flex items-start justify-between relative transition-colors ${
          isAirtel ? 'bg-gradient-to-r from-red-600 to-rose-700' : 'bg-gradient-to-r from-[#0d44e8] to-blue-700'
        }`}>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-white shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">
                  Paiement Mobile Gabon
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/25 text-white tracking-wider">
                  {isAirtel ? 'Airtel Money' : 'Moov Money'}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Règlement direct pour <strong className="text-white">{facilityName || orderReference}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer relative z-10"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Sélectionnez l'opérateur mobile
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setProvider('airtel_money')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isAirtel
                    ? 'border-red-600 bg-red-50/70 shadow-xs ring-2 ring-red-600/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  AM
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs font-black truncate ${isAirtel ? 'text-red-950' : 'text-slate-800'}`}>
                    Airtel Money
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 block">
                    Code USSD *150#
                  </span>
                </div>
                {isAirtel && <Check className="w-4 h-4 text-red-600 ml-auto shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setProvider('moov_money')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  !isAirtel
                    ? 'border-[#0d44e8] bg-blue-50/70 shadow-xs ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-[#0d44e8] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  MM
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs font-black truncate ${!isAirtel ? 'text-blue-950' : 'text-slate-800'}`}>
                    Moov Money
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 block">
                    Code USSD *555#
                  </span>
                </div>
                {!isAirtel && <Check className="w-4 h-4 text-[#0d44e8] ml-auto shrink-0" />}
              </button>
            </div>
          </div>

          {/* Official Merchant Details Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Coordonnées Marchand Gloryday Pharma
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Compte Professionnel Certifié
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Merchant Phone Card */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold block">Numéro Marchand</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                    {formattedMerchantPhone}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(merchantPhone, 'merchant-num')}
                    className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
                    title="Copier le numéro"
                  >
                    {copiedKey === 'merchant-num' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Amount to pay */}
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold block">Montant Net (Sans TVA)</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                    {orderTotal.toLocaleString('fr-FR')} F
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(orderTotal), 'amount-copy')}
                    className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
                    title="Copier le montant"
                  >
                    {copiedKey === 'amount-copy' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Direct USSD Quick String & Direct Dial */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Commande USSD pré-remplie :
                </span>
                <code className="text-xs font-mono font-bold text-slate-800 break-all select-all">
                  {directUssdSyntax}
                </code>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => copyToClipboard(directUssdSyntax, 'ussd-str')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedKey === 'ussd-str' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier USSD</span>
                    </>
                  )}
                </button>
                <a
                  href={`tel:${encodeURIComponent(directUssdSyntax)}`}
                  className={`px-2.5 py-1 rounded-lg text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors ${
                    isAirtel ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0d44e8] hover:bg-blue-700'
                  }`}
                  title="Composer immédiatement sur votre téléphone"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Composer</span>
                </a>
              </div>
            </div>
          </div>

          {/* Toggle Step-by-Step Instructions */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowUssdGuide(!showUssdGuide)}
              className="w-full p-3 bg-slate-50/80 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Guide pas-à-pas pour la validation ({isAirtel ? 'Airtel Money' : 'Moov Money'})</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {showUssdGuide ? 'Masquer ▲' : 'Afficher ▼'}
              </span>
            </button>

            {showUssdGuide && (
              <div className="p-3.5 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Tapez <strong>{ussdCode}</strong> sur votre mobile ou ouvrez l'application {isAirtel ? 'My Airtel Gabon' : 'Moov Money'}.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Sélectionnez <strong>Paiement de facture</strong> ou <strong>Transfert vers Marchand</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Indiquez le numéro marchand <strong>{formattedMerchantPhone}</strong> et le montant <strong>{orderTotal.toLocaleString('fr-FR')} FCFA</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                  <span>Entrez votre code secret PIN pour confirmer la transaction.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 font-bold text-emerald-800 flex items-center justify-center text-[10px] shrink-0 mt-0.5">5</span>
                  <span>Copiez l'<strong>ID de transaction</strong> reçu par SMS de l'opérateur et collez-le dans le champ ci-dessous.</span>
                </div>
              </div>
            )}
          </div>

          {/* Form for validation & Reference input */}
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {/* Payment Timing Preference */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Moment du règlement
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsPrePaid(true)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isPrePaid
                      ? 'border-emerald-600 bg-emerald-50/60 font-bold text-emerald-950 ring-1 ring-emerald-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Déjà transféré</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                    Validation rapide avec référence SMS
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrePaid(false)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    !isPrePaid
                      ? 'border-[#0d44e8] bg-blue-50/60 font-bold text-blue-950 ring-1 ring-[#0d44e8]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>À la réception</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                    Paiement effectué devant le livreur
                  </p>
                </button>
              </div>
            </div>

            {/* Transaction Reference Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <span>Référence / ID de transaction SMS</span>
                  {isPrePaid && <span className="text-red-500">*</span>}
                </label>
                <span className="text-[10px] text-slate-400">
                  {isAirtel ? 'Ex: CI261016.1432.B94821' : 'Ex: TXN26101694821'}
                </span>
              </div>
              <input
                type="text"
                required={isPrePaid}
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder={isAirtel ? 'Ex: CI261016.1432.B94821 ou code SMS' : 'Ex: TXN26101694821 ou code SMS'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white text-slate-900 focus:ring-2 focus:ring-[#0d44e8]"
              />

              {cleanRef && (
                <div className={`mt-1.5 p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                  isValidRefFormat
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {isValidRefFormat ? (
                    <>
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Format valide détecté pour {isAirtel ? 'Airtel Money' : 'Moov Money'}. Référence prête à être transmise.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Renseignez au moins 5 caractères de l'ID reçu par SMS.</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sender Phone Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Numéro de téléphone de l'émetteur / comptabilité
              </label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="+241 77 xx xx xx ou 066 xx xx xx"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-[#0d44e8]"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Permet à notre service comptable de vérifier instantanément la notification de versement.
              </span>
            </div>

            {/* Screenshot Upload / Attachment */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Capture d'écran du SMS / Preuve de transfert (Facultatif)
              </label>

              {screenshotUrl ? (
                <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={screenshotUrl}
                      alt="Capture de transfert"
                      className="w-12 h-12 object-cover rounded-lg border border-emerald-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-emerald-950 block truncate">
                        Capture du SMS attachée
                      </span>
                      <span className="text-[10px] text-emerald-700 block">
                        Sera archivée avec le bon de commande
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreenshotUrl(undefined)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Supprimer la capture"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl bg-slate-50/60 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700">
                    Cliquez pour joindre la capture d'écran du SMS
                  </span>
                  <span className="text-[10px] text-slate-400">
                    PNG, JPG jusqu'à 4 Mo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Success Message Banner */}
            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 animate-in zoom-in-95">
                <Check className="w-4 h-4" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSubmitting || (isPrePaid && !cleanRef)}
                className={`w-full flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50 ${
                  isAirtel ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0d44e8] hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <span>Validation en cours...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Valider & Enregistrer ce Paiement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
