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
  Check,
  Users,
  Eye,
  Layers,
  User as UserIcon,
  Briefcase,
  Filter,
  Info
} from 'lucide-react';
import { Order, OrderStatus, User, CartItem, HealthcareStructure } from '../types';
import { normalizePhone } from '../api';
import { getStructureById, getStructureMembers, canAddAccountToStructure } from '../utils/structureStorage';

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

export type ExpensePeriod = 'today' | 'week' | 'month' | 'all';

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
  // Director verification
  const isDirector = currentUser?.jobTitle === 'directeur';
  const isApprovedDirector = isDirector && currentUser?.directorApprovalStatus === 'approved';
  const isPendingDirector = isDirector && currentUser?.directorApprovalStatus === 'pending';

  // Structure information
  const currentStructure = useMemo<HealthcareStructure | undefined>(() => {
    if (!currentUser?.structureId) return undefined;
    return getStructureById(currentUser.structureId);
  }, [currentUser]);

  const structureMembers = useMemo<User[]>(() => {
    if (!currentUser?.structureId) return [];
    return getStructureMembers(currentUser.structureId);
  }, [currentUser]);

  // View Scope: Personal (individual purchases) vs Structure (consolidated director view)
  const [scope, setScope] = useState<'personal' | 'structure'>(() => {
    return isApprovedDirector ? 'structure' : 'personal';
  });

  // Expense Period Filter: Jour / Semaine / Mois / Tout
  const [expensePeriod, setExpensePeriod] = useState<ExpensePeriod>('month');

  // Track recently added item in quick reorder
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // 1. Strictly isolated Personal Orders (ses propres achats)
  const personalOrders = useMemo(() => {
    if (!currentUser) return orders;
    const cleanUserPhone = normalizePhone(currentUser.phone);
    return orders.filter(o => {
      if (o.userId && o.userId === currentUser.id) return true;
      if (o.customer?.phone && normalizePhone(o.customer.phone) === cleanUserPhone) return true;
      return false;
    });
  }, [orders, currentUser]);

  // 2. Consolidated Structure Orders (all colleagues in the healthcare structure)
  const structureOrders = useMemo(() => {
    if (!currentUser) return orders;
    return orders.filter(o => {
      if (currentUser.structureId && o.structureId === currentUser.structureId) return true;
      if (currentUser.facilityName && o.customer?.facilityName?.trim().toLowerCase() === currentUser.facilityName.trim().toLowerCase()) return true;
      return false;
    });
  }, [orders, currentUser]);

  // Active orders based on scope (strictly personal if not an approved director)
  const activeOrders = useMemo(() => {
    if (!currentUser) return orders;
    if (!isApprovedDirector || scope === 'personal') {
      return personalOrders;
    }
    return structureOrders;
  }, [currentUser, isApprovedDirector, scope, personalOrders, structureOrders, orders]);

  // 3. Period-filtered orders for expenses analysis (jour, semaine, mois)
  const periodFilteredOrders = useMemo(() => {
    const valid = activeOrders.filter(o => o.status !== 'Annulée');
    if (expensePeriod === 'all') return valid;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return valid.filter(o => {
      const orderTime = new Date(o.createdAt).getTime();
      if (expensePeriod === 'today') {
        return orderTime >= startOfToday;
      }
      if (expensePeriod === 'week') {
        return orderTime >= sevenDaysAgo;
      }
      if (expensePeriod === 'month') {
        return orderTime >= thirtyDaysAgo;
      }
      return true;
    });
  }, [activeOrders, expensePeriod]);

  // Period expenses stats calculation
  const periodStats = useMemo(() => {
    const totalSpent = periodFilteredOrders.reduce((sum, o) => sum + o.estimatedTotal, 0);
    const count = periodFilteredOrders.length;
    const avgBasket = count > 0 ? Math.round(totalSpent / count) : 0;
    return { totalSpent, count, avgBasket };
  }, [periodFilteredOrders]);

  // General KPIs from active orders
  const nonCancelledOrders = activeOrders.filter(o => o.status !== 'Annulée');
  const totalSpent = nonCancelledOrders.reduce((sum, o) => sum + o.estimatedTotal, 0);
  const pendingOrders = activeOrders.filter(o => o.status === 'À confirmer' || o.status === 'Confirmée' || o.status === 'En préparation');
  const latestOrder = activeOrders.length > 0 ? activeOrders[0] : null;

  // 4. Products ordered the most (Top articles récurrents)
  const topItems = useMemo(() => {
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

    nonCancelledOrders.forEach(o => {
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

    return Array.from(itemsMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);
  }, [nonCancelledOrders]);

  // Structure breakdown by collaborator (for approved director in structure view)
  const collaboratorStats = useMemo(() => {
    if (!isApprovedDirector || structureMembers.length === 0) return [];
    
    return structureMembers.map(member => {
      const memberCleanPhone = normalizePhone(member.phone);
      const memberOrders = structureOrders.filter(o => {
        if (o.userId && o.userId === member.id) return true;
        if (o.customer?.phone && normalizePhone(o.customer.phone) === memberCleanPhone) return true;
        return false;
      });

      const validOrders = memberOrders.filter(o => o.status !== 'Annulée');
      const spent = validOrders.reduce((sum, o) => sum + o.estimatedTotal, 0);
      const lastOrder = memberOrders[0];

      return {
        member,
        ordersCount: memberOrders.length,
        totalSpent: spent,
        lastOrderDate: lastOrder ? lastOrder.createdAt : undefined
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [isApprovedDirector, structureMembers, structureOrders]);

  // Quick reorder handler
  const handleQuickAddToCart = (item: {
    productId: string;
    productName: string;
    variant: string;
    price: number;
    category?: string;
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
      {/* 1. Header Profil & Établissement */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#eef3ff] text-[#0d44e8] font-bold text-xl flex items-center justify-center shrink-0">
            {currentUser ? currentUser.facilityName.charAt(0).toUpperCase() : <Building2 className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {currentUser ? currentUser.facilityName : 'Espace Client & Commandes'}
              </h1>
              {currentUser?.facilityType && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {currentUser.facilityType}
                </span>
              )}
              {currentUser?.jobTitle && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentUser.jobTitle === 'directeur'
                    ? isApprovedDirector
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-amber-100 text-amber-800'
                    : 'bg-blue-50 text-[#0d44e8]'
                }`}>
                  {currentUser.jobTitle === 'directeur' ? 'Directeur' : currentUser.jobTitle === 'docteur' ? 'Docteur' : 'Chargé de commandes'}
                  {currentUser.jobTitle === 'directeur' && !isApprovedDirector && ' (En attente)'}
                </span>
              )}
            </div>

            <p className="text-xs text-[#6a6a6b] mt-0.5">
              {currentUser?.contactName ? `${currentUser.contactName} · ` : ''}
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

      {/* 2. Banner Notification si Directeur en attente de validation */}
      {isPendingDirector && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-amber-950">Accès Direction en attente de vérification</div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Vous visualisez actuellement vos propres achats personnels. Dès validation par l'administrateur Gloryday, le bouton de vue consolidée s'activera pour superviser l'ensemble des commandes de votre structure ({currentUser.facilityName}).
            </p>
          </div>
        </div>
      )}

      {/* 3. Scope Selector pour Directeur Validé (Vue Personnelle vs Vue Consolidée Établissement) */}
      {isApprovedDirector && (
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-purple-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50/40 via-white to-blue-50/30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0" />
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>Espace Direction Validé</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-purple-100 text-purple-800">
                  {currentStructure?.name || currentUser?.facilityName}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Capacité structure : {structureMembers.length} / {currentStructure?.maxAccounts || 3} comptes rattachés
              </div>
            </div>
          </div>

          {/* Segmented Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setScope('personal')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scope === 'personal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Mes Achats ({personalOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setScope('structure')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scope === 'structure'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-purple-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Toute la Structure ({structureOrders.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Primary KPI Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">
            {scope === 'structure' && isApprovedDirector ? 'Commandes Structure' : 'Mes Commandes'}
          </span>
          <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
            {activeOrders.length}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">En cours</span>
          <span className="text-lg sm:text-xl font-black text-[#0d44e8] tabular-nums">
            {pendingOrders.length}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] text-[#6a6a6b] uppercase font-bold block mb-1">
            {scope === 'structure' && isApprovedDirector ? 'Achats Consolidés' : 'Mes Dépenses'}
          </span>
          <span className="text-base sm:text-xl font-black text-slate-900 tabular-nums">
            {totalSpent.toLocaleString('fr-FR')} <span className="text-[11px] font-bold text-slate-500">FCFA</span>
          </span>
        </div>
      </div>

      {/* 5. SECTION: FILTRE DE PÉRIODE POUR LES DÉPENSES (JOUR / SEMAINE / MOIS) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0d44e8]" />
              <span>Suivi des Dépenses & Filtre de Période</span>
            </h2>
            <p className="text-[11px] text-[#6a6a6b]">
              Analysez vos flux financiers par jour, par semaine ou par mois
            </p>
          </div>

          {/* Period Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setExpensePeriod('today')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                expensePeriod === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setExpensePeriod('week')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                expensePeriod === 'week' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Semaine (7j)
            </button>
            <button
              type="button"
              onClick={() => setExpensePeriod('month')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                expensePeriod === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Ce mois-ci
            </button>
            <button
              type="button"
              onClick={() => setExpensePeriod('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                expensePeriod === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tout
            </button>
          </div>
        </div>

        {/* Period Expenses Metric Display */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Dépenses {expensePeriod === 'today' ? 'du jour' : expensePeriod === 'week' ? 'cette semaine' : expensePeriod === 'month' ? 'du mois' : 'globales'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {periodStats.totalSpent.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-[#0d44e8]">FCFA</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Montant net hors transport
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Commandes sur la période
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {periodStats.count}
              </span>
              <span className="text-xs font-medium text-slate-500">achat(s)</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {scope === 'structure' ? 'Tous collaborateurs confondus' : 'Vos achats individuels'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Panier moyen estimé
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {periodStats.avgBasket.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-slate-500">FCFA</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Par commande passée
            </span>
          </div>
        </div>
      </div>

      {/* 6. SECTION DIRECTEUR : COLLABORATEURS DE LA STRUCTURE & DÉPENSES PAR MEMBRE */}
      {isApprovedDirector && scope === 'structure' && (
        <div className="bg-white rounded-2xl border border-purple-200/90 shadow-2xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-700" />
                <span>Membres & Dépenses par Collaborateur ({structureMembers.length}/{currentStructure?.maxAccounts || 3})</span>
              </h3>
              <p className="text-[11px] text-[#6a6a6b]">
                Ventilation des commandes passées par vos chargés de commandes et médecins
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
              Plafond : {currentStructure?.maxAccounts || 3} comptes max
            </span>
          </div>

          {collaboratorStats.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              Aucun autre collaborateur rattaché à cette structure pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {collaboratorStats.map(({ member, ordersCount, totalSpent, lastOrderDate }) => (
                <div key={member.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-purple-50/20 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                      {member.contactName ? member.contactName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{member.contactName || member.facilityName}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          member.jobTitle === 'directeur' 
                            ? 'bg-purple-100 text-purple-800' 
                            : member.jobTitle === 'docteur' 
                              ? 'bg-blue-100 text-[#0d44e8]' 
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {member.jobTitle === 'directeur' ? 'Directeur' : member.jobTitle === 'docteur' ? 'Docteur' : 'Chargé commandes'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {member.phone} {lastOrderDate ? `· Dernière commande le ${new Date(lastOrderDate).toLocaleDateString('fr-FR')}` : '· Aucune commande'}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono">
                    <span className="font-bold text-slate-900 block tabular-nums">
                      {totalSpent.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {ordersCount} commande(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. SECTION : PRODUITS LES PLUS COMMANDÉS (TOP ARTICLES) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#0d44e8]" />
              <span>
                {scope === 'structure' && isApprovedDirector
                  ? 'Produits les plus commandés par la structure'
                  : 'Produits que vous commandez le plus'}
              </span>
            </h3>
            <p className="text-[11px] text-[#6a6a6b]">
              Réapprovisionnez vos références clés en un seul clic sans parcourir le catalogue
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Top {topItems.length}
          </span>
        </div>

        {topItems.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            Aucun article commandé pour le moment. Votre palmarès s'affichera ici dès vos premiers achats.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {topItems.map((item, idx) => {
              const itemKey = `${item.productId}__${item.variant}`;
              const isJustAdded = recentlyAddedId === itemKey;

              return (
                <div 
                  key={itemKey}
                  className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
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

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-black text-slate-900 block tabular-nums">
                        {item.totalQty} {item.totalQty > 1 ? 'unités / btes' : 'unité'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
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
                            <span>Commander</span>
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

      {/* 8. DERNIÈRE COMMANDE EN COURS (TRACKING LIVRAISON) */}
      {latestOrder && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d44e8] block">
                Dernière commande passée
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-0.5">
                {latestOrder.reference} · {new Date(latestOrder.createdAt).toLocaleDateString('fr-FR')}
                {latestOrder.authorName && (
                  <span className="text-xs text-slate-500 font-normal ml-2">
                    (Par {latestOrder.authorName})
                  </span>
                )}
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

      {/* 9. LISTE HISTORIQUE DES COMMANDES (AVEC IDENTIFICATION DU COLLABORATEUR EN VUE STRUCTURE) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>
              {scope === 'structure' && isApprovedDirector
                ? `Historique des achats de la structure (${activeOrders.length})`
                : `Vos commandes personnelles (${activeOrders.length})`}
            </span>
          </h3>
          {scope === 'structure' && isApprovedDirector && (
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
              Vue Consolidée Direction
            </span>
          )}
        </div>

        {activeOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucune commande enregistrée pour le moment. Vos achats apparaîtront ici.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeOrders.map((order) => (
              <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    {scope === 'structure' && (order.authorName || order.customer?.contactName) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-100">
                        Acheteur : {order.authorName || order.customer.contactName}
                        {order.authorJobTitle && ` (${order.authorJobTitle === 'directeur' ? 'Dir.' : order.authorJobTitle === 'docteur' ? 'Dr.' : 'Chargé'})`}
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
