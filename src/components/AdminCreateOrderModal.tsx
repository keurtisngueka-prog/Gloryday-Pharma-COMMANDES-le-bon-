import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileText, LoaderCircle, MessageCircle, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react';
import type { CartItem, InvoiceRecord, Order, Product } from '../types';
import { api } from '../api';
import { NeighborhoodPicker } from './NeighborhoodPicker';
import { downloadInvoiceProjectPdf } from '../utils/pdfGenerator';

interface AdminCreateOrderModalProps {
  clients: any[];
  products: Product[];
  canManageInvoices: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
  onViewOrderPdf?: (order: Order) => void;
}

type DraftLine = CartItem & { key: string };
type DocumentChoice = 'bon' | 'facture';

const createIdempotencyKey = () => {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `staff-${value}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120);
};

const todayInLibreville = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const formatMoney = (amount: number) => `${Math.max(0, Math.round(amount)).toLocaleString('fr-FR')} FCFA`;

export const AdminCreateOrderModal: React.FC<AdminCreateOrderModalProps> = ({
  clients,
  products,
  canManageInvoices,
  onClose,
  onOrderCreated,
  onViewOrderPdf,
}) => {
  const eligibleClients = useMemo(() => clients
    .filter(client => client?.id && client.hasAccount !== false)
    .sort((a, b) => String(a.facilityName || '').localeCompare(String(b.facilityName || ''), 'fr')),
  [clients]);
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<'livraison' | 'retrait'>('livraison');
  const [neighborhoodId, setNeighborhoodId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'airtel_money' | 'moov_money' | 'virement' | 'cheque'>('virement');
  const [documentChoice, setDocumentChoice] = useState<DocumentChoice>('bon');
  const [tvaRate, setTvaRate] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const requestKey = useRef(createIdempotencyKey());

  const client = eligibleClients.find(candidate => candidate.id === clientId);
  const product = products.find(candidate => candidate.id === selectedProductId);
  const variant = product?.variants?.find(candidate => candidate.label === selectedVariant);
  const matchingClients = eligibleClients.filter(candidate =>
    [candidate.facilityName, candidate.contactName, candidate.phone, candidate.secondaryPhone]
      .some(value => String(value || '').toLocaleLowerCase('fr').includes(clientSearch.trim().toLocaleLowerCase('fr'))));
  const productQuery = productSearch.trim().toLocaleLowerCase('fr');
  const matchingProducts = productQuery.length < 2 ? [] : products.filter(candidate =>
    `${candidate.name} ${candidate.category} ${candidate.id}`.toLocaleLowerCase('fr').includes(productQuery));
  const previewSubtotal = lines.reduce((sum, line) => sum + (Number(line.price) || 0) * line.quantity, 0);
  const hasUnknownPrice = lines.some(line => line.isQuote || line.price <= 0);
  const selectedClientPhone = String(client?.phone || '').replace(/\D/g, '');
  const whatsappMessage = successOrder
    ? `Bonjour ${successOrder.customer.contactName || ''}, votre commande ${successOrder.reference} auprès de Gloryday Pharma a été enregistrée. Le document PDF est prêt à être joint à ce message.`
    : '';
  const whatsappUrl = selectedClientPhone && whatsappMessage
    ? `https://wa.me/${selectedClientPhone}?text=${encodeURIComponent(whatsappMessage)}`
    : '';

  const selectClient = (nextClientId: string) => {
    const selected = eligibleClients.find(candidate => candidate.id === nextClientId);
    setClientId(nextClientId);
    setNeighborhoodId(selected?.neighborhoodId || '');
    setDeliveryAddress(selected?.deliveryAddress || '');
  };

  const addLine = () => {
    if (!product || !variant || !Number.isInteger(quantity) || quantity < 1) return;
    const nextLine: DraftLine = {
      key: `${product.id}:${variant.label}`,
      productId: product.id,
      productName: product.name,
      category: product.category,
      variant: variant.label,
      price: Number(variant.price) || 0,
      quantity,
      isQuote: Number(variant.price) <= 0 || Boolean(product.isQuote),
    };
    setLines(previous => {
      const existing = previous.findIndex(line => line.key === nextLine.key);
      if (existing < 0) return [...previous, nextLine];
      return previous.map((line, index) => index === existing ? { ...line, quantity: line.quantity + quantity } : line);
    });
    setProductSearch('');
    setProductPickerOpen(false);
    setSelectedProductId('');
    setSelectedVariant('');
    setQuantity(1);
  };

  const createInvoice = async (order: Order) => {
    const totalHT = tvaRate > 0 ? Math.round(order.estimatedTotal / (1 + tvaRate)) : order.estimatedTotal;
    const invoice: InvoiceRecord = {
      id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      orderId: order.id,
      orderReference: order.reference,
      type: 'facture',
      number: `FAC-${new Date().getFullYear()}-${order.reference.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-01`,
      issueDate: todayInLibreville(),
      clientFacilityName: order.customer.facilityName,
      tvaRate,
      tvaAmount: order.estimatedTotal - totalHT,
      totalHT,
      totalTTC: order.estimatedTotal,
    };
    const saved = await api.updateOrderFinance(order.id, { invoices: [...(order.invoices || []), invoice] });
    onOrderCreated(saved);
    setSuccessOrder(saved);
    await downloadInvoiceProjectPdf(saved, invoice);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client || lines.length === 0 || saving) return;
    if (deliveryMode === 'livraison' && (!neighborhoodId || !deliveryAddress.trim())) {
      setError('Choisissez un quartier et renseignez un repère ou une adresse de livraison.');
      return;
    }
    if (documentChoice === 'facture' && !canManageInvoices) {
      setError('Votre compte n’a pas le droit de créer une facture. Demandez au Super Admin d’activer « Gérer factures & avoirs ».');
      return;
    }
    if (documentChoice === 'facture' && (hasUnknownPrice || lines.some(line => {
      const current = products.find(item => item.id === line.productId);
      const tracked = current?.quantityAvailable ?? current?.stockQuantity;
      return tracked !== undefined && tracked < line.quantity;
    }))) {
      setError('La facture attend une commande entièrement chiffrée et disponible. Enregistrez d’abord le bon de commande ou le devis, puis facturez après validation des prix et du stock.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const items: CartItem[] = lines.map(({ key: _key, ...line }) => line);
      const order = await api.createOrderForClient(client.id, {
        deliveryMode,
        paymentMethod,
        deliveryAddress: deliveryMode === 'retrait' ? 'Retrait au dépôt Gloryday Pharma' : deliveryAddress.trim(),
        neighborhoodId: deliveryMode === 'retrait' ? undefined : neighborhoodId,
        notes: 'Commande créée par un collaborateur Gloryday.',
      }, items, requestKey.current);
      onOrderCreated(order);
      setSuccessOrder(order);
      if (documentChoice === 'facture') {
        if (order.hasQuoteItems || order.items.some(item => item.isQuote || item.isDeferredStock)) {
          setError('La commande est enregistrée, mais le stock ou le prix nécessite un devis. Le bon de commande reste disponible ; la facture se fera après validation.');
          return;
        }
        await createInvoice(order);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La commande n’a pas pu être enregistrée. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = () => {
    if (!whatsappUrl) {
      setError('Le client n’a pas de numéro de téléphone exploitable pour WhatsApp.');
      return;
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="admin-create-order-title" className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">Commandes clients</p>
            <h2 id="admin-create-order-title" className="mt-1 text-lg font-black text-slate-950">Créer un bon de commande ou une facture</h2>
            <p className="mt-1 text-xs text-slate-600">La commande est liée au compte client et son stock est vérifié sur le serveur.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </header>

        {successOrder ? (
          <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
              <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5" />Commande enregistrée : {successOrder.reference}</div>
              <p className="mt-1 text-sm">Client : {successOrder.customer.facilityName} · Total calculé : {formatMoney(successOrder.estimatedTotal)}</p>
              {successOrder.hasQuoteItems && <p className="mt-2 text-xs font-semibold text-amber-800">Certains articles nécessitent un devis ou un réapprovisionnement. Le PDF de commande reste disponible.</p>}
            </div>
            {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { onViewOrderPdf?.(successOrder); onClose(); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"><FileText className="h-4 w-4" />Ouvrir le bon PDF</button>
              <button type="button" onClick={handleWhatsApp} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-100"><MessageCircle className="h-4 w-4" />Préparer WhatsApp</button>
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Terminer</button>
            </div>
            <p className="text-[11px] text-slate-500">WhatsApp ouvre un message prérempli ; joins le PDF téléchargé avant l’envoi. L’application ne transmet pas de pièce jointe sans WhatsApp Business connecté.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-5 sm:p-6">
            <label className="block text-xs font-bold text-slate-700">
              Client avec compte actif
              <input value={clientSearch} onChange={event => setClientSearch(event.target.value)} placeholder="Rechercher un établissement ou téléphone" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500" />
              <select required value={clientId} onChange={event => selectClient(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500">
                <option value="">Choisir un client</option>
                {matchingClients.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.facilityName || candidate.contactName || candidate.phone} — {candidate.phone || 'sans téléphone'}</option>)}
              </select>
            </label>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-black text-slate-900">Articles</h3>
              <div className="mt-3 space-y-3">
                <div className="block min-w-0 text-[11px] font-bold text-slate-600">
                  <label htmlFor="admin-create-order-product-search">Rechercher un produit</label>
                  <div className="relative mt-1" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setProductPickerOpen(false); }}>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        id="admin-create-order-product-search"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={productPickerOpen}
                        aria-controls="admin-create-order-product-results"
                        autoComplete="off"
                        value={productSearch}
                        onFocus={event => { setProductPickerOpen(true); if (selectedProductId) event.currentTarget.select(); }}
                        onChange={event => { setProductSearch(event.target.value); setSelectedProductId(''); setSelectedVariant(''); setProductPickerOpen(true); }}
                        onKeyDown={event => { if (event.key === 'Escape') setProductPickerOpen(false); }}
                        placeholder="Nom ou référence"
                        className="w-full min-w-0 rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                      />
                    </div>
                    {productPickerOpen && <div id="admin-create-order-product-results" role="listbox" className="absolute inset-x-0 top-full z-[120] mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                      {productQuery.length < 2 ? <p className="px-3 py-2 text-xs font-normal text-slate-500">Saisissez au moins 2 caractères pour rechercher.</p> : matchingProducts.length === 0 ? <p className="px-3 py-2 text-xs font-normal text-slate-500">Aucun produit correspondant.</p> : matchingProducts.slice(0, 30).map(item => <button key={item.id} type="button" role="option" aria-selected={item.id === selectedProductId} onClick={() => { setSelectedProductId(item.id); setProductSearch(item.name); setSelectedVariant(''); setProductPickerOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none">
                        <span className="block truncate text-xs font-semibold text-slate-800">{item.name}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-normal text-slate-500">{item.category} · {item.variants?.length || 0} conditionnement(s)</span>
                      </button>)}
                      {matchingProducts.length > 30 && <p className="px-3 py-2 text-[10px] text-slate-500">30 résultats affichés. Affinez la recherche pour les autres.</p>}
                    </div>}
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_76px] gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-end">
                  <label className="min-w-0 text-[11px] font-bold text-slate-600">Conditionnement
                    <select disabled={!product} value={selectedVariant} onChange={event => setSelectedVariant(event.target.value)} className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs disabled:bg-slate-100">
                      <option value="">Choisir</option>{(product?.variants || []).map(item => <option key={item.label} value={item.label}>{item.label} · {item.price > 0 ? formatMoney(item.price) : 'Sur devis'}</option>)}
                    </select>
                  </label>
                  <label className="text-[11px] font-bold text-slate-600">Qté<input type="number" min={1} max={10000} step={1} value={quantity} onChange={event => setQuantity(Math.max(1, Math.trunc(Number(event.target.value) || 1)))} className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm" /></label>
                  <button type="button" disabled={!variant} onClick={addLine} className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:col-span-1"><Plus className="h-4 w-4" />Ajouter</button>
                </div>
              </div>
              {lines.length > 0 ? <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
                {lines.map(line => <div key={line.key} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                  <div className="min-w-0"><p className="truncate font-bold text-slate-800">{line.productName} · {line.variant}</p><p className="text-slate-500">{line.quantity} × {line.isQuote ? 'Sur devis' : formatMoney(line.price)}</p></div>
                  <div className="flex items-center gap-3"><strong className="whitespace-nowrap">{line.isQuote ? 'Sur devis' : formatMoney(line.quantity * line.price)}</strong><button type="button" onClick={() => setLines(previous => previous.filter(item => item.key !== line.key))} className="rounded-lg p-1 text-rose-700 hover:bg-rose-50" aria-label={`Retirer ${line.productName}`}><Trash2 className="h-4 w-4" /></button></div>
                </div>)}
              </div> : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Aucun article ajouté.</p>}
              <p className="mt-3 text-right text-sm font-black text-slate-900">Sous-total indicatif : {formatMoney(previewSubtotal)}{hasUnknownPrice && ' + articles sur devis'}</p>
              <p className="mt-1 text-[10px] text-slate-500">Le total final, les remises, les frais de livraison et la disponibilité sont recalculés côté serveur au moment de l’enregistrement.</p>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Mode de réception
                <select value={deliveryMode} onChange={event => setDeliveryMode(event.target.value as 'livraison' | 'retrait')} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="livraison">Livraison</option><option value="retrait">Retrait au dépôt</option></select>
              </label>
              <label className="text-xs font-bold text-slate-700">Mode de paiement
                <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as typeof paymentMethod)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="virement">Virement bancaire</option><option value="cheque">Chèque</option><option value="especes">Espèces</option><option value="airtel_money">Airtel Money</option><option value="moov_money">Moov Money</option></select>
              </label>
            </div>
            {deliveryMode === 'livraison' && <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Quartier
                <NeighborhoodPicker value={neighborhoodId} onChange={setNeighborhoodId} placeholder="Rechercher le quartier du client" />
              </label>
              <label className="text-xs font-bold text-slate-700">Adresse ou repère exact
                <input required value={deliveryAddress} onChange={event => setDeliveryAddress(event.target.value)} maxLength={300} placeholder="Rue, établissement, repère" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              </label>
            </div>}

            <fieldset className="rounded-2xl border border-slate-200 p-4">
              <legend className="px-1 text-xs font-black text-slate-800">Document à préparer</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3 text-xs"><input type="radio" name="admin-document-choice" checked={documentChoice === 'bon'} onChange={() => setDocumentChoice('bon')} /><span><strong className="block">Bon de commande</strong><span className="text-slate-500">Disponible après l’enregistrement de la commande.</span></span></label>
                <label className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${canManageInvoices ? 'cursor-pointer border-slate-200' : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'}`}><input type="radio" name="admin-document-choice" disabled={!canManageInvoices || hasUnknownPrice} checked={documentChoice === 'facture'} onChange={() => setDocumentChoice('facture')} /><span><strong className="block">Facture</strong><span className="text-slate-500">Droit de facturation requis ; prix et stock confirmés.</span></span></label>
              </div>
              {!canManageInvoices && <p className="mt-2 text-[11px] text-amber-800">La secrétaire peut préparer le bon de commande. Le Super Admin doit lui attribuer « Gérer factures & avoirs » pour créer une facture.</p>}
              {canManageInvoices && hasUnknownPrice && <p className="mt-2 text-[11px] text-amber-800">Une ligne nécessite un devis : la facture sera disponible après validation du prix et du stock.</p>}
              {documentChoice === 'facture' && canManageInvoices && <label className="mt-3 block max-w-xs text-[11px] font-bold text-slate-700">Taux TVA/CSS appliqué
                <select value={tvaRate} onChange={event => setTvaRate(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"><option value={0}>0 %</option><option value={0.18}>18 %</option></select>
              </label>}
            </fieldset>

            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p>}
            <footer className="flex flex-col-reverse justify-between gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Annuler</button>
              <button type="submit" disabled={saving || !client || lines.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}{saving ? 'Enregistrement…' : documentChoice === 'facture' ? 'Enregistrer et créer la facture' : 'Enregistrer et préparer le bon'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
};
