import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Package, 
  TrendingUp, 
  Clock, 
  RotateCcw, 
  FileText, 
  MessageCircle, 
  Truck, 
  Printer,
  Smartphone, 
  ShieldCheck, 
  Check, 
  Search,
  MapPin,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  CalendarDays,
  CalendarClock
} from 'lucide-react';
import { Order, OrderStatus, User, MobilePaymentDetails } from '../types';
import { generateInternalPurchaseOrderPdf } from '../utils/pdfGenerator';
import { 
  computeDeliveryTimeWindow, 
  detectNeighborhoodFromAddress, 
  getNeighborhoodById 
} from '../data/librevilleZones';
import { api } from '../api';
import { MobilePaymentModal } from './MobilePaymentModal';

interface ClientDashboardProps {
  orders: Order[];
  currentUser: User | null;
  onReorder: (order: Order) => void;
  onOpenAuth: () => void;
  onRefreshOrders: () => void;
  onViewOrderPdf: (order: Order) => void;
  onTrackDelivery?: (order: Order) => void;
}

interface ResolvedOrderSchedule {
  order: Order;
  dateKey: string; // YYYY-MM-DD
  dateObj: Date;
  timeSlot: string;
  zoneLabel: string;
  isExpress: boolean;
  isDelivered: boolean;
  isCancelled: boolean;
  isOngoing: boolean;
  isCustomScheduled: boolean;
}

const WEEKDAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const DELIVERY_SLOTS = [
  'Matin · 08h30 - 12h00 (1ère tournée)',
  'Après-midi · 13h30 - 17h30 (2ème tournée)',
  'Express Prioritaire Bloc (30 - 60 min)',
  'Retrait Dépôt Central Oloumi (08h00 - 17h30)'
];

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function resolveOrderDeliverySchedule(order: Order): ResolvedOrderSchedule {
  const createdDate = new Date(order.createdAt);
  const safeCreated = Number.isNaN(createdDate.getTime()) ? new Date() : createdDate;

  const neighborhood = order.customer.neighborhoodId
    ? getNeighborhoodById(order.customer.neighborhoodId)
    : detectNeighborhoodFromAddress(order.customer.deliveryAddress);

  const windowInfo = computeDeliveryTimeWindow(neighborhood?.id, safeCreated);

  let targetDate = new Date(safeCreated);
  let isCustomScheduled = false;

  if (order.expectedDeliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(order.expectedDeliveryDate)) {
    targetDate = parseDateKey(order.expectedDeliveryDate);
    isCustomScheduled = true;
  } else if (order.status === 'Livrée' && order.deliveryProof?.timestamp) {
    const proofDate = new Date(order.deliveryProof.timestamp);
    if (!Number.isNaN(proofDate.getTime())) {
      targetDate = proofDate;
    }
  } else if (windowInfo.isTomorrow) {
    targetDate = new Date(safeCreated);
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const dateKey = toLocalDateKey(targetDate);

  let timeSlot = order.expectedDeliverySlot || '';
  if (!timeSlot) {
    if (order.courier?.estimatedTime) {
      timeSlot = order.courier.estimatedTime;
    } else if (order.customer.deliveryMode === 'retrait') {
      timeSlot = 'Retrait Dépôt Oloumi (20 - 30 min)';
    } else if (windowInfo.isTomorrow) {
      timeSlot = 'Matin dès 08h30 (1ère tournée)';
    } else {
      timeSlot = `${windowInfo.shortWindow} (${neighborhood?.estimatedMinutes || '45 - 60 min'})`;
    }
  }

  const zoneLabel = order.customer.deliveryMode === 'retrait'
    ? 'Retrait au Dépôt Central Oloumi'
    : neighborhood
      ? `${neighborhood.name} · ${neighborhood.zone}`
      : order.deliveryZone || order.customer.deliveryAddress || 'Grand Libreville';

  return {
    order,
    dateKey,
    dateObj: targetDate,
    timeSlot,
    zoneLabel,
    isExpress: Boolean(neighborhood?.isExpressEligible && order.customer.deliveryMode !== 'retrait'),
    isDelivered: order.status === 'Livrée',
    isCancelled: order.status === 'Annulée',
    isOngoing: order.status !== 'Livrée' && order.status !== 'Annulée',
    isCustomScheduled
  };
}

const GoogleIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  orders,
  currentUser,
  onReorder,
  onOpenAuth,
  onRefreshOrders,
  onViewOrderPdf,
  onTrackDelivery
}) => {
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'delivered' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // State for rescheduling an order's expected delivery date
  const [editingScheduleOrderId, setEditingScheduleOrderId] = useState<string | null>(null);
  const [draftDeliveryDate, setDraftDeliveryDate] = useState<string>(todayKey);
  const [draftDeliverySlot, setDraftDeliverySlot] = useState<string>(DELIVERY_SLOTS[0]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const nonCancelledOrders = orders.filter(o => o.status !== 'Annulée');
  const totalOrdered = nonCancelledOrders.reduce((sum, o) => sum + o.estimatedTotal, 0);
  const pendingOrders = orders.filter(o => o.status === 'À confirmer' || o.status === 'Confirmée' || o.status === 'En préparation');
  const deliveredOrders = orders.filter(o => o.status === 'Livrée');
  const unpaidOrders = orders.filter(o => !o.isPaid && o.status !== 'Annulée');

  // Resolve delivery schedules for all orders
  const resolvedSchedules = useMemo(
    () => orders.map(resolveOrderDeliverySchedule),
    [orders]
  );

  // Filtered schedules matching current statusFilter & searchQuery
  const filteredSchedules = useMemo(() => {
    return resolvedSchedules.filter(({ order }) => {
      if (statusFilter === 'in_progress' && (order.status === 'Livrée' || order.status === 'Annulée')) return false;
      if (statusFilter === 'delivered' && order.status !== 'Livrée') return false;
      if (statusFilter === 'unpaid' && (order.isPaid || order.status === 'Annulée')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = order.reference.toLowerCase().includes(q);
        const matchItems = order.items.some(i => i.productName.toLowerCase().includes(q));
        const matchAddress = (order.customer.deliveryAddress || '').toLowerCase().includes(q);
        if (!matchRef && !matchItems && !matchAddress) return false;
      }
      return true;
    });
  }, [resolvedSchedules, statusFilter, searchQuery]);

  const filteredOrders = useMemo(
    () => filteredSchedules.map(s => s.order),
    [filteredSchedules]
  );

  // Map dateKey -> ResolvedOrderSchedule[]
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ResolvedOrderSchedule[]>();
    for (const item of filteredSchedules) {
      const list = map.get(item.dateKey) || [];
      list.push(item);
      map.set(item.dateKey, list);
    }
    return map;
  }, [filteredSchedules]);

  // Automatically focus the calendar on the most relevant order date when orders load if today has none
  useEffect(() => {
    if (resolvedSchedules.length === 0) return;
    const hasToday = resolvedSchedules.some(s => s.dateKey === todayKey);
    if (!hasToday) {
      const ongoing = resolvedSchedules.find(s => s.isOngoing);
      const target = ongoing || resolvedSchedules[0];
      if (target) {
        setSelectedDateKey(target.dateKey);
        setCalendarMonth(new Date(target.dateObj.getFullYear(), target.dateObj.getMonth(), 1));
      }
    }
  }, [orders.length]);

  // Compute calendar grid days (42 cells = 6 weeks starting Monday)
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(year, month, 1 - startWeekday);

    const cells: Array<{
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      schedules: ResolvedOrderSchedule[];
    }> = [];

    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(gridStartDate.getFullYear(), gridStartDate.getMonth(), gridStartDate.getDate() + i);
      const key = toLocalDateKey(cellDate);
      cells.push({
        date: cellDate,
        dateKey: key,
        dayNumber: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: key === todayKey,
        schedules: schedulesByDate.get(key) || []
      });
    }
    return cells;
  }, [calendarMonth, schedulesByDate, todayKey]);

  const selectedDaySchedules = useMemo(
    () => schedulesByDate.get(selectedDateKey) || [],
    [schedulesByDate, selectedDateKey]
  );

  // Upcoming / ongoing schedules sorted chronologically
  const upcomingOngoingSchedules = useMemo(() => {
    return filteredSchedules
      .filter(s => s.isOngoing)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [filteredSchedules]);

  // Find active ongoing order for direct delivery spotlight
  const activeDeliveryOrder = orders.find(
    o => o.status === 'Confirmée' || o.status === 'En préparation'
  ) || null;

  const deliverySteps = [
    { key: 'preparation', label: '1. Colisage & Validation', desc: 'En préparation au dépôt' },
    { key: 'picked_up', label: '2. Pris en charge', desc: 'Coursier en départ' },
    { key: 'in_transit', label: '3. En acheminement', desc: 'Sur axe Libreville' },
    { key: 'delivered', label: '4. Livré & Émargé', desc: 'Mise à disposition' }
  ];

  const getDeliveryStageIndex = (stage?: string, status?: OrderStatus) => {
    if (stage === 'delivered' || status === 'Livrée') return 3;
    if (stage === 'in_transit') return 2;
    if (stage === 'picked_up') return 1;
    return 0;
  };

  const handleSaveMobilePayment = async (details: MobilePaymentDetails) => {
    if (!selectedPaymentOrder) return;
    await api.updateOrderMobilePayment(selectedPaymentOrder.id, details);
    onRefreshOrders();
  };

  const handleStartEditSchedule = (item: ResolvedOrderSchedule) => {
    setEditingScheduleOrderId(item.order.id);
    setDraftDeliveryDate(item.dateKey);
    setDraftDeliverySlot(item.order.expectedDeliverySlot || DELIVERY_SLOTS[0]);
    setScheduleFeedback(null);
  };

  const handleSaveExpectedDelivery = async (orderId: string) => {
    if (!draftDeliveryDate) return;
    setSavingSchedule(true);
    setScheduleFeedback(null);
    try {
      await api.updateOrderExpectedDelivery(orderId, draftDeliveryDate, draftDeliverySlot);
      setEditingScheduleOrderId(null);
      setSelectedDateKey(draftDeliveryDate);
      const parsed = parseDateKey(draftDeliveryDate);
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      setScheduleFeedback({
        type: 'success',
        message: 'Date et créneau de livraison prévus mis à jour avec succès.'
      });
      onRefreshOrders();
    } catch (error) {
      setScheduleFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de mettre à jour la date de livraison.'
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleJumpToDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    const parsed = parseDateKey(dateKey);
    setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  };

  const selectedDateFormatted = useMemo(() => {
    const parsed = parseDateKey(selectedDateKey);
    return parsed.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [selectedDateKey]);

  const monthDeliveriesStats = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const inMonth = filteredSchedules.filter(
      s => s.dateObj.getFullYear() === y && s.dateObj.getMonth() === m && !s.isCancelled
    );
    return {
      total: inMonth.length,
      ongoing: inMonth.filter(s => s.isOngoing).length,
      delivered: inMonth.filter(s => s.isDelivered).length
    };
  }, [calendarMonth, filteredSchedules]);

  return (
    <div className="client-dashboard-enter max-w-5xl mx-auto pb-24 space-y-6 px-2 sm:px-0">
      {/* 1. MODERN HEADER & PROFILE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="dashboard-orb-float absolute top-0 right-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-inner pulse-ring-blue">
              {currentUser?.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt={currentUser.facilityName} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-2xl object-cover" 
                />
              ) : currentUser ? (
                currentUser.facilityName.charAt(0).toUpperCase()
              ) : (
                <Building2 className="w-8 h-8 text-blue-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {currentUser ? currentUser.facilityName : 'Espace Client & Pharmacie Hospitalière'}
                </h1>
                {currentUser?.facilityType && (
                  <span className="text-xs text-blue-300 font-medium">
                    · {currentUser.facilityType}
                  </span>
                )}
                {currentUser?.authProvider === 'google' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    · <GoogleIcon className="w-3.5 h-3.5" />
                    <span>Google Connecté</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                {currentUser?.phone && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    WhatsApp : <strong className="tabular-nums">{currentUser.phone}</strong>
                  </span>
                )}
                {currentUser?.deliveryAddress && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {currentUser.deliveryAddress}
                  </span>
                )}
                {currentUser?.email && (
                  <span className="text-slate-400">
                    ({currentUser.email})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="btn-shine px-4 py-2 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Building2 className="w-4 h-4" />
                <span>Se connecter</span>
              </button>
            ) : (
              <a
                href="https://wa.me/24177003004"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-shine px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Support Pharmacie 24/7</span>
              </a>
            )}
            <button
              type="button"
              onClick={onRefreshOrders}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* 2. MODERN HEALTHCARE KPI METRICS */}
      <div className="client-dashboard-kpis grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Total Commandes</span>
            <div className="kpi-icon-badge w-8 h-8 rounded-xl bg-blue-50 text-[#0d44e8] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{orders.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{deliveredOrders.length} livrées avec succès</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-[#0d44e8]">Livraisons prévues</span>
            <div className="kpi-icon-badge w-8 h-8 rounded-xl bg-blue-100 text-[#0d44e8] flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0d44e8] tabular-nums">{pendingOrders.length}</div>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className="text-[11px] text-blue-700 hover:text-blue-900 mt-1 flex items-center gap-1 font-semibold cursor-pointer underline-offset-2 hover:underline"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Voir sur le calendrier</span>
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Montant commandé</span>
            <div className="kpi-icon-badge w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
            {totalOrdered.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">FCFA</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total hors commandes annulées</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold text-slate-600">Paiements en attente</span>
            <div className="kpi-icon-badge w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-800 tabular-nums">{unpaidOrders.length}</div>
          <div className="text-[11px] text-amber-700 mt-1">
            {unpaidOrders.length === 0 ? 'Toutes vos commandes sont réglées' : 'Airtel Money, Moov ou Espèces'}
          </div>
        </div>
      </div>

      {/* 3. SPOTLIGHT : DIRECT LIVE DELIVERY TRACKING (MODERN TRACKER) */}
      {activeDeliveryOrder && activeDeliveryOrder.status !== 'Annulée' && (
        <div className="dashboard-card-interactive bg-white rounded-3xl border border-blue-200 shadow-md p-5 sm:p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-[#0d44e8]">
                  Suivi de livraison en direct
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Réf : <strong className="text-slate-900 font-mono tabular-nums">{activeDeliveryOrder.reference}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-slate-700">{activeDeliveryOrder.status}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                Livraison à {activeDeliveryOrder.customer.facilityName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {activeDeliveryOrder.customer.deliveryAddress} · {activeDeliveryOrder.items.length} produit(s) · {activeDeliveryOrder.estimatedTotal.toLocaleString('fr-FR')} FCFA
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onTrackDelivery && (
                <button
                  type="button"
                  onClick={() => onTrackDelivery(activeDeliveryOrder)}
                  className="btn-shine py-2 px-3.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Truck className="w-4 h-4" />
                  <span>Détails du suivi</span>
                </button>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {deliverySteps.map((step, idx) => {
              const currentStepIdx = getDeliveryStageIndex(activeDeliveryOrder.deliveryStage, activeDeliveryOrder.status);
              const isDone = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.key} className="relative">
                  <div className={`p-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-50/80 border-[#0d44e8] shadow-xs'
                      : isDone
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50/70 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold tabular-nums ${
                        isCurrent
                          ? 'bg-[#0d44e8] text-white shadow-xs'
                          : isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-[#0d44e8]">En cours</span>
                      )}
                    </div>
                    <div className={`text-xs font-bold ${isCurrent ? 'text-[#0d44e8]' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.label}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Courier Card & Direct Contact (Only if assigned) */}
          {activeDeliveryOrder.courier && (
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                  <Truck className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Coursier : {activeDeliveryOrder.courier.name}</span>
                    <span className="text-[11px] font-mono text-slate-600">
                      · {activeDeliveryOrder.courier.matricule}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {activeDeliveryOrder.courier.vehicle} · {activeDeliveryOrder.courier.currentZone || 'Acheminement express'}
                  </div>
                </div>
              </div>

              <a
                href={`https://wa.me/${(activeDeliveryOrder.courier.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${activeDeliveryOrder.courier.name}, je vous contacte concernant la commande ${activeDeliveryOrder.reference} pour ${activeDeliveryOrder.customer.facilityName}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors self-start sm:self-center whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span>Joindre le coursier (+241)</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* 4. ORDERS & DELIVERY CALENDAR CONTAINER */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Top bar with View Switcher (Calendrier / Liste) & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              {viewMode === 'calendar' ? (
                <>
                  <CalendarDays className="w-5 h-5 text-[#0d44e8]" />
                  <span>Calendrier des livraisons prévues</span>
                </>
              ) : (
                <>
                  <Package className="w-5 h-5 text-[#0d44e8]" />
                  <span>Historique des commandes ({filteredOrders.length})</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {viewMode === 'calendar'
                ? 'Visualisez les dates et créneaux de livraison prévus pour vos commandes et ajustez vos réceptions.'
                : 'Consultez vos commandes passées et téléchargez les bons de commande PDF.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Segmented View Toggle: Calendrier vs Liste */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'calendar'
                    ? 'bg-white text-[#0d44e8] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Vue Calendrier</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === 'list'
                    ? 'bg-white text-[#0d44e8] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Vue Liste ({filteredOrders.length})</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher réf, produit, zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#0d44e8] w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Filter tabs bar */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Toutes ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 tabular-nums ${
              statusFilter === 'in_progress' ? 'bg-[#0d44e8] text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Livraisons prévues ({pendingOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 tabular-nums ${
              statusFilter === 'delivered' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Livrées ({deliveredOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 tabular-nums ${
              statusFilter === 'unpaid' ? 'bg-amber-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>À régler ({unpaidOrders.length})</span>
          </button>
        </div>

        {/* Feedback banner when delivery schedule is updated */}
        {scheduleFeedback && (
          <div className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
            scheduleFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span>{scheduleFeedback.message}</span>
            <button
              type="button"
              onClick={() => setScheduleFeedback(null)}
              className="text-xs font-bold underline ml-3 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* VIEW MODE 1: INTERACTIVE CALENDAR VIEW */}
        {viewMode === 'calendar' ? (
          <div key="view-calendar" className="dashboard-tab-enter grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* Left 7 columns: Monthly Calendar Grid */}
            <div className="lg:col-span-7 p-4 sm:p-5 space-y-4">
              {/* Month Navigation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 capitalize">
                    {calendarMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    <span>{monthDeliveriesStats.total} commande(s) ce mois</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#0d44e8] font-semibold">{monthDeliveriesStats.ongoing} prévue(s)</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-semibold">{monthDeliveriesStats.delivered} livrée(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                    title="Mois précédent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                      setSelectedDateKey(todayKey);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Aujourd&apos;hui
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                    title="Mois suivant"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-[11px] text-slate-600 flex-wrap pt-1">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#0d44e8]" />
                  <span>Livraison prévue / en cours</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Commande livrée</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Créneau personnalisé</span>
                </span>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 pb-1 border-b border-slate-100">
                {WEEKDAYS_FR.map(day => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* 42-Day Calendar Cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarDays.map(cell => {
                  const isSelected = cell.dateKey === selectedDateKey;
                  const activeCount = cell.schedules.filter(s => s.isOngoing).length;
                  const deliveredCount = cell.schedules.filter(s => s.isDelivered).length;
                  const hasOrders = cell.schedules.length > 0;

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(cell.dateKey)}
                      className={`min-h-[72px] sm:min-h-[84px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0d44e8] bg-blue-50/50 ring-2 ring-[#0d44e8]/20'
                          : cell.isToday
                            ? 'border-blue-300 bg-blue-50/20 hover:border-blue-400'
                            : hasOrders
                              ? 'border-slate-200 bg-white hover:border-slate-300'
                              : cell.isCurrentMonth
                                ? 'border-slate-100 bg-white hover:bg-slate-50/70'
                                : 'border-transparent bg-slate-50/40 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold tabular-nums w-6 h-6 rounded-lg flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-[#0d44e8] text-white'
                            : isSelected
                              ? 'text-[#0d44e8] font-black'
                              : cell.isCurrentMonth
                                ? 'text-slate-800'
                                : 'text-slate-400'
                        }`}>
                          {cell.dayNumber}
                        </span>

                        {hasOrders && (
                          <span className="text-[10px] font-bold tabular-nums text-slate-500">
                            {cell.schedules.length} cmd
                          </span>
                        )}
                      </div>

                      {/* Order items inside the day cell */}
                      <div className="space-y-1 mt-1 w-full overflow-hidden">
                        {cell.schedules.slice(0, 2).map(item => (
                          <div
                            key={item.order.id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center gap-1 ${
                              item.isDelivered
                                ? 'bg-emerald-100/90 text-emerald-900'
                                : item.isCancelled
                                  ? 'bg-slate-100 text-slate-500 line-through'
                                  : 'bg-blue-100 text-[#0d44e8]'
                            }`}
                            title={`${item.order.reference} · ${item.timeSlot} (${item.order.status})`}
                          >
                            {item.isDelivered ? (
                              <Check className="w-2.5 h-2.5 shrink-0 text-emerald-700" />
                            ) : (
                              <Truck className="w-2.5 h-2.5 shrink-0 text-[#0d44e8]" />
                            )}
                            <span className="truncate font-mono">{item.order.reference.replace('GP-', '')}</span>
                          </div>
                        ))}
                        {cell.schedules.length > 2 && (
                          <div className="text-[10px] font-semibold text-slate-500 pl-1 tabular-nums">
                            +{cell.schedules.length - 2} autre(s)
                          </div>
                        )}
                      </div>

                      {/* Mobile compact summary if needed */}
                      {!hasOrders && cell.isToday && (
                        <span className="text-[9px] font-semibold text-[#0d44e8] truncate">
                          Aujourd&apos;hui
                        </span>
                      )}
                      {(activeCount > 0 || deliveredCount > 0) && cell.schedules.length === 0 && null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 5 columns: Selected Date Deliveries & Planning Panel */}
            <div key={selectedDateKey} className="dashboard-tab-enter lg:col-span-5 p-4 sm:p-5 bg-slate-50/40 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="border-b border-slate-200/80 pb-3">
                  <div className="text-[11px] font-bold text-[#0d44e8] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Programme de livraison du jour</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 capitalize mt-0.5">
                    {selectedDateFormatted}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {selectedDaySchedules.length === 0
                      ? 'Aucune livraison programmée à cette date.'
                      : `${selectedDaySchedules.length} commande(s) prévue(s) à cette date.`}
                  </p>
                </div>

                {/* Selected Date Orders List */}
                {selectedDaySchedules.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2">
                    <CalendarClock className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      Aucune livraison prévue pour le {parseDateKey(selectedDateKey).toLocaleDateString('fr-FR')}.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Sélectionnez une date marquée sur le calendrier ou cliquez sur l&apos;une de vos prochaines livraisons ci-dessous.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDaySchedules.map(item => {
                      const { order } = item;
                      const isEditing = editingScheduleOrderId === order.id;

                      return (
                        <div
                          key={order.id}
                          className="dashboard-card-interactive p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-xs text-[#0d44e8]">
                                  {order.reference}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span className={`text-xs font-bold ${
                                  order.status === 'Livrée'
                                    ? 'text-emerald-700'
                                    : order.status === 'Annulée'
                                      ? 'text-rose-700'
                                      : 'text-[#0d44e8]'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 mt-1 tabular-nums">
                                {order.estimatedTotal.toLocaleString('fr-FR')} FCFA · {order.items.length} article(s)
                              </div>
                            </div>

                            {item.isOngoing && !isEditing && (
                              <button
                                type="button"
                                onClick={() => handleStartEditSchedule(item)}
                                className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#0d44e8] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                              >
                                <CalendarClock className="w-3 h-3" />
                                <span>Modifier date</span>
                              </button>
                            )}
                          </div>

                          {/* Expected Time Window & Zone */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-[#0d44e8] shrink-0" />
                              <span>Créneau prévu : {item.timeSlot}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{item.zoneLabel}</span>
                            </div>
                            {order.courier && (
                              <div className="flex items-center gap-1.5 text-purple-800 font-medium pt-0.5">
                                <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span>Coursier : {order.courier.name} ({order.courier.matricule})</span>
                              </div>
                            )}
                          </div>

                          {/* Inline Reschedule Form */}
                          {isEditing && (
                            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                              <div className="text-xs font-bold text-slate-900">
                                Choisir une date et un créneau de livraison souhaités
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Date souhaitée
                                  </label>
                                  <input
                                    type="date"
                                    value={draftDeliveryDate}
                                    min={todayKey}
                                    onChange={(e) => setDraftDeliveryDate(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium tabular-nums"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Créneau horaire
                                  </label>
                                  <select
                                    value={draftDeliverySlot}
                                    onChange={(e) => setDraftDeliverySlot(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                                  >
                                    {DELIVERY_SLOTS.map(slot => (
                                      <option key={slot} value={slot}>{slot}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingScheduleOrderId(null)}
                                  className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="button"
                                  disabled={savingSchedule}
                                  onClick={() => void handleSaveExpectedDelivery(order.id)}
                                  className="px-3 py-1 rounded-lg bg-[#0d44e8] hover:bg-[#0b3ac7] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                  {savingSchedule ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Items list preview */}
                          <div className="text-[11px] text-slate-500 line-clamp-2">
                            {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                            {onTrackDelivery && (
                              <button
                                type="button"
                                onClick={() => onTrackDelivery(order)}
                                className="py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0d44e8] font-bold text-xs flex items-center gap-1 cursor-pointer border border-blue-200 whitespace-nowrap shrink-0"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Suivi Livreur</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewOrderPdf(order)}
                              className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span>Bon PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onReorder(order)}
                              className="py-1.5 px-2.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ml-auto"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Recommander</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming Planned Deliveries Quick-Jump List */}
              <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Prochaines livraisons prévues ({upcomingOngoingSchedules.length})
                  </span>
                </div>

                {upcomingOngoingSchedules.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Aucune commande en attente de livraison pour le moment.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {upcomingOngoingSchedules.slice(0, 6).map(item => (
                      <button
                        key={item.order.id}
                        type="button"
                        onClick={() => handleJumpToDate(item.dateKey)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          item.dateKey === selectedDateKey
                            ? 'bg-blue-50/80 border-[#0d44e8]'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-mono font-bold text-[#0d44e8]">{item.order.reference}</span>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="text-slate-700 font-semibold truncate">{item.timeSlot}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.zoneLabel}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 tabular-nums whitespace-nowrap shrink-0">
                          {item.dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* VIEW MODE 2: CLASSIC ORDERS LIST */
          filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Package className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">Aucune commande ne correspond à ce filtre.</p>
              <p className="text-xs text-slate-400">Consultez notre catalogue pour initier un approvisionnement médical.</p>
            </div>
          ) : (
            <div key="view-list" className="dashboard-tab-enter divide-y divide-slate-100">
              {filteredSchedules.map((scheduleItem) => {
                const { order } = scheduleItem;
                const mp = order.mobilePayment || order.customer.mobilePayment;
                const isMobilePayment = order.customer.paymentMethod === 'airtel_money' || 
                                       order.customer.paymentMethod === 'moov_money' || 
                                       !!mp;
                const paymentVerified = Boolean(order.isPaid || mp?.status === 'verified');

                return (
                  <div key={order.id} className="dashboard-row-interactive p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-mono font-black text-[#0d44e8]">
                          {order.reference}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className={`font-bold ${
                          order.status === 'Livrée'
                            ? 'text-emerald-700'
                            : order.status === 'Annulée'
                              ? 'text-rose-700'
                              : 'text-[#0d44e8]'
                        }`}>
                          {order.status}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        {order.isPaid ? (
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Payée</span>
                          </span>
                        ) : (
                          <span className="font-medium text-amber-800">
                            En attente de paiement
                          </span>
                        )}

                        {isMobilePayment && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">·</span>
                            <span className="text-slate-600 flex items-center gap-1">
                              <Smartphone className="w-3 h-3" />
                              <span>{(mp?.provider || order.customer.paymentMethod) === 'airtel_money' ? 'Airtel Money' : 'Moov Money'}</span>
                              {mp?.transactionReference && (
                                <span className="font-mono text-slate-700">
                                  ({mp.transactionReference})
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap tabular-nums">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          Commandée le {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode('calendar');
                            handleJumpToDate(scheduleItem.dateKey);
                          }}
                          className="flex items-center gap-1 text-[#0d44e8] hover:underline font-semibold cursor-pointer"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                          <span>
                            Livraison prévue : {scheduleItem.dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} ({scheduleItem.timeSlot})
                          </span>
                        </button>
                        <span aria-hidden="true">·</span>
                        <span>{order.items.length} article(s)</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-900 font-bold text-sm">
                          {order.estimatedTotal.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex items-center gap-1.5 self-end lg:self-center flex-wrap">
                      {isMobilePayment && (
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentOrder(order)}
                          className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer border shadow-2xs transition-colors whitespace-nowrap shrink-0 ${
                            paymentVerified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          }`}
                          title={paymentVerified ? 'Paiement vérifié par Gloryday Pharma.' : mp?.transactionReference ? 'Référence transmise, en attente de vérification.' : 'Transmettre une référence de paiement pour vérification.'}
                        >
                          <ShieldCheck className={`w-3.5 h-3.5 ${paymentVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
                          <span>{paymentVerified ? 'Paiement vérifié' : mp?.transactionReference ? 'Réf. en attente' : 'Soumettre une référence'}</span>
                        </button>
                      )}

                      {onTrackDelivery && (
                        <button
                          type="button"
                          onClick={() => onTrackDelivery(order)}
                          className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0d44e8] font-bold text-xs flex items-center gap-1 cursor-pointer border border-blue-200 whitespace-nowrap shrink-0"
                          title="Suivi de livraison en direct & contact coursier"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Suivi Livreur</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onViewOrderPdf(order)}
                        className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { blob } = await generateInternalPurchaseOrderPdf(order, {
                              department: 'Bloc Chirurgical / Pharmacie',
                              requesterTitle: order.customer.contactName || 'Major de Bloc'
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Bon_Visa_Interne_${order.reference}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          } catch (e) {
                            console.error('Error generating visa pdf', e);
                          }
                        }}
                        className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        title="Télécharger la fiche de visas hiérarchiques A4"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Visa A4</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onReorder(order)}
                        className="btn-shine py-1.5 px-3.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                        title="Recharger ces articles dans le panier"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Recommander</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* 5. MOBILE PAYMENT MODAL FOR DIRECT SETTLEMENT */}
      {selectedPaymentOrder && (
        <MobilePaymentModal
          isOpen={true}
          onClose={() => setSelectedPaymentOrder(null)}
          order={selectedPaymentOrder}
          allOrders={orders}
          onPaymentConfirmed={async (transactionId, operator) => {
            await handleSaveMobilePayment({
              provider: operator,
              merchantPhone: operator === 'moov_money' ? '066240399' : '077003004',
              transactionReference: transactionId,
              senderPhone: selectedPaymentOrder.customer.phone,
              isPrePaid: false,
              status: 'submitted',
              amount: selectedPaymentOrder.estimatedTotal
            });
          }}
        />
      )}
    </div>
  );
};
