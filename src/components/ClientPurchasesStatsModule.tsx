import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Building2, 
  Search, 
  ArrowUpDown, 
  MessageCircle, 
  Send, 
  Clock, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  DollarSign,
  Filter,
  BarChart3,
  Calendar,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';
import { Order, User, FacilityType, Product } from '../types';

interface ClientPurchasesStatsModuleProps {
  orders: Order[];
  clients: any[];
  products: Product[];
  onTriggerNotification?: (userId: string, title: string, message: string) => void;
  onOpenMessageModal?: (client: any) => void;
}

export const ClientPurchasesStatsModule: React.FC<ClientPurchasesStatsModuleProps> = ({
  orders,
  clients,
  products,
  onTriggerNotification,
  onOpenMessageModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>('all');
  const [filterInactivity, setFilterInactivity] = useState<'all' | 'active' | 'inactive10'>('all');
  const [sortBy, setSortBy] = useState<'spent-desc' | 'orders-desc' | 'recent' | 'name'>('spent-desc');
  const [selectedClientDetail, setSelectedClientDetail] = useState<any | null>(null);

  // Compute rich purchasing statistics per client from orders + registered clients
  const clientStatsList = useMemo(() => {
    // Group orders by client phone or facilityName
    const clientMap = new Map<string, {
      id: string;
      facilityName: string;
      contactName: string;
      phone: string;
      facilityType: string;
      deliveryAddress: string;
      orders: Order[];
      totalSpent: number;
      productQuantities: Map<string, { name: string; quantity: number; revenue: number }>;
      lastOrderDate: string | null;
      daysSinceLastOrder: number;
    }>();

    // 1. Seed with known clients
    clients.forEach(c => {
      const key = (c.phone || c.facilityName || c.id).toLowerCase().trim();
      clientMap.set(key, {
        id: c.id,
        facilityName: c.facilityName || 'Établissement Sans Nom',
        contactName: c.contactName || 'Responsable Achats',
        phone: c.phone || '',
        facilityType: c.facilityType || 'Clinique',
        deliveryAddress: c.deliveryAddress || 'Libreville',
        orders: [],
        totalSpent: 0,
        productQuantities: new Map(),
        lastOrderDate: null,
        daysSinceLastOrder: 999
      });
    });

    // 2. Aggregate orders
    orders.forEach(o => {
      const phoneKey = (o.customer.phone || o.customer.facilityName || '').toLowerCase().trim();
      let record = clientMap.get(phoneKey);
      if (!record) {
        // Guest customer who ordered
        record = {
          id: `guest-${phoneKey}`,
          facilityName: o.customer.facilityName,
          contactName: o.customer.contactName,
          phone: o.customer.phone,
          facilityType: o.customer.facilityType || 'Clinique',
          deliveryAddress: o.customer.deliveryAddress,
          orders: [],
          totalSpent: 0,
          productQuantities: new Map(),
          lastOrderDate: null,
          daysSinceLastOrder: 999
        };
        clientMap.set(phoneKey, record);
      }

      record.orders.push(o);
      record.totalSpent += o.estimatedTotal || 0;

      // Track last order date
      if (!record.lastOrderDate || new Date(o.createdAt) > new Date(record.lastOrderDate)) {
        record.lastOrderDate = o.createdAt;
      }

      // Track item breakdown
      o.items.forEach(it => {
        const prodKey = it.productName;
        const existing = record!.productQuantities.get(prodKey) || { name: it.productName, quantity: 0, revenue: 0 };
        existing.quantity += it.quantity;
        existing.revenue += it.total;
        record!.productQuantities.set(prodKey, existing);
      });
    });

    // 3. Compute derived KPIs for each client
    const now = Date.now();
    const result = Array.from(clientMap.values()).map(entry => {
      const orderCount = entry.orders.length;
      const averageOrderValue = orderCount > 0 ? Math.round(entry.totalSpent / orderCount) : 0;
      
      let daysSinceLast = 999;
      if (entry.lastOrderDate) {
        const orderTime = new Date(entry.lastOrderDate).getTime();
        daysSinceLast = Math.max(0, Math.floor((now - orderTime) / (1000 * 60 * 60 * 24)));
      }

      const isInactive = daysSinceLast >= 10;

      // Top 3 products
      const topProducts = Array.from(entry.productQuantities.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3);

      return {
        ...entry,
        totalOrdersCount: orderCount,
        averageOrderValue,
        daysSinceLastOrder: daysSinceLast,
        isInactive10Days: isInactive,
        topProducts
      };
    });

    return result;
  }, [orders, clients]);

  // Overall Global Purchasing KPIs
  const globalKPIs = useMemo(() => {
    const totalRevenue = clientStatsList.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalOrdersCount = clientStatsList.reduce((sum, c) => sum + c.totalOrdersCount, 0);
    const averageBasket = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
    const inactiveCount = clientStatsList.filter(c => c.isInactive10Days && c.totalOrdersCount > 0).length;
    const activeClientsCount = clientStatsList.filter(c => c.totalOrdersCount > 0 && !c.isInactive10Days).length;

    // Top customer
    const sortedByRevenue = [...clientStatsList].sort((a, b) => b.totalSpent - a.totalSpent);
    const topClient = sortedByRevenue[0] || null;

    return {
      totalRevenue,
      totalOrdersCount,
      averageBasket,
      inactiveCount,
      activeClientsCount,
      topClient
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

  return (
    <div className="space-y-4">
      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">
            Volume d'Achats Cumulé
          </span>
          <div className="text-base sm:text-xl font-extrabold text-[#0f0f12] mt-1 tabular-nums">
            {globalKPIs.totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">FCFA</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Sur {globalKPIs.totalOrdersCount} commandes totales
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-[#6a6a6b] uppercase block">
            Panier Moyen Client
          </span>
          <div className="text-base sm:text-xl font-extrabold text-[#0d44e8] mt-1 tabular-nums">
            {globalKPIs.averageBasket.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">FCFA</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Dépense moyenne par bon
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block">
            Clients Actifs
          </span>
          <div className="text-base sm:text-xl font-extrabold text-emerald-900 mt-1">
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
          <div className="text-base sm:text-xl font-extrabold text-amber-900 mt-1">
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
              placeholder="Rechercher par clinique, hôpital, pharmacie, contact, tél..."
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
            {/* Status Segment */}
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

            {/* Sort Select */}
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
              Statistiques Détaillées des Achats Clients ({filteredClients.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Tarifs en FCFA nets
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
                  className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
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

                    {/* Top Purchased Products pills */}
                    {client.topProducts.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Articles fréquents :
                        </span>
                        {client.topProducts.map((p: any, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1"
                          >
                            <Package className="w-2.5 h-2.5 text-slate-400" />
                            {p.name} ({p.quantity})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Middle: Financial Metrics */}
                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-center bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none shrink-0 border sm:border-0 border-slate-200/60">
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
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedClientDetail(client)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Voir le détail des commandes"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span className="hidden sm:inline">Détail</span>
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

      {/* Detailed Client Modal */}
      {selectedClientDetail && (
        <div 
          onClick={() => setSelectedClientDetail(null)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] text-slate-900"
          >
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  {selectedClientDetail.facilityName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedClientDetail.facilityType} · {selectedClientDetail.contactName} ({selectedClientDetail.phone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Financial Quick Cards */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Commandes</span>
                  <span className="text-base font-extrabold text-slate-900">{selectedClientDetail.totalOrdersCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Acheté</span>
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {selectedClientDetail.totalSpent.toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Panier Moyen</span>
                  <span className="text-base font-extrabold text-[#0d44e8] tabular-nums">
                    {selectedClientDetail.averageOrderValue.toLocaleString('fr-FR')} F
                  </span>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px] mb-2">
                  Historique des Bons de Commande ({selectedClientDetail.orders.length})
                </h4>
                {selectedClientDetail.orders.length === 0 ? (
                  <p className="text-slate-400 italic">Aucune commande enregistrée pour ce client.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedClientDetail.orders.map((ord: Order) => (
                      <div key={ord.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#0d44e8]">{ord.reference}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {ord.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 text-[11px]">
                          <span>{new Date(ord.createdAt).toLocaleDateString('fr-FR')}</span>
                          <strong className="text-slate-900">{ord.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {ord.items.map(it => `${it.productName} (${it.quantity})`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <a
                href={generateRelaunchUrl(selectedClientDetail)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Ouvrir WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedClientDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
