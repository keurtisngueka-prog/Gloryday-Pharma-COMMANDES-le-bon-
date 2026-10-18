import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Download, 
  Calendar, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  Package,
  Layers,
  MapPin,
  Users
} from 'lucide-react';
import { AdminStats, Order, Product, User } from '../types';

interface EnterpriseReportsModuleProps {
  stats: AdminStats | null;
  orders: Order[];
  products: Product[];
  currentUser: User;
}

export const EnterpriseReportsModule: React.FC<EnterpriseReportsModuleProps> = ({
  stats,
  orders,
  products,
  currentUser
}) => {
  const [periodFilter, setPeriodFilter] = useState<'7' | '14' | '30' | 'all'>('14');

  // Filtered orders by period
  const filteredOrders = useMemo(() => {
    if (periodFilter === 'all') return orders;
    const days = Number(periodFilter);
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    return orders.filter(o => new Date(o.createdAt).getTime() >= cutoff);
  }, [orders, periodFilter]);

  // Breakdown calculations
  const totalRevenue = useMemo(() => {
    return filteredOrders
      .filter(o => o.status !== 'Annulée')
      .reduce((sum, o) => sum + (o.estimatedTotal || 0), 0);
  }, [filteredOrders]);

  const cancelledOrdersCount = useMemo(() => {
    return filteredOrders.filter(o => o.status === 'Annulée').length;
  }, [filteredOrders]);

  const cancellationRate = useMemo(() => {
    if (filteredOrders.length === 0) return 0;
    return Math.round((cancelledOrdersCount / filteredOrders.length) * 100);
  }, [filteredOrders, cancelledOrdersCount]);

  // Breakdown by delivery zone
  const revenueByZone = useMemo(() => {
    const zones: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const z = o.deliveryZone || o.customer.neighborhoodName || 'Zone 1 (Centre)';
      zones[z] = (zones[z] || 0) + (o.estimatedTotal || 0);
    });
    return Object.entries(zones).sort((a, b) => b[1] - a[1]);
  }, [filteredOrders]);

  // Breakdown by product category
  const revenueByCategory = useMemo(() => {
    const catRevenue: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(it => {
        const cat = it.category || 'Dispositifs Médicaux Généraux';
        catRevenue[cat] = (catRevenue[cat] || 0) + (it.total || 0);
      });
    });
    return Object.entries(catRevenue).sort((a, b) => b[1] - a[1]);
  }, [filteredOrders]);

  // Sleeping products (> 30 days without order or zero orders)
  const orderedProductNames = useMemo(() => {
    const set = new Set<string>();
    filteredOrders.forEach(o => {
      o.items.forEach(it => set.add(it.productName.toLowerCase()));
    });
    return set;
  }, [filteredOrders]);

  const sleepingProducts = useMemo(() => {
    return products.filter(p => !orderedProductNames.has(p.name.toLowerCase()));
  }, [products, orderedProductNames]);

  // Estimated gross margin
  const estimatedGrossMargin = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    filteredOrders
      .filter(o => o.status !== 'Annulée')
      .forEach(o => {
        o.items.forEach(it => {
          revenue += it.total || 0;
          const prod = products.find(p => p.id === it.productId);
          const buyPrice = prod?.purchasePrice || Math.round((it.price || 0) * 0.65);
          cost += buyPrice * it.quantity;
        });
      });
    const marginAmount = Math.max(0, revenue - cost);
    const marginRate = revenue > 0 ? Math.round((marginAmount / revenue) * 100) : 32;
    return { marginAmount, marginRate };
  }, [filteredOrders, products]);

  // Accounting CSV Export
  const exportAccountingReport = () => {
    const headers = [
      'Reference',
      'Date',
      'Client',
      'Statut',
      'MontantTTC_FCFA',
      'ModePaiement',
      'Payee',
      'Zone'
    ];
    const rows = filteredOrders.map(o => [
      `"${o.reference}"`,
      `"${new Date(o.createdAt).toLocaleDateString('fr-FR')}"`,
      `"${o.customer.facilityName.replace(/"/g, '""')}"`,
      `"${o.status}"`,
      o.estimatedTotal || 0,
      `"${o.customer.paymentMethod}"`,
      o.isPaid ? 'OUI' : 'NON',
      `"${o.deliveryZone || o.customer.neighborhoodName || ''}"`
    ].join(';'));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_comptable_gloryday_${periodFilter}j_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0d44e8]" />
            <h2 className="text-sm font-bold text-slate-900">
              Pilotage Financier Avancé & Reporting Opérationnel
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyse des marges, ventilation par zone/catégorie, produits dormants et rapprochement comptable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriodFilter('7')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                periodFilter === '7' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              7j
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('14')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                periodFilter === '14' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              14j
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('30')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                periodFilter === '30' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              30j
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('all')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                periodFilter === 'all' ? 'bg-[#0f0f12] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tout
            </button>
          </div>

          <button
            type="button"
            onClick={exportAccountingReport}
            className="py-2 px-3 bg-[#0d44e8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Comptable CSV</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* KPI Row 1: Marge & Annulations */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Chiffre d'Affaires Période</span>
            <div className="text-lg font-black text-slate-900 mt-1 font-mono tabular-nums">
              {totalRevenue.toLocaleString('fr-FR')} F
            </div>
            <span className="text-[11px] text-slate-500">{filteredOrders.length} commandes traitées</span>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Marge Brute Estimée</span>
            <div className="text-lg font-black text-emerald-900 mt-1 font-mono tabular-nums">
              +{estimatedGrossMargin.marginAmount.toLocaleString('fr-FR')} F
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">Taux moyen : {estimatedGrossMargin.marginRate}%</span>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Encours & Impayés</span>
            <div className="text-lg font-black text-amber-900 mt-1 font-mono tabular-nums">
              {(stats?.pendingPaymentAmount || 0).toLocaleString('fr-FR')} F
            </div>
            <span className="text-[11px] text-amber-700 font-semibold">À recouvrir (cliniques)</span>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30">
            <span className="text-[10px] font-bold text-rose-800 uppercase">Taux d'Annulation</span>
            <div className="text-lg font-black text-rose-900 mt-1 font-mono tabular-nums">
              {cancellationRate}%
            </div>
            <span className="text-[11px] text-rose-700 font-semibold">{cancelledOrdersCount} annulation(s)</span>
          </div>
        </div>

        {/* 14-Day Sales Sparkline representation */}
        {stats?.salesLast14Days && stats.salesLast14Days.length > 0 && (
          <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#0d44e8]" />
                <span>Courbe des Ventes Récentes (14 derniers jours)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Moyenne : {Math.round(totalRevenue / 14).toLocaleString('fr-FR')} FCFA / jour
              </span>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-14 gap-1 pt-2 items-end h-24">
              {stats.salesLast14Days.map((d, i) => {
                const max = Math.max(...stats.salesLast14Days.map(x => x.amount), 100000);
                const heightPercent = Math.max(12, Math.round((d.amount / max) * 100));
                return (
                  <div key={i} className="flex flex-col items-center gap-1 h-full justify-end group">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-[#0d44e8] hover:bg-blue-600 rounded-t transition-all group-hover:scale-y-105"
                      title={`${d.date} : ${d.amount.toLocaleString('fr-FR')} FCFA (${d.count} commandes)`}
                    />
                    <span className="text-[9px] font-mono text-slate-400 rotate-45 sm:rotate-0">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Two-column analysis: Breakdown by Zone & Breakdown by Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Revenue by Zone */}
          <div className="p-3.5 border border-slate-200 rounded-xl space-y-2.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Chiffre d'Affaires par Zone Géographique</span>
            </h4>
            <div className="space-y-1.5">
              {revenueByZone.map(([zone, amount], i) => {
                const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-800">{zone}</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {amount.toLocaleString('fr-FR')} F ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="p-3.5 border border-slate-200 rounded-xl space-y-2.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Ventilation des Ventes par Catégorie</span>
            </h4>
            <div className="space-y-1.5">
              {revenueByCategory.map(([cat, amount], i) => {
                const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-800">{cat}</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {amount.toLocaleString('fr-FR')} F ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sleeping Products Section */}
        <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Produits Dormants (Aucune commande sur la période : {sleepingProducts.length} articles)</span>
            </h4>
          </div>
          <p className="text-[11px] text-slate-500">
            Ces références occupent du stock sans rotation. Envisagez une promotion ou un bundle dans un pack clinique.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {sleepingProducts.slice(0, 6).map((sp) => (
              <div key={sp.id} className="p-2 border border-slate-200 rounded-lg bg-white flex justify-between items-center">
                <span className="font-semibold text-slate-800 truncate mr-2">{sp.name}</span>
                <span className="font-mono text-slate-400 shrink-0 text-[10px]">
                  {typeof sp.stockQuantity === 'number' ? sp.stockQuantity : 40} en stock
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
