import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Clock, 
  Trash2, 
  Copy, 
  Edit3, 
  Check, 
  Download, 
  MessageCircle, 
  ShoppingBag, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  ShieldCheck, 
  Search,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CartItem, CustomerInfo, OrderDraft, User } from '../types';
import { 
  getStoredDrafts, 
  saveDraft, 
  deleteDraft, 
  duplicateDraft, 
  renameDraft, 
  generateDraftWhatsAppUrl, 
  generateDraftPdf,
  calculateDraftTotals 
} from '../utils/draftsStorage';
import { useOnlineStatus } from '../utils/pwa';

interface DraftsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentCartItems: CartItem[];
  currentCustomerInfo?: Partial<CustomerInfo>;
  onLoadDraftToCart: (draft: OrderDraft) => void;
  onDirectSubmitDraft?: (draft: OrderDraft) => Promise<void>;
}

export const DraftsManagerModal: React.FC<DraftsManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentCartItems,
  currentCustomerInfo,
  onLoadDraftToCart,
  onDirectSubmitDraft
}) => {
  const isOnline = useOnlineStatus();
  const userPhone = currentUser?.phone;

  const [drafts, setDrafts] = useState<OrderDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);

  // Rename state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Quick save current cart state
  const [newDraftName, setNewDraftName] = useState('');
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // PDF generation state
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // Direct submit state
  const [submittingDraftId, setSubmittingDraftId] = useState<string | null>(null);

  const refreshDrafts = () => {
    const list = getStoredDrafts(userPhone);
    setDrafts(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshDrafts();
      if (currentCustomerInfo?.facilityName) {
        setNewDraftName(`Brouillon ${currentCustomerInfo.facilityName}`);
      } else {
        const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        setNewDraftName(`Brouillon du ${new Date().toLocaleDateString('fr-FR')} (${timeStr})`);
      }
    }
  }, [isOpen, userPhone, currentCustomerInfo]);

  if (!isOpen) return null;

  const handleSaveCurrentCartAsDraft = () => {
    if (currentCartItems.length === 0) return;
    setIsSavingCurrent(true);

    const nameToUse = newDraftName.trim() || `Brouillon ${new Date().toLocaleDateString('fr-FR')}`;
    const saved = saveDraft({
      name: nameToUse,
      items: currentCartItems,
      customerInfo: currentCustomerInfo,
      status: 'offline_saved'
    }, userPhone);

    refreshDrafts();
    setExpandedDraftId(saved.id);
    setIsSavingCurrent(false);
    setSaveSuccessMessage('Votre panier actif a été enregistré en brouillon avec succès !');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Voulez-vous supprimer définitivement ce brouillon ?')) {
      deleteDraft(id, userPhone);
      refreshDrafts();
    }
  };

  const handleDuplicate = (id: string) => {
    const duplicated = duplicateDraft(id, userPhone);
    if (duplicated) {
      refreshDrafts();
      setExpandedDraftId(duplicated.id);
    }
  };

  const handleStartRename = (draft: OrderDraft) => {
    setEditingDraftId(draft.id);
    setEditingName(draft.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      renameDraft(id, editingName, userPhone);
      refreshDrafts();
    }
    setEditingDraftId(null);
  };

  const handleDownloadPdf = async (draft: OrderDraft) => {
    try {
      setGeneratingPdfId(draft.id);
      const { dataUrl } = await generateDraftPdf(draft);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Gloryday_Brouillon_${draft.id}_${draft.name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating draft PDF', err);
      alert('Erreur lors de la génération du document PDF hors-ligne.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleLoadAndClose = (draft: OrderDraft) => {
    onLoadDraftToCart(draft);
    onClose();
  };

  const handleDirectSubmit = async (draft: OrderDraft) => {
    if (!onDirectSubmitDraft) return;
    try {
      setSubmittingDraftId(draft.id);
      await onDirectSubmitDraft(draft);
      // Delete draft on successful conversion
      deleteDraft(draft.id, userPhone);
      refreshDrafts();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Impossible de finaliser la commande. Veuillez vérifier la connexion.');
    } finally {
      setSubmittingDraftId(null);
    }
  };

  // Filtered drafts
  const filteredDrafts = drafts.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      d.customerInfo?.facilityName?.toLowerCase().includes(q) ||
      d.items.some(it => it.productName.toLowerCase().includes(q))
    );
  });

  const currentCartTotals = calculateDraftTotals(currentCartItems);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 sm:p-6 flex items-start justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-[#0d44e8]/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-400/20">
                <FileText className="w-3 h-3 text-[#42aef7]" />
                Gestionnaire de Brouillons
              </span>

              {isOnline ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/20">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  Connecté
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/20 animate-pulse">
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  Mode Hors-ligne Actif
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Brouillons & Commandes en attente</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {drafts.length}
              </span>
            </h2>
            <p className="text-slate-300 text-xs mt-0.5">
              Sauvegardez vos commandes locales pour continuer plus tard sans perte en cas de coupure de réseau.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="relative z-10 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Success toast */}
          {saveSuccessMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Offline advisory banner */}
          {!isOnline && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Connexion internet indisponible ou instable</strong>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Toutes les modifications apportées à vos brouillons sont enregistrées localement sur votre téléphone ou ordinateur. Vous pouvez aussi générer un Bon de commande PDF ou envoyer le récapitulatif par WhatsApp même sans accès au serveur !
                </p>
              </div>
            </div>
          )}

          {/* Quick-save current cart box */}
          {currentCartItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
                  <ShoppingBag className="w-4 h-4 text-[#0d44e8]" />
                  Panier actif ({currentCartTotals.itemsCount} article{currentCartTotals.itemsCount > 1 ? 's' : ''})
                </span>
                <span className="text-xs font-black text-[#0d44e8] tabular-nums">
                  {currentCartTotals.totalAmount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newDraftName}
                  onChange={(e) => setNewDraftName(e.target.value)}
                  placeholder="Nom du brouillon (ex: Réapprovisionnement Bloc 2)"
                  className="flex-1 px-3 py-2 bg-white rounded-xl border border-blue-200 text-xs focus:ring-2 focus:ring-[#0d44e8] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentCartAsDraft}
                  disabled={isSavingCurrent}
                  className="px-4 py-2 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enregistrer le panier en brouillon</span>
                </button>
              </div>
            </div>
          )}

          {/* Search bar */}
          {drafts.length > 2 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un brouillon par nom, clinique ou article..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0d44e8] focus:bg-white"
              />
            </div>
          )}

          {/* Drafts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Vos brouillons enregistrés ({filteredDrafts.length})
              </h3>
            </div>

            {filteredDrafts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-slate-800">Aucun brouillon enregistré</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                  {currentCartItems.length > 0 
                    ? "Enregistrez votre panier actuel ci-dessus pour sécuriser votre commande en cas de réseau instable."
                    : "Ajoutez des articles au panier pour pouvoir créer des brouillons hors-ligne."}
                </p>
              </div>
            ) : (
              filteredDrafts.map((draft) => {
                const isExpanded = expandedDraftId === draft.id;
                const isEditing = editingDraftId === draft.id;
                const whatsappUrl = generateDraftWhatsAppUrl(draft);

                return (
                  <div
                    key={draft.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all overflow-hidden"
                  >
                    {/* Header Row */}
                    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Title & Rename */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1 max-w-md">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="px-2.5 py-1 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d44e8] flex-1"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(draft.id)}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                title="Valider le nom"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDraftId(null)}
                                className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
                                title="Annuler"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-sm text-slate-900 truncate">
                                {draft.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleStartRename(draft)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                                title="Renommer ce brouillon"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            <span>{new Date(draft.updatedAt).toLocaleDateString('fr-FR')} {new Date(draft.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>

                          {draft.autoSaved && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              Autosave
                            </span>
                          )}
                        </div>

                        {/* Subtitle info */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                          {draft.customerInfo?.facilityName && (
                            <span className="flex items-center gap-1 text-slate-700 font-semibold">
                              <Building2 className="w-3 h-3 text-[#0d44e8]" />
                              <span>{draft.customerInfo.facilityName}</span>
                            </span>
                          )}
                          <span>·</span>
                          <span className="font-bold text-slate-800">
                            {draft.itemsCount} article{draft.itemsCount > 1 ? 's' : ''}
                          </span>
                          <span>·</span>
                          <span className="font-black text-[#0d44e8] tabular-nums">
                            {draft.totalAmount.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                        {/* Load in cart */}
                        <button
                          type="button"
                          onClick={() => handleLoadAndClose(draft)}
                          className="px-3 py-1.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          title="Charger ce brouillon dans le panier actuel pour le modifier ou finaliser"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Reprendre / Modifier</span>
                        </button>

                        {/* Direct Submit (if online) */}
                        {isOnline && onDirectSubmitDraft && (
                          <button
                            type="button"
                            onClick={() => handleDirectSubmit(draft)}
                            disabled={submittingDraftId === draft.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Valider directement ce brouillon en commande finale"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{submittingDraftId === draft.id ? 'Validation...' : 'Valider commande'}</span>
                          </button>
                        )}

                        {/* Toggle details */}
                        <button
                          type="button"
                          onClick={() => setExpandedDraftId(isExpanded ? null : draft.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title={isExpanded ? "Masquer les détails" : "Afficher les articles"}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Drawer */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                        {/* Client details summary if exists */}
                        {draft.customerInfo && (draft.customerInfo.contactName || draft.customerInfo.deliveryAddress) && (
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Coordonnées de livraison enregistrées
                            </span>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                              {draft.customerInfo.contactName && (
                                <span>Contact : <strong>{draft.customerInfo.contactName}</strong></span>
                              )}
                              {draft.customerInfo.phone && (
                                <span>Tél : <strong>{draft.customerInfo.phone}</strong></span>
                              )}
                              {draft.customerInfo.deliveryAddress && (
                                <span>Adresse : <strong>{draft.customerInfo.deliveryAddress}</strong></span>
                              )}
                              {draft.customerInfo.deliveryMode && (
                                <span>Mode : <strong>{draft.customerInfo.deliveryMode === 'retrait' ? 'Retrait Oloumi' : 'Livraison'}</strong></span>
                              )}
                              {draft.customerInfo.paymentMethod && (
                                <span>Paiement : <strong>{draft.customerInfo.paymentMethod.replace('_', ' ').toUpperCase()}</strong></span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Items Table */}
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                              <tr>
                                <th className="p-2.5">Article</th>
                                <th className="p-2.5">Variante</th>
                                <th className="p-2.5 text-center">Qté</th>
                                <th className="p-2.5 text-right">Prix</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {draft.items.map((it, idx) => (
                                <tr key={`${it.productId}-${idx}`} className="hover:bg-slate-50/80">
                                  <td className="p-2.5 font-medium text-slate-900">{it.productName}</td>
                                  <td className="p-2.5 text-slate-500 text-[11px]">{it.variant}</td>
                                  <td className="p-2.5 text-center font-bold text-slate-800">{it.quantity}</td>
                                  <td className="p-2.5 text-right font-bold text-slate-900 tabular-nums">
                                    {it.isQuote || it.price === 0 
                                      ? 'Devis' 
                                      : `${(it.price * it.quantity).toLocaleString('fr-FR')} F`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Action Toolbar for this draft */}
                        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Download PDF Bon de Commande */}
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(draft)}
                              disabled={generatingPdfId === draft.id}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                              title="Télécharger le Bon de commande PDF hors-ligne"
                            >
                              <Download className="w-3.5 h-3.5 text-[#0d44e8]" />
                              <span>{generatingPdfId === draft.id ? 'Génération...' : 'PDF Bon de commande'}</span>
                            </button>

                            {/* WhatsApp transmission */}
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-2xs"
                              title="Envoyer la commande directement par WhatsApp à l'équipe Gloryday"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Transmettre WhatsApp</span>
                            </a>

                            {/* Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicate(draft.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Dupliquer ce brouillon"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Dupliquer</span>
                            </button>
                          </div>

                          {/* Delete draft */}
                          <button
                            type="button"
                            onClick={() => handleDelete(draft.id)}
                            className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Supprimer ce brouillon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Stockage local sécurisé dans votre navigateur</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
