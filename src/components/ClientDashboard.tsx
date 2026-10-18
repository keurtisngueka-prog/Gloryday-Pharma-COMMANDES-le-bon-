import React, { useMemo, useState } from 'react';
import { 
  Building2, 
  Package, 
  TrendingUp, 
  Clock, 
  RotateCcw, 
  FileText, 
  MessageCircle, 
  AlertCircle, 
  Truck,
  Award,
  Sparkles,
  Calendar,
  Repeat,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ShoppingBag,
  ArrowRight,
  Plus,
  BarChart3,
  Check
} from 'lucide-react';
import { Order, OrderStatus, User, CartItem } from '../types';

interface ClientDashboardProps {
  orders: Order[];
  currentUser: User | null;
  onReorder: (order: Order) => void;
  onOpenAuth: () => void;
  onRefreshOrders: () => void;
  onViewOrderPdf: (order: Order) => void;
  onTrackDelivery?: (order: Order) => void;
  onAddToCartItem?: (item: CartItem) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  orders,
  currentUser,
  onReorder,
  onOpenAuth,
  onRefreshOrders,
  onViewOrderPdf,
  onTrackDelivery,
  onAddToCartItem
}) => {
  const nonCancelledOrders = orders.filter(o => o.status !== 'Annulée');
  const totalSpent = nonCancelledOrders.reduce((sum, o) => sum + o.estimatedTotal, 0);
  const pendingOrders = orders.filter(o => o.status === 'À confirmer' || o.status === 'Confirmée' || o.status === 'En préparation');
  const latestOrder = orders.length > 0 ? orders[0] : null;

  // Track item IDs that were recently added to cart from the top articles list
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Advanced Client Statistics & Loyalty Intelligence
  const stats = useMemo(() => {
    const validOrders = orders.filter(o => o.status !== 'Annulée');
    const deliveredOrders = validOrders.filter(o => o.status === 'Livrée');
    const deliveredSpent = deliveredOrders.reduce((sum, o) => sum + o.estimatedTotal, 0);

    // Chronological analysis for ordering frequency
    const sortedChrono = [...validOrders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let avgFrequencyDays: number | null = null;
    let daysSinceLastOrder: number | null = null;
    let nextReorderInDays: number | null = null;

    if (sortedChrono.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < sortedChrono.length; i++) {
        const diffMs = new Date(sortedChrono[i].createdAt).getTime() - new Date(sortedChrono[i - 1].createdAt).getTime();
        const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        intervals.push(diffDays);
      }
      avgFrequencyDays = Math.max(1, Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length));
      const lastOrderTime = new Date(sortedChrono[sortedChrono.length - 1].createdAt).getTime();
      daysSinceLastOrder = Math.max(0, Math.round((Date.now() - lastOrderTime) / (1000 * 60 * 60 * 24)));
      nextReorderInDays = Math.max(0, avgFrequencyDays - daysSinceLastOrder);
    } else if (sortedChrono.length === 1) {
      const lastOrderTime = new Date(sortedChrono[0].createdAt).getTime();
      daysSinceLastOrder = Math.max(0, Math.round((Date.now() - lastOrderTime) / (1000 * 60 * 60 * 24)));
    }

    // Loyalty Tier calculation based on accumulated orders and spend
    let tier: 'Bronze' | 'Argent' | 'Or' = 'Bronze';
    let tierTitle = 'Établissement Adhérent';
    let tierColor = 'text-amber-800 bg-amber-50 border-amber-200';
    let tierPrivilege = 'Tarifs de gros directs Libreville & devis sous 2h';
    let nextTierName = 'Partenaire Médical Privilège (Argent)';
    let nextTierThreshold = 150000;
    let progressPercent = Math.min(100, Math.round((totalSpent / 150000) * 100));

    if (totalSpent >= 500000 || validOrders.length >= 6) {
      tier = 'Or';
      tierTitle = 'Grand Compte Hospitalier VIP';
      tierColor = 'text-purple-900 bg-purple-50 border-purple-200';
      tierPrivilege = 'Livraison express prioritaire Libreville (45 min) & ligne directe Direction';
      nextTierName = 'Palier Maximal atteint';
      nextTierThreshold = 500000;
      progressPercent = 100;
    } else if (totalSpent >= 150000 || validOrders.length >= 3) {
      tier = 'Argent';
      tierTitle = 'Partenaire Médical Privilège';
      tierColor = 'text-[#0d44e8] bg-blue-50 border-blue-200';
      tierPrivilege = 'Franco de port prioritaire dès 50 000 FCFA & remises campagnes';
      nextTierName = 'Grand Compte Hospitalier VIP (Or)';
      nextTierThreshold = 500000;
      progressPercent = Math.min(100, Math.round(((totalSpent - 150000) / (500000 - 150000)) * 100));
    }

    // Top ordered articles aggregation
    const itemsMap = new Map<string, {
      productId: string;
      productName: string;
      variant: string;
      category?: string;
      price: number;
      isQuote: boolean;
      totalQty: number;
      orderCount: number;
      totalSpent: number;
    }>();

    validOrders.forEach(o => {
      o.items.forEach(it => {
        const key = `${it.productId}__${it.variant}`;
        const existing = itemsMap.get(key);
        if (existing) {
          existing.totalQty += it.quantity;
          existing.orderCount += 1;
          existing.totalSpent += it.total;
        } else {
          itemsMap.set(key, {
            productId: it.productId,
            productName: it.productName,
            variant: it.variant,
            category: it.category,
            price: it.price,
            isQuote: it.isQuote,
            totalQty: it.quantity,
            orderCount: 1,
            totalSpent: it.total
          });
        }
      });
    });

    const topItems = Array.from(itemsMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    // Category distribution
    const categoryMap = new Map<string, number>();
    validOrders.forEach(o => {
      o.items.forEach(it => {
        const cat = it.category || 'Consommables médicaux';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + it.total);
      });
    });

    const categoriesList = Array.from(categoryMap.entries()).map(([cat, amount]) => ({
      name: cat,
      amount,
      percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      totalSpent,
      deliveredSpent,
      validOrdersCount: validOrders.length,
      deliveredOrdersCount: deliveredOrders.length,
      avgFrequencyDays,
      daysSinceLastOrder,
      nextReorderInDays,
      tier,
      tierTitle,
      tierColor,
      tierPrivilege,
      nextTierName,
      nextTierThreshold,
      progressPercent,
      topItems,
      categoriesList
    };
  }, [orders, totalSpent]);

  const handleQuickAddToCart = (item: {
    productId: string;
    productName: string;
    variant: string;
    category?: string;
    price: number;
    isQuote: boolean;
  }) => {
    if (onAddToCartItem) {
      const cartItem: CartItem = {
        productId: item.productId,
        productName: item.productName,
        category: item.category || 'Consommables médicaux',
        variant: item.variant,
        price: item.price,
        quantity: 1,
        isQuote: item.isQuote
      };
      onAddToCartItem(cartItem);
      setRecentlyAddedId(`${item.productId}__${item.variant}`);
      setTimeout(() => setRecentlyAddedId(null), 2000);
    }
  };

  const steps = [
    { label: 'À confirmer', desc: 'Reçue WhatsApp' },
    { label: 'Confirmée', desc: 'Validée' },
    { label: 'En préparation', desc: 'Colisage' },
    { label: 'Livrée', desc: 'Mise à disposition' }
  ];

  const getStatusStepIndex = (status: OrderStatus) => {
    if (status === 'À confirmer') return 0;
    if (status === 'Confirmée') return 1;
    if (status === 'En préparation') return 2;
    if (status === 'Livrée') return 3;
    return -1;
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-5 px-2 sm:px-0">
      {/* Client Profile Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#eef3ff] text-[#0d44e8] font-bold text-xl flex items-center justify-center shrink-0">
            {currentUser ? currentUser.facilityName.charAt(0).toUpperCase() : <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {currentUser ? currentUser.facilityName : 'Espace Client & Commandes'}
              </h1>
              {currentUser?.facilityType && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {currentUser.facilityType}
                </span>
              )}
            </div>
            <p className="text-xs text-[#6a6a6b] mt-0.5">
              {currentUser?.phone ? `WhatsApp : ${currentUser.phone}` : 'Historique local de vos commandes'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!currentUser ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3.5 py-2 rounded-xl bg-[#0d44e8] text-white text-xs font-bold hover:bg-[#0b3ac7] cursor-pointer"
            >
              Se connecter
            </button>
          ) : (
            <a
              href="https://wa.me/24177003004"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contact Commercial</span>
            </a>
          )}
          <button
            type="button"
            onClick={onRefreshOrders}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">Commandes</span>
          <span className="text-lg sm:text-xl font-black text-slate-900">{orders.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">En cours</span>
          <span className="text-lg sm:text-xl font-black text-[#0d44e8]">{pendingOrders.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">Dépenses (sans TVA)</span>
          <span className="text-base sm:text-xl font-black text-slate-900 tabular-nums">
            {totalSpent.toLocaleString('fr-FR')} <span className="text-[11px] font-bold text-slate-500">FCFA</span>
          </span>
        </div>
      </div>

      {/* SECTION: MES STATISTIQUES & FIDÉLITÉ (INTEGRATED CLIENT ANALYTICS) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0d44e8] flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Mes Statistiques & Fidélité</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stats.tierColor}`}>
                  {stats.tier}
                </span>
              </h2>
              <p className="text-xs text-[#6a6a6b]">
                Analyse de votre volume d'achats, fréquence de réapprovisionnement et palmarès
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-700">{stats.tierTitle}</span>
          </div>
        </div>

        {/* 3 Analytics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Fidélité & Avantages Partenaire */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#0d44e8]" />
                  Statut Partenaire
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${stats.tierColor}`}>
                  {stats.tier}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {stats.tierTitle}
              </p>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                {stats.tierPrivilege}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 mb-1">
                <span>Progression fidélité</span>
                <span>{stats.progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#0d44e8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              {stats.tier !== 'Or' ? (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Prochain palier : <strong>{stats.nextTierName}</strong> à {stats.nextTierThreshold.toLocaleString('fr-FR')} FCFA
                </span>
              ) : (
                <span className="text-[10px] text-emerald-700 font-bold mt-1 block flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Privilèges VIP maximaux activés
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Fréquence de Commande & Réassort */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1.5">
                <Repeat className="w-3.5 h-3.5 text-[#0d44e8]" />
                Rythme de commande
              </span>
              {stats.avgFrequencyDays !== null ? (
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-slate-900">
                      ~ {stats.avgFrequencyDays} jours
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">d'intervalle</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Basé sur l'historique de vos {stats.validOrdersCount} commandes médicales.
                  </p>
                </div>
              ) : stats.validOrdersCount === 1 ? (
                <div>
                  <span className="text-sm font-bold text-slate-900 block">
                    Première commande récente
                  </span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Passée il y a {stats.daysSinceLastOrder || 0} jour(s). Le calcul de fréquence s'affinera dès votre second réassort.
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-sm font-bold text-slate-900 block">
                    Pas encore de commande
                  </span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Passez votre première commande pour initialiser le calcul de votre rythme d'approvisionnement.
                  </p>
                </div>
              )}
            </div>

            {/* Smart Restock Recommendation Badge */}
            {stats.avgFrequencyDays !== null && stats.daysSinceLastOrder !== null && (
              <div className="pt-2 border-t border-slate-200/60">
                {stats.daysSinceLastOrder > stats.avgFrequencyDays ? (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      <strong>Réassort conseillé :</strong> dernier achat il y a {stats.daysSinceLastOrder} j (rythme habituel dépassé).
                    </span>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Stocks à jour :</strong> prochain réassort estimé dans {stats.nextReorderInDays} jour(s).
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Volume Dépensé & Répartition Catégories */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#0d44e8]" />
                Volume Global Investi
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-slate-900 tabular-nums">
                  {stats.totalSpent.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs font-bold text-[#0d44e8]">FCFA</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                Dont <strong>{stats.deliveredSpent.toLocaleString('fr-FR')} FCFA</strong> en commandes livrées et réglées.
              </p>
            </div>

            {/* Category percentage bars */}
            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                Répartition des besoins
              </span>
              {stats.categoriesList.length > 0 ? (
                <div className="space-y-1">
                  {stats.categoriesList.slice(0, 2).map((cat) => (
                    <div key={cat.name} className="text-[10px]">
                      <div className="flex justify-between text-slate-700 font-medium">
                        <span className="truncate max-w-[140px]">{cat.name}</span>
                        <span>{cat.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-0.5">
                        <div 
                          className="bg-slate-700 h-full rounded-full"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic">
                  Aucune catégorie enregistrée.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top 5 Ordered Articles (Palmarès de Consommation avec Réapprovisionnement en 1 Clic) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0d44e8]" />
                <span>Articles les plus commandés par votre établissement</span>
              </h3>
              <p className="text-[11px] text-[#6a6a6b]">
                Réapprovisionnez vos références clés en un seul clic sans parcourir le catalogue
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Top {stats.topItems.length}
            </span>
          </div>

          {stats.topItems.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              Aucun article commandé pour le moment. Votre palmarès s'affichera ici dès vos premiers achats.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {stats.topItems.map((item, idx) => {
                const itemKey = `${item.productId}__${item.variant}`;
                const isJustAdded = recentlyAddedId === itemKey;

                return (
                  <div 
                    key={itemKey}
                    className="p-3 sm:p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Badge */}
                      <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        idx === 0 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                          : idx === 1 
                            ? 'bg-slate-200 text-slate-800' 
                            : idx === 2 
                              ? 'bg-amber-50 text-amber-700' 
                              : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {item.productName}
                          </h4>
                          {item.category && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">{item.variant}</span>
                          <span>·</span>
                          <span className="font-semibold text-slate-900">
                            {item.isQuote ? 'Sur Devis' : `${item.price.toLocaleString('fr-FR')} FCFA`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Quick Reorder Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-black text-slate-900 block tabular-nums">
                          {item.totalQty} {item.totalQty > 1 ? 'unités / btes' : 'unité'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.orderCount} commande(s) · {item.totalSpent.toLocaleString('fr-FR')} F
                        </span>
                      </div>

                      {onAddToCartItem && (
                        <button
                          type="button"
                          onClick={() => handleQuickAddToCart(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-50 text-[#0d44e8] hover:bg-[#0d44e8] hover:text-white border border-blue-200'
                          }`}
                          title="Ajouter au panier pour réapprovisionnement direct"
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Ajouté !</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Réapprovisionner</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Latest Order Tracking */}
      {latestOrder && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d44e8] block">
                Dernière commande en cours
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-0.5">
                {latestOrder.reference} · {new Date(latestOrder.createdAt).toLocaleDateString('fr-FR')}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {onTrackDelivery && (
                <button
                  type="button"
                  onClick={() => onTrackDelivery(latestOrder)}
                  className="py-1.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Suivi & Contact Livreur</span>
                </button>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                latestOrder.status === 'Livrée'
                  ? 'bg-emerald-100 text-emerald-800'
                  : latestOrder.status === 'Annulée'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-blue-50 text-[#0d44e8]'
              }`}>
                {latestOrder.status}
              </span>
            </div>
          </div>

          {latestOrder.status !== 'Annulée' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {steps.map((st, idx) => {
                const currentIdx = getStatusStepIndex(latestOrder.status);
                const isPassed = currentIdx >= idx;
                const isCurrent = currentIdx === idx;
                return (
                  <div
                    key={st.label}
                    className={`p-2.5 rounded-xl border text-xs ${
                      isCurrent
                        ? 'bg-blue-50/70 border-blue-300 font-bold text-[#0d44e8]'
                        : isPassed
                          ? 'bg-slate-50 border-slate-200 text-slate-800'
                          : 'bg-white border-slate-100 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isPassed ? 'bg-[#0d44e8] text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span>{st.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 pl-5 block">{st.desc}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Commande annulée : {latestOrder.cancellationReason || 'Non spécifié'}</span>
            </div>
          )}
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Historique des commandes ({orders.length})
          </h3>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucune commande enregistrée. Vos achats apparaîtront ici.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs text-[#0d44e8]">
                      {order.reference}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {order.status}
                    </span>
                    {order.isPaid && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Payée
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')} · {order.items.length} article(s) · <strong className="text-slate-900">{order.estimatedTotal.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                  {onTrackDelivery && (
                    <button
                      type="button"
                      onClick={() => onTrackDelivery(order)}
                      className="py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0d44e8] font-bold text-xs flex items-center gap-1 cursor-pointer border border-blue-200"
                      title="Suivi de livraison en direct & contact coursier"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Suivi Livreur</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onViewOrderPdf(order)}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onReorder(order)}
                    className="py-1.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Recommander ces articles au panier"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recommander</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
