import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  FileText,
  Download,
  MessageCircle,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  UserCheck,
  MapPin,
  Phone,
  Calendar,
  CreditCard,
  X
} from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface ClientPurchaseHistoryViewProps {
  clients: any[];
  orders: Order[];
  selectedClientId: string | null;
  onSelectClientId: (clientId: string) => void;
  onBackToDirectory?: () => void;
  onViewOrderPdf?: (order: Order) => void;
  onOpenDeliveryModal?: (order: Order) => void;
  onUpdatePayment?: (orderId: string, isPaid: boolean) => Promise<void>;
  onOpenMessageModal?: (client: any) => void;
}

const normalizePhoneKey = (phone: string) =>
  (phone || '').replace(/[^0-9+]/g, '').toLowerCase();

export const ClientPurchaseHistoryView: React.FC<ClientPurchaseHistoryViewProps> = ({
  clients,
  orders,
  selectedClientId,
  onSelectClientId,
  onBackToDirectory,
  onViewOrderPdf,
  onOpenDeliveryModal,
  onUpdatePayment,
  onOpenMessageModal
}) => {
  const [clientFilterQuery, setClientFilterQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Consolidate all clients (from registered accounts + orders) with their complete order list
  const enrichedClients = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        facilityName: string;
        facilityType: string;
        contactName: string;
        phone: string;
        deliveryAddress: string;
        avatarUrl?: string;
        orders: Order[];
        rawClient: any;
      }
    >();

    clients.forEach((c) => {
      const key =
        normalizePhoneKey(c.phone) ||
        String(c.id || c.facilityName || '').toLowerCase().trim();
      if (!key) return;
      map.set(key, {
        id: c.id || c.phone || key,
        facilityName: c.facilityName || 'Établissement Client',
        facilityType: c.facilityType || 'Clinique',
        contactName: c.contactName || 'Responsable Achats',
        phone: c.phone || '',
        deliveryAddress: c.deliveryAddress || 'Libreville',
        avatarUrl: c.avatarUrl || undefined,
        orders: [],
        rawClient: c
      });
    });

    orders.forEach((ord) => {
      const phoneKey = normalizePhoneKey(ord.customer?.phone || '');
      let entry = phoneKey ? map.get(phoneKey) : undefined;

      if (!entry && ord.userId) {
        for (const candidate of map.values()) {
          if (candidate.id === ord.userId) {
            entry = candidate;
            break;
          }
        }
      }

      if (!entry) {
        const fallbackKey =
          phoneKey ||
          ord.userId ||
          (ord.customer?.facilityName || 'client').toLowerCase().trim();
        entry = {
          id: ord.userId || ord.customer?.phone || fallbackKey,
          facilityName: ord.customer?.facilityName || 'Établissement Client',
          facilityType: ord.customer?.facilityType || 'Clinique',
          contactName: ord.customer?.contactName || 'Responsable',
          phone: ord.customer?.phone || '',
          deliveryAddress: ord.customer?.deliveryAddress || 'Libreville',
          orders: [],
          rawClient: {
            id: ord.userId || ord.customer?.phone || fallbackKey,
            facilityName: ord.customer?.facilityName || 'Établissement Client',
            contactName: ord.customer?.contactName || 'Responsable',
            phone: ord.customer?.phone || '',
            deliveryAddress: ord.customer?.deliveryAddress || 'Libreville'
          }
        };
        map.set(fallbackKey, entry);
      }

      entry.orders.push(ord);
    });

    return Array.from(map.values())
      .map((entry) => {
        const sortedOrders = [...entry.orders].sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
        );
        const validOrders = sortedOrders.filter((o) => o.status !== 'Annulée');
        const totalSpent = validOrders.reduce(
          (sum, o) => sum + (o.estimatedTotal || 0),
          0
        );
        const paidAmount = validOrders
          .filter((o) => o.isPaid)
          .reduce((sum, o) => sum + (o.estimatedTotal || 0), 0);
        const unpaidAmount = validOrders
          .filter((o) => !o.isPaid)
          .reduce((sum, o) => sum + (o.estimatedTotal || 0), 0);
        const averageBasket =
          validOrders.length > 0 ? Math.round(totalSpent / validOrders.length) : 0;

        return {
          ...entry,
          orders: sortedOrders,
          totalOrdersCount: sortedOrders.length,
          validOrdersCount: validOrders.length,
          totalSpent,
          paidAmount,
          unpaidAmount,
          averageBasket,
          lastOrderDate: sortedOrders[0]?.createdAt || null,
          firstOrderDate:
            sortedOrders.length > 0
              ? sortedOrders[sortedOrders.length - 1].createdAt
              : null
        };
      })
      .sort(
        (a, b) =>
          b.totalOrdersCount - a.totalOrdersCount ||
          b.totalSpent - a.totalSpent ||
          a.facilityName.localeCompare(b.facilityName, 'fr')
      );
  }, [clients, orders]);

  // Select default client if none is currently selected
  useEffect(() => {
    if (enrichedClients.length === 0) return;
    if (!selectedClientId) {
      onSelectClientId(enrichedClients[0].id);
      return;
    }
    const exists = enrichedClients.some(
      (c) =>
        c.id === selectedClientId ||
        normalizePhoneKey(c.phone) === normalizePhoneKey(selectedClientId)
    );
    if (!exists) {
      onSelectClientId(enrichedClients[0].id);
    }
  }, [enrichedClients, selectedClientId, onSelectClientId]);

  const activeClient = useMemo(() => {
    if (!selectedClientId) return enrichedClients[0] || null;
    return (
      enrichedClients.find(
        (c) =>
          c.id === selectedClientId ||
          normalizePhoneKey(c.phone) === normalizePhoneKey(selectedClientId)
      ) ||
      enrichedClients[0] ||
      null
    );
  }, [enrichedClients, selectedClientId]);

  const filteredSelectorClients = useMemo(() => {
    if (!clientFilterQuery.trim()) return enrichedClients;
    const q = clientFilterQuery.toLowerCase();
    return enrichedClients.filter(
      (c) =>
        c.facilityName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [enrichedClients, clientFilterQuery]);

  const filteredClientOrders = useMemo(() => {
    if (!activeClient) return [];
    return activeClient.orders.filter((ord) => {
      if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
      if (paymentFilter === 'paid' && !ord.isPaid) return false;
      if (paymentFilter === 'unpaid' && ord.isPaid) return false;
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchRef = ord.reference.toLowerCase().includes(q);
        const matchItem = ord.items.some(
          (it) =>
            it.productName.toLowerCase().includes(q) ||
            (it.variant || '').toLowerCase().includes(q)
        );
        if (!matchRef && !matchItem) return false;
      }
      return true;
    });
  }, [activeClient, statusFilter, paymentFilter, orderSearchQuery]);

  const handleExportClientCsv = () => {
    if (!activeClient) return;
    const headers = [
      'Établissement',
      'Contact',
      'Téléphone',
      'Référence Commande',
      'Date & Heure',
      'Statut Commande',
      'Règlement',
      'Mode Livraison',
      'Article Commandé',
      'Conditionnement',
      'Quantité',
      'Prix Unitaire (FCFA)',
      'Total Ligne (FCFA)',
      'Total Commande (FCFA)'
    ];
    const rows: string[][] = [];
    for (const ord of activeClient.orders) {
      if (!ord.items || ord.items.length === 0) {
        rows.push([
          activeClient.facilityName,
          activeClient.contactName,
          activeClient.phone,
          ord.reference,
          new Date(ord.createdAt).toLocaleString('fr-FR'),
          ord.status,
          ord.isPaid ? 'Payée' : 'En attente',
          ord.customer.deliveryMode === 'retrait' ? 'Retrait dépôt' : 'Livraison',
          '-',
          '-',
          '0',
          '0',
          '0',
          String(ord.estimatedTotal || 0)
        ]);
      } else {
        for (const item of ord.items) {
          rows.push([
            activeClient.facilityName,
            activeClient.contactName,
            activeClient.phone,
            ord.reference,
            new Date(ord.createdAt).toLocaleString('fr-FR'),
            ord.status,
            ord.isPaid ? 'Payée' : 'En attente',
            ord.customer.deliveryMode === 'retrait' ? 'Retrait dépôt' : 'Livraison',
            item.productName,
            item.variant || 'Standard',
            String(item.quantity),
            String(item.price),
            String(item.total),
            String(ord.estimatedTotal || 0)
          ]);
        }
      }
    }

    const csvContent =
      '\uFEFF' +
      [
        headers.map((h) => `"${h}"`).join(';'),
        ...rows.map((r) =>
          r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(';')
        )
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = activeClient.facilityName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    link.download = `historique-achats-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getWhatsAppContactUrl = () => {
    if (!activeClient) return '#';
    const cleanPhone = activeClient.phone.replace(/[^0-9]/g, '');
    const msg = `Bonjour ${activeClient.contactName || activeClient.facilityName},\nNous vous contactons depuis la Direction Gloryday Pharma concernant le suivi de vos commandes médicales (${activeClient.validOrdersCount} commande(s) enregistrée(s)).`;
    return `https://wa.me/${cleanPhone || '24177003004'}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Client Selector Bar */}
      <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBackToDirectory && (
            <button
              type="button"
              onClick={onBackToDirectory}
              className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Répertoire</span>
            </button>
          )}
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0d44e8]" />
              <span>Historique des Achats par Client</span>
            </h4>
            <p className="text-xs text-slate-500">
              Sélectionnez un établissement client pour consulter la liste complète de toutes ses commandes passées.
            </p>
          </div>
        </div>

        {/* Client Search & Dropdown Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0 lg:min-w-[440px]">
          <div className="relative sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={clientFilterQuery}
              onChange={(e) => setClientFilterQuery(e.target.value)}
              placeholder="Filtrer un client..."
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0d44e8]"
            />
            {clientFilterQuery && (
              <button
                type="button"
                onClick={() => setClientFilterQuery('')}
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={activeClient?.id || ''}
            onChange={(e) => onSelectClientId(e.target.value)}
            aria-label="Sélectionner un client"
            className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0d44e8]"
          >
            {filteredSelectorClients.length === 0 ? (
              <option value="">Aucun client correspondant</option>
            ) : (
              filteredSelectorClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.facilityName} ({c.totalOrdersCount} cmd · {c.totalSpent.toLocaleString('fr-FR')} FCFA)
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Horizontal Quick Client Selector Chips */}
      {enrichedClients.length > 1 && (
        <div className="px-4 sm:px-5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0 mr-1">
            Accès rapide :
          </span>
          {enrichedClients.map((c) => {
            const isSelected = activeClient?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectClientId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0d44e8] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" className="h-4 w-4 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-[9px] ${isSelected ? 'bg-white/20' : 'bg-white'}`}>{c.facilityName.charAt(0).toUpperCase()}</span>
                )}
                <span>{c.facilityName}</span>
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    isSelected ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  ({c.totalOrdersCount})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!activeClient ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          Aucun client enregistré pour le moment.
        </div>
      ) : (
        <div className="px-4 sm:px-5 pb-5 space-y-4">
          {/* Selected Client Summary Card & KPIs */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-blue-300 font-semibold">
                  <span>{activeClient.facilityType}</span>
                  <span aria-hidden="true">·</span>
                  <span>Client sélectionné</span>
                  {activeClient.lastOrderDate && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        Dernier achat le{' '}
                        {new Date(activeClient.lastOrderDate).toLocaleDateString('fr-FR')}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {activeClient.facilityName}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {activeClient.contactName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    {activeClient.phone}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {activeClient.deliveryAddress}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportClientCsv}
                  disabled={activeClient.orders.length === 0}
                  className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter CSV</span>
                </button>
                {onOpenMessageModal && (
                  <button
                    type="button"
                    onClick={() => onOpenMessageModal(activeClient.rawClient)}
                    className="py-2 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Message Direct</span>
                  </button>
                )}
                <a
                  href={getWhatsAppContactUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Client KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Commandes passées
                </span>
                <div className="text-lg font-black text-white mt-0.5 font-mono tabular-nums">
                  {activeClient.totalOrdersCount}
                </div>
                <span className="text-[11px] text-slate-400">
                  dont {activeClient.validOrdersCount} validée(s)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Chiffre d'affaires cumulé
                </span>
                <div className="text-lg font-black text-white mt-0.5 font-mono tabular-nums">
                  {activeClient.totalSpent.toLocaleString('fr-FR')} F
                </div>
                <span className="text-[11px] text-blue-300 font-mono tabular-nums">
                  Panier moyen : {activeClient.averageBasket.toLocaleString('fr-FR')} F
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                  Montant réglé
                </span>
                <div className="text-lg font-black text-emerald-400 mt-0.5 font-mono tabular-nums">
                  {activeClient.paidAmount.toLocaleString('fr-FR')} F
                </div>
                <span className="text-[11px] text-emerald-200/80">
                  Commandes soldées
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20">
                <span className="text-[10px] font-bold uppercase text-amber-300 block">
                  Reste à régler
                </span>
                <div className="text-lg font-black text-amber-400 mt-0.5 font-mono tabular-nums">
                  {activeClient.unpaidAmount.toLocaleString('fr-FR')} F
                </div>
                <span className="text-[11px] text-amber-200/80">
                  {activeClient.unpaidAmount > 0 ? 'En attente de règlement' : 'Aucun impayé'}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar for Selected Client's Orders */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder={`Rechercher dans les commandes de ${activeClient.facilityName} (réf GP-..., article)...`}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0d44e8]"
              />
              {orderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setOrderSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
                className="py-2 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
              >
                <option value="all">Tous les statuts ({activeClient.orders.length})</option>
                <option value="À confirmer">À confirmer</option>
                <option value="Confirmée">Confirmée</option>
                <option value="En préparation">En préparation</option>
                <option value="Livrée">Livrée</option>
                <option value="Annulée">Annulée</option>
              </select>

              <div className="inline-flex bg-slate-200/70 p-0.5 rounded-xl font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    paymentFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Toutes
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('paid')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    paymentFilter === 'paid'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Payées
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentFilter('unpaid')}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    paymentFilter === 'unpaid'
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Non payées
                </button>
              </div>
            </div>
          </div>

          {/* Complete List of Orders Placed by Selected Client */}
          {filteredClientOrders.length === 0 ? (
            <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50/60 text-center space-y-2">
              <Package className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                Aucune commande trouvée pour {activeClient.facilityName}
              </p>
              <p className="text-[11px] text-slate-500">
                {activeClient.orders.length === 0
                  ? 'Cet établissement n’a pas encore passé de commande sur la plateforme.'
                  : 'Aucune commande ne correspond aux filtres sélectionnés.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClientOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="dashboard-card-interactive p-4 rounded-2xl border border-slate-200/90 bg-white space-y-3 shadow-2xs"
                >
                  {/* Order Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-black text-sm text-[#0d44e8]">
                        {ord.reference}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className="text-slate-600 font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(ord.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span
                        className={`font-bold ${
                          ord.status === 'Livrée'
                            ? 'text-emerald-700'
                            : ord.status === 'Annulée'
                              ? 'text-rose-700'
                              : 'text-slate-800'
                        }`}
                      >
                        Statut : {ord.status}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          ord.isPaid ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {ord.isPaid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Payée</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>En attente de règlement</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-slate-900 font-mono tabular-nums">
                        {(ord.estimatedTotal || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200/70 text-[10px] font-bold uppercase text-slate-500">
                          <th className="py-2 px-3">Article médical commandé</th>
                          <th className="py-2 px-3">Conditionnement</th>
                          <th className="py-2 px-3 text-right">Quantité</th>
                          <th className="py-2 px-3 text-right">Prix Unitaire</th>
                          <th className="py-2 px-3 text-right">Total Ligne</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ord.items.map((item, idx) => (
                          <tr key={idx} className="text-slate-700">
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {item.productName}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {item.variant || 'Standard'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                              {item.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">
                              {item.isQuote
                                ? 'Sur devis'
                                : `${item.price.toLocaleString('fr-FR')} F`}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900 tabular-nums">
                              {item.isQuote
                                ? 'Sur devis'
                                : `${item.total.toLocaleString('fr-FR')} F`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Order Footer Metadata & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-slate-500">
                      <span>
                        Mode :{' '}
                        <strong className="text-slate-700">
                          {ord.customer.deliveryMode === 'retrait'
                            ? 'Retrait au dépôt'
                            : 'Livraison sur site'}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        Paiement :{' '}
                        <strong className="text-slate-700">
                          {ord.customer.paymentMethod}
                        </strong>
                      </span>
                      {ord.courier?.name && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            Coursier :{' '}
                            <strong className="text-slate-700">{ord.courier.name}</strong>
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {onViewOrderPdf && (
                        <button
                          type="button"
                          onClick={() => onViewOrderPdf(ord)}
                          className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0d44e8]" />
                          <span>Bon PDF</span>
                        </button>
                      )}

                      {onOpenDeliveryModal && (
                        <button
                          type="button"
                          onClick={() => onOpenDeliveryModal(ord)}
                          className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0d44e8] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Suivi livraison</span>
                        </button>
                      )}

                      {onUpdatePayment && ord.status !== 'Annulée' && (
                        <button
                          type="button"
                          onClick={() => void onUpdatePayment(ord.id, !ord.isPaid)}
                          className={`py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                            ord.isPaid
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {ord.isPaid ? 'Marquer non payée' : 'Valider paiement'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
