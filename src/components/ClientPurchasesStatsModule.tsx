import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  MessageCircle, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3,
  ChevronRight,
  X,
  Download,
  ShoppingBag,
  FileText
} from 'lucide-react';
import { Order, Product } from '../types';

interface ClientPurchasesStatsModuleProps {
  orders: Order[];
  clients: any[];
  products: Product[];
  initialSelectedClientId?: string | null;
  onClearSelectedClient?: () => void;
  onTriggerNotification?: (userId: string, title: string, message: string) => void;
  onOpenMessageModal?: (client: any) => void;
}

export const ClientPurchasesStatsModule: React.FC<ClientPurchasesStatsModuleProps> = ({
  orders,
  clients,
  initialSelectedClientId,
  onClearSelectedClient
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>('all');
  const [filterInactivity, setFilterInactivity] = useState<'all' | 'active' | 'inactive10'>('all');
  const [sortBy, setSortBy] = useState<'spent-desc' | 'orders-desc' | 'recent' | 'name'>('spent-desc');
  const [selectedClientDetail, setSelectedClientDetail] = useState<any | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<'orders' | 'products'>('orders');

  const normalizePhoneKey = (phone: string) => (phone || '').replace(/[^0-9+]/g, '').toLowerCase();

  // Compute rich purchasing statistics & complete history per client from orders + registered clients
  const clientStatsList = useMemo(() => {
    const clientMap = new Map<string, {
      id: string;
      facilityName: string;
      contactName: string;
      phone: string;
      facilityType: string;
      deliveryAddress: string;
      orders: Order[];
      totalSpent: number;
      paidAmount: number;
      unpaidAmount: number;
      productQuantities: Map<string, {
        name: string;
        variant: string;
        quantity: number;
        revenue: number;
        ordersCount: number;
        lastPurchasedAt: string;
      }>;
      firstOrderDate: string | null;
      lastOrderDate: string | null;
      daysSinceLastOrder: number;
    }>();

    // 1. Seed with known clients
    clients.forEach(c => {
      const key = normalizePhoneKey(c.phone) || (c.facilityName || c.id || '').toLowerCase().trim();
      if (!key) return;
      clientMap.set(key, {
        id: c.id,
        facilityName: c.facilityName || 'Établissement Sans Nom',
        contactName: c.contactName || 'Responsable Achats',
        phone: c.phone || '',
        facilityType: c.facilityType || 'Clinique',
        deliveryAddress: c.deliveryAddress || 'Libreville',
        orders: [],
        totalSpent: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        productQuantities: new Map(),
        firstOrderDate: null,
        lastOrderDate: null,
        daysSinceLastOrder: 999
      });
    });

    // 2. Aggregate orders
    orders.forEach(o => {
      const phoneKey = normalizePhoneKey(o.customer?.phone || '') || (o.customer?.facilityName || '').toLowerCase().trim();
      let record = clientMap.get(phoneKey);
      if (!record && o.userId) {
        for (const existing of clientMap.values()) {
          if (existing.id === o.userId) {
            record = existing;
            break;
          }
        }
      }
      if (!record) {
        record = {
          id: o.userId || `guest-${phoneKey}`,
          facilityName: o.customer.facilityName,
          contactName: o.customer.contactName,
          phone: o.customer.phone,
          facilityType: o.customer.facilityType || 'Clinique',
          deliveryAddress: o.customer.deliveryAddress,
          orders: [],
          totalSpent: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          productQuantities: new Map(),
          firstOrderDate: null,
          lastOrderDate: null,
          daysSinceLastOrder: 999
        };
        clientMap.set(phoneKey || record.id, record);
      }

      record.orders.push(o);
      if (o.status !== 'Annulée') {
        const orderAmount = o.estimatedTotal || 0;
        record.totalSpent += orderAmount;
        if (o.isPaid) {
          record.paidAmount += orderAmount;
        } else {
          record.unpaidAmount += orderAmount;
        }

        if (!record.firstOrderDate || new Date(o.createdAt) < new Date(record.firstOrderDate)) {
          record.firstOrderDate = o.createdAt;
        }
        if (!record.lastOrderDate || new Date(o.createdAt) > new Date(record.lastOrderDate)) {
          record.lastOrderDate = o.createdAt;
        }

        o.items.forEach(it => {
          const prodKey = `${it.productName}::${it.variant || ''}`;
          const existing = record!.productQuantities.get(prodKey) || {
            name: it.productName,
            variant: it.variant || 'Standard',
            quantity: 0,
            revenue: 0,
            ordersCount: 0,
            lastPurchasedAt: o.createdAt
          };
          existing.quantity += it.quantity;
          existing.revenue += it.total;
          existing.ordersCount += 1;
          if (new Date(o.createdAt) > new Date(existing.lastPurchasedAt)) {
            existing.lastPurchasedAt = o.createdAt;
          }
          record!.productQuantities.set(prodKey, existing);
        });
      }
    });

    // 3. Compute derived KPIs for each client
    const now = Date.now();
    return Array.from(clientMap.values()).map(entry => {
      const sortedOrders = [...entry.orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      const validOrdersCount = sortedOrders.filter(o => o.status !== 'Annulée').length;
      const averageOrderValue = validOrdersCount > 0 ? Math.round(entry.totalSpent / validOrdersCount) : 0;

      let daysSinceLast = 999;
      if (entry.lastOrderDate) {
        const orderTime = new Date(entry.lastOrderDate).getTime();
        daysSinceLast = Math.max(0, Math.floor((now - orderTime) / (1000 * 60 * 60 * 24)));
      }

      const isInactive = daysSinceLast >= 10;
      const allPurchasedProducts = Array.from(entry.productQuantities.values())
        .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);
      const topProducts = allPurchasedProducts.slice(0, 3);

      return {
        ...entry,
        orders: sortedOrders,
        totalOrdersCount: validOrdersCount,
        allOrdersCount: sortedOrders.length,
        averageOrderValue,
        daysSinceLastOrder: daysSinceLast,
        isInactive10Days: isInactive,
        topProducts,
        allPurchasedProducts
      };
    });
  }, [orders, clients]);

  useEffect(() => {
    if (!initialSelectedClientId) return;
    const match = clientStatsList.find(
      c => c.id === initialSelectedClientId || normalizePhoneKey(c.phone) === normalizePhoneKey(initialSelectedClientId)
    );
    if (match) {
      setSelectedClientDetail(match);
      setDetailModalTab('orders');
    }
  }, [initialSelectedClientId, clientStatsList]);

  // Overall Global Purchasing KPIs
  const globalKPIs = useMemo(() => {
    const totalRevenue = clientStatsList.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalPaid = clientStatsList.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalUnpaid = clientStatsList.reduce((sum, c) => sum + c.unpaidAmount, 0);
    const totalOrdersCount = clientStatsList.reduce((sum, c) => sum + c.totalOrdersCount, 0);
    const averageBasket = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
    const inactiveCount = clientStatsList.filter(c => c.isInactive10Days && c.totalOrdersCount > 0).length;
    const activeClientsCount = clientStatsList.filter(c => c.totalOrdersCount > 0 && !c.isInactive10Days).length;

    return {
      totalRevenue,
      totalPaid,
      totalUnpaid,
      totalOrdersCount,
      averageBasket,
      inactiveCount,
      activeClientsCount
    };
  }, [clientStatsList]);

  // Filtering & Sorting
  const filteredClients = useMemo(() => {
    let list = clientStatsList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.facilityName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    }

    if (selectedFacilityType !== 'all') {
      list = list.filter(c => c.facilityType === selectedFacilityType);
    }

    if (filterInactivity === 'active') {
      list = list.filter(c => !c.isInactive10Days && c.totalOrdersCount > 0);
    } else if (filterInactivity === 'inactive10') {
      list = list.filter(c => c.isInactive10Days && c.totalOrdersCount > 0);
    }

    if (sortBy === 'spent-desc') {
      list = [...list].sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (sortBy === 'orders-desc') {
      list = [...list].sort((a, b) => b.totalOrdersCount - a.totalOrdersCount);
    } else if (sortBy === 'recent') {
      list = [...list].sort((a, b) => a.daysSinceLastOrder - b.daysSinceLastOrder);
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.facilityName.localeCompare(b.facilityName, 'fr'));
    }

    return list;
  }, [clientStatsList, searchQuery, selectedFacilityType, filterInactivity, sortBy]);

  const generateRelaunchUrl = (client: any) => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const topItemsStr = client.topProducts.map((p: any) => p.name).join(', ');
    const itemsPart = topItemsStr ? ` notamment en ${topItemsStr}` : '';
    const message = `Bonjour ${client.contactName || client.facilityName},\nL'équipe commerciale de Gloryday Pharma Gabon espère que votre établissement se porte bien.\nNous constatons que votre dernier réassort date d'il y a ${client.daysSinceLastOrder} jours. Avez-vous besoin d'un réapprovisionnement urgent${itemsPart} ?\nNous pouvons vous livrer aujourd'hui même à Libreville.`;
    return `https://wa.me/${cleanPhone || '24177003004'}?text=${encodeURIComponent(message)}`;
  };

  const handleExportClientHistoryCsv = (client: any) => {
    const headers = [
      'Établissement',
      'Téléphone',
      'Référence Commande',
      'Date Commande',
      'Statut Commande',
      'Paiement',
      'Article Commandé',
      'Format / Variante',
      'Quantité',
      'Prix Unitaire (FCFA)',
      'Total Ligne (FCFA)',
      'Total Commande (FCFA)'
    ];
    const rows: string[][] = [];
    for (const ord of client.orders || []) {
      if (!ord.items || ord.items.length === 0) {
        rows.push([
          client.facilityName,
          client.phone,
          ord.reference,
          new Date(ord.createdAt).toLocaleString('fr-FR'),
          ord.status,
          ord.isPaid ? 'Payée' : 'En attente',
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
            client.facilityName,
            client.phone,
            ord.reference,
            new Date(ord.createdAt).toLocaleString('fr-FR'),
            ord.status,
            ord.isPaid ? 'Payée' : 'En attente',
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
    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h}"`).join(';'),
      ...rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (client.facilityName || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `historique-achats-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const closeDetailModal = () => {
    setSelectedClientDetail(null);
    if (onClearSelectedClient) onClearSelectedClient();
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">
            Volume Global Commandé
          </span>
          <div className="text-base sm:text-xl font-extrabold text-[#0f0f12] mt-1 tabular-nums">
            {globalKPIs.totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">FCFA</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Sur {globalKPIs.totalOrdersCount} commande(s) validée(s)
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">
            Encaissé vs En attente
          </span>
          <div className="text-sm sm:text-base font-extrabold text-emerald-700 mt-1 tabular-nums">
            {globalKPIs.totalPaid.toLocaleString('fr-FR')} F <span className="text-[10px] font-semibold text-slate-500">payés</span>
          </div>
          <p className="text-[10px] text-amber-700 font-semibold mt-0.5 tabular-nums">
            Reste : {globalKPIs.totalUnpaid.toLocaleString('fr-FR')} FCFA
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block">
            Clients Actifs
          </span>
          <div className="text-base sm:text-xl font-extrabold text-emerald-900 mt-1 tabular-nums">
            {globalKPIs.activeClientsCount} <span className="text-xs font-medium text-emerald-700">établissements</span>
          </div>
          <p className="text-[10px] text-emerald-700 mt-0.5">
            Moins de 10j depuis dernier achat
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase block">
            Inactifs à Relancer (&gt; 10j)
          </span>
          <div className="text-base sm:text-xl font-extrabold text-amber-900 mt-1 tabular-nums">
            {globalKPIs.inactiveCount} <span className="text-xs font-medium text-amber-700">à relancer</span>
          </div>
          <p className="text-[10px] text-amber-700 mt-0.5">
            Relance WhatsApp 1-clic dispo
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher un client (clinique, hôpital, pharmacie, contact, téléphone)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/80 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0d44e8] focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setFilterInactivity('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterInactivity === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tous ({clientStatsList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterInactivity('active')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterInactivity === 'active' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Actifs
              </button>
              <button
                type="button"
                onClick={() => setFilterInactivity('inactive10')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  filterInactivity === 'inactive10' ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Inactifs &gt; 10j ({globalKPIs.inactiveCount})</span>
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shrink-0"
            >
              <option value="spent-desc">Trier : Dépense totale ↓</option>
              <option value="orders-desc">Trier : Nb Commandes ↓</option>
              <option value="recent">Trier : Commande récente</option>
              <option value="name">Trier : Nom A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Client Purchases */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-3.5 px-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0d44e8]" />
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Historique & Statistiques des Achats par Client ({filteredClients.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Cliquez sur « Historique d'achats » pour voir toutes les commandes et les produits achetés
          </span>
        </div>

        {filteredClients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucun client ne correspond aux critères de filtre.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClients.map((client) => {
              const cleanPhone = client.phone.replace(/[^0-9]/g, '');
              return (
                <div 
                  key={client.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Client Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">
                        {client.facilityName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#eef3ff] text-[#0d44e8] border border-blue-200">
                        {client.facilityType}
                      </span>
                      {client.isInactive10Days && client.totalOrdersCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Inactif &gt; 10 jours
                        </span>
                      ) : client.totalOrdersCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Client Actif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Inscrit sans commande
                        </span>
                      )}
                      {client.lastOrderDate && (
                        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                          · Dernier achat : {new Date(client.lastOrderDate).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-600 text-[11px] flex items-center gap-3 flex-wrap">
                      <span>Contact : <strong>{client.contactName}</strong></span>
                      <span>·</span>
                      <a href={`tel:${cleanPhone}`} className="text-[#0d44e8] hover:underline font-semibold">
                        {client.phone}
                      </a>
                      <span>·</span>
                      <span className="text-slate-500 truncate">{client.deliveryAddress}</span>
                    </div>

                    {/* Top Purchased Products */}
                    {client.topProducts.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Produits achetés :
                        </span>
                        {client.topProducts.map((p: any, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1"
                          >
                            <Package className="w-2.5 h-2.5 text-slate-400" />
                            {p.name} ({p.quantity} u. · {p.revenue.toLocaleString('fr-FR')} F)
                          </span>
                        ))}
                        {client.allPurchasedProducts.length > 3 && (
                          <span className="text-[10px] font-bold text-[#0d44e8]">
                            +{client.allPurchasedProducts.length - 3} autre(s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Middle: Financial Metrics */}
                  <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none shrink-0 border sm:border-0 border-slate-200/60">
                    <div>
                      <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">
                        Commandes
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 tabular-nums">
                        {client.totalOrdersCount}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">
                        Total Acheté
                      </span>
                      <span className="font-extrabold text-sm text-[#000000] tabular-nums">
                        {client.totalSpent.toLocaleString('fr-FR')} <span className="text-[10px]">F</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">
                        Panier Moyen
                      </span>
                      <span className="font-bold text-xs text-[#0d44e8] tabular-nums">
                        {client.averageOrderValue.toLocaleString('fr-FR')} <span className="text-[10px]">F</span>
                      </span>
                    </div>
                  </div>

                  {/* Right: Quick Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientDetail(client);
                        setDetailModalTab('orders');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Consulter l'historique complet des achats de ce client"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                      <span>Historique d'achats ({client.allOrdersCount})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportClientHistoryCsv(client)}
                      disabled={client.orders.length === 0}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                      title="Exporter l'historique d'achats en CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={generateRelaunchUrl(client)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      title="Envoyer un message de relance sur WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Relancer</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Client Purchase History Modal */}
      {selectedClientDetail && (
        <div 
          onClick={closeDetailModal}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] text-slate-900"
          >
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-950 text-white shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Historique Client
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {selectedClientDetail.facilityName}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedClientDetail.facilityType} · {selectedClientDetail.contactName} ({selectedClientDetail.phone}) · {selectedClientDetail.deliveryAddress}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportClientHistoryCsv(selectedClientDetail)}
                  disabled={selectedClientDetail.orders.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b38c4] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter CSV</span>
                </button>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Financial Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Commandes</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">{selectedClientDetail.totalOrdersCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Acheté</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {selectedClientDetail.totalSpent.toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Montant Payé</span>
                  <span className="text-base font-extrabold text-emerald-700 tabular-nums">
                    {(selectedClientDetail.paidAmount || 0).toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 font-bold uppercase block">Reste à Payer</span>
                  <span className="text-base font-extrabold text-amber-700 tabular-nums">
                    {(selectedClientDetail.unpaidAmount || 0).toLocaleString('fr-FR')} F
                  </span>
                </div>
              </div>

              {/* Sub-tabs inside Modal: Orders History vs Purchased Products Summary */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setDetailModalTab('orders')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                    detailModalTab === 'orders'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Bons de Commande ({selectedClientDetail.orders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalTab('products')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                    detailModalTab === 'products'
                      ? 'bg-[#0d44e8] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Produits Achetés ({selectedClientDetail.allPurchasedProducts?.length || 0})</span>
                </button>
              </div>

              {detailModalTab === 'orders' ? (
                <div>
                  {selectedClientDetail.orders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                      Aucune commande enregistrée pour cet établissement client.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedClientDetail.orders.map((ord: Order) => (
                        <div key={ord.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-sm text-[#0d44e8]">{ord.reference}</span>
                              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                · {new Date(ord.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                ord.isPaid
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {ord.isPaid ? '✓ Payée' : 'En attente de règlement'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.status === 'Livrée'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : ord.status === 'Annulée'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-800'
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                          </div>

                          {/* Items Table inside Order */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="text-slate-400 font-bold uppercase border-b border-slate-100">
                                  <th className="py-1 pr-2">Produit commandé</th>
                                  <th className="py-1 px-2">Conditionnement</th>
                                  <th className="py-1 px-2 text-right">Qté</th>
                                  <th className="py-1 px-2 text-right">P.U.</th>
                                  <th className="py-1 pl-2 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {ord.items.map((it, i) => (
                                  <tr key={i} className="text-slate-700">
                                    <td className="py-1.5 pr-2 font-semibold text-slate-900">{it.productName}</td>
                                    <td className="py-1.5 px-2 text-slate-500">{it.variant}</td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums font-bold">{it.quantity}</td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                                      {it.isQuote ? 'Sur devis' : `${it.price.toLocaleString('fr-FR')} F`}
                                    </td>
                                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums font-bold text-slate-900">
                                      {it.isQuote ? 'Sur devis' : `${it.total.toLocaleString('fr-FR')} F`}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
                            <span className="text-slate-500">
                              Mode : <strong>{ord.customer.deliveryMode === 'retrait' ? 'Retrait dépôt' : 'Livraison'}</strong> · Paiement : <strong>{ord.customer.paymentMethod}</strong>
                            </span>
                            <span className="font-black text-slate-900 font-mono tabular-nums">
                              Total : {ord.estimatedTotal.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {(!selectedClientDetail.allPurchasedProducts || selectedClientDetail.allPurchasedProducts.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                      Aucun produit acheté par ce client pour le moment.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                            <th className="py-2.5 px-3">Article Médical</th>
                            <th className="py-2.5 px-3">Variante</th>
                            <th className="py-2.5 px-3 text-right">Qté Totale</th>
                            <th className="py-2.5 px-3 text-right">Nb Commandes</th>
                            <th className="py-2.5 px-3 text-right">Montant Cumulé</th>
                            <th className="py-2.5 px-3 text-right">Dernier Achat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedClientDetail.allPurchasedProducts.map((prod: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-bold text-slate-900">{prod.name}</td>
                              <td className="py-2.5 px-3 text-slate-600">{prod.variant}</td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-extrabold text-[#0d44e8]">{prod.quantity}</td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">{prod.ordersCount}</td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                                {prod.revenue.toLocaleString('fr-FR')} FCFA
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                                {new Date(prod.lastPurchasedAt).toLocaleDateString('fr-FR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
              <div className="text-[11px] text-slate-500">
                {selectedClientDetail.firstOrderDate && (
                  <span>Client actif depuis le {new Date(selectedClientDetail.firstOrderDate).toLocaleDateString('fr-FR')}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={generateRelaunchUrl(selectedClientDetail)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Contacter sur WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

