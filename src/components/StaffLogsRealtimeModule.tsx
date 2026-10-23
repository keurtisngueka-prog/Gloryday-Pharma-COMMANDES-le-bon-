import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Activity,
  Search,
  RefreshCw,
  Download,
  Package,
  ShoppingCart,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  Filter,
  UserCheck,
  Pause,
  Play,
  Database,
  Copy,
  Check,
  X
} from 'lucide-react';
import { StaffActivityLog, StaffLogCategory, StaffLogSeverity } from '../types';
import { api } from '../api';

const SUPABASE_ACTIVITY_LOGS_SQL = `-- Table Supabase : public.activity_logs
-- Colonnes : id, user_id, action_type, entity_type, entity_id, details (JSONB), created_at
-- + Politiques Row-Level Security (RLS) réservées aux administrateurs authentifiés

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId" TEXT,
  "actionType" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "timestamp" TIMESTAMPTZ DEFAULT NOW(),
  actor_name TEXT,
  actor_role TEXT,
  category TEXT DEFAULT 'system',
  severity TEXT DEFAULT 'info',
  action_label TEXT,
  target_label TEXT,
  previous_value TEXT,
  new_value TEXT,
  app_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id_snake ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type_snake ON public.activity_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_snake ON public.activity_logs (entity_type, entity_id);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.activity_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.activity_logs TO authenticated;
GRANT ALL ON TABLE public.activity_logs TO service_role;

-- Politique RLS : Seuls les administrateurs authentifiés peuvent lire ces logs
DROP POLICY IF EXISTS "activity_logs_admin_select_policy" ON public.activity_logs;
CREATE POLICY "activity_logs_admin_select_policy"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')
    IN ('Super-Admin', 'Admin simple', 'admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('Super-Admin', 'Admin simple')
    )
    OR EXISTS (
      SELECT 1 FROM public.app_staff_accounts s
      WHERE s.id = auth.uid()::text
        AND s.role IN ('Super-Admin', 'Admin simple')
        AND s.is_active = TRUE
    )
  );`;

export const StaffLogsRealtimeModule: React.FC = () => {
  const [logs, setLogs] = useState<StaffActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<'all' | StaffLogCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | StaffLogSeverity>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const data = await api.getStaffActivityLogs();
      setLogs(Array.isArray(data) ? data : []);
      setLastSyncedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les logs collaborateurs.');
    } finally {
      setIsLoading(false);
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs(false);
  }, [fetchLogs]);

  useEffect(() => {
    if (!isLivePolling) return;
    const interval = setInterval(() => {
      void fetchLogs(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLivePolling, fetchLogs]);

  const uniqueActors = useMemo(() => {
    const map = new Map<string, { name: string; role: string }>();
    for (const log of logs) {
      if (log.actorName && !map.has(log.actorName)) {
        map.set(log.actorName, { name: log.actorName, role: log.actorRole });
      }
    }
    return Array.from(map.values());
  }, [logs]);

  const counts = useMemo(() => {
    let stockPrice = 0;
    let orders = 0;
    let access = 0;
    let critical = 0;
    for (const log of logs) {
      if (log.category === 'stock_price') stockPrice += 1;
      else if (log.category === 'orders') orders += 1;
      else if (log.category === 'access') access += 1;
      if (log.severity === 'critical' || log.severity === 'warning') critical += 1;
    }
    return { total: logs.length, stockPrice, orders, access, critical };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
      if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
      if (actorFilter !== 'all' && log.actorName !== actorFilter) return false;
      if (!q) return true;
      return (
        (log.userId && log.userId.toLowerCase().includes(q)) ||
        (log.actionType && log.actionType.toLowerCase().includes(q)) ||
        (log.entityType && log.entityType.toLowerCase().includes(q)) ||
        (log.entityId && log.entityId.toLowerCase().includes(q)) ||
        log.actionLabel.toLowerCase().includes(q) ||
        log.targetLabel.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorRole.toLowerCase().includes(q) ||
        (log.previousValue && log.previousValue.toLowerCase().includes(q)) ||
        (log.newValue && log.newValue.toLowerCase().includes(q))
      );
    });
  }, [logs, categoryFilter, severityFilter, actorFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = ['timestamp', 'userId', 'actionType', 'entityType', 'entityId', 'details', 'Collaborateur', 'Rôle', 'Avant', 'Après'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.userId || l.actorId,
      l.actionType || l.actionLabel,
      l.entityType || l.targetType,
      l.entityId || l.targetId || l.targetLabel,
      l.details.replace(/"/g, '""'),
      l.actorName,
      l.actorRole,
      l.previousValue || '',
      l.newValue || ''
    ]);
    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gloryday-activity_logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = async () => {
    try {
      setIsRefreshing(true);
      const updated = await api.clearStaffActivityLogs();
      setLogs(updated);
      setConfirmClear(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation des logs.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderCategoryBadge = (category: StaffLogCategory) => {
    switch (category) {
      case 'stock_price':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Package className="w-3 h-3 text-amber-600" />
            <span>Prix & Stocks</span>
          </span>
        );
      case 'orders':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <ShoppingCart className="w-3 h-3 text-blue-600" />
            <span>Commandes</span>
          </span>
        );
      case 'access':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <UserCheck className="w-3 h-3 text-purple-600" />
            <span>Accès & Droits</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <ShieldCheck className="w-3 h-3 text-slate-600" />
            <span>Système</span>
          </span>
        );
    }
  };

  const renderSeverityIndicator = (severity: StaffLogSeverity) => {
    if (severity === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Critique
        </span>
      );
    }
    if (severity === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-700" />
          Modification
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Nominal
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Live Telemetry Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Collection <code className="font-mono text-[#0d44e8] bg-blue-50 px-1.5 py-0.5 rounded">activity_logs</code> · Actions Critiques en Temps Réel
                </h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                  isLivePolling
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLivePolling ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {isLivePolling ? 'En direct · Supabase & Serveur (4s)' : 'Flux en pause'}
                </span>
                {lastSyncedAt && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    Synchro : {lastSyncedAt}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Structure normalisée Supabase : <span className="font-mono text-slate-700 font-semibold">userId · actionType · entityType · entityId · details · timestamp</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>SQL Supabase (activity_logs)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLivePolling((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isLivePolling
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
            }`}
          >
            {isLivePolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLivePolling ? 'Mettre en pause' : 'Reprendre le direct'}</span>
          </button>

          <button
            type="button"
            onClick={() => void fetchLogs(false)}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0d44e8]' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b38c4] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purger</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-rose-800">Confirmer ?</span>
              <button
                type="button"
                onClick={() => void handleClearLogs()}
                className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-2 py-0.5 rounded-lg bg-white text-slate-600 border border-slate-200 text-[11px] font-semibold cursor-pointer"
              >
                Non
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${categoryFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Actions
            </span>
            <Activity className={`w-4 h-4 ${categoryFilter === 'all' ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <p className="text-2xl font-black font-mono tabular-nums mt-1">{counts.total}</p>
          <p className={`text-[11px] mt-0.5 ${categoryFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            {counts.critical} modification(s) sensible(s)
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('stock_price')}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'stock_price'
              ? 'bg-amber-700 text-white border-amber-700'
              : 'bg-white text-slate-900 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${categoryFilter === 'stock_price' ? 'text-amber-100' : 'text-amber-800'}`}>
              Prix, Stocks & Remises
            </span>
            <Package className={`w-4 h-4 ${categoryFilter === 'stock_price' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <p className="text-2xl font-black font-mono tabular-nums mt-1">{counts.stockPrice}</p>
          <p className={`text-[11px] mt-0.5 ${categoryFilter === 'stock_price' ? 'text-amber-100' : 'text-slate-500'}`}>
            Ajustements quantités, tarifs & paliers 5%/10%
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('orders')}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'orders'
              ? 'bg-[#0d44e8] text-white border-[#0d44e8]'
              : 'bg-white text-slate-900 border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${categoryFilter === 'orders' ? 'text-blue-100' : 'text-blue-800'}`}>
              Commandes & Paiements
            </span>
            <ShoppingCart className={`w-4 h-4 ${categoryFilter === 'orders' ? 'text-white' : 'text-[#0d44e8]'}`} />
          </div>
          <p className="text-2xl font-black font-mono tabular-nums mt-1">{counts.orders}</p>
          <p className={`text-[11px] mt-0.5 ${categoryFilter === 'orders' ? 'text-blue-100' : 'text-slate-500'}`}>
            Validations, colisage, livraisons & encaissements
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('access')}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
            categoryFilter === 'access'
              ? 'bg-purple-800 text-white border-purple-800'
              : 'bg-white text-slate-900 border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${categoryFilter === 'access' ? 'text-purple-100' : 'text-purple-800'}`}>
              Connexions & Droits
            </span>
            <UserCheck className={`w-4 h-4 ${categoryFilter === 'access' ? 'text-white' : 'text-purple-600'}`} />
          </div>
          <p className="text-2xl font-black font-mono tabular-nums mt-1">{counts.access}</p>
          <p className={`text-[11px] mt-0.5 ${categoryFilter === 'access' ? 'text-purple-100' : 'text-slate-500'}`}>
            Sessions collaborateurs & permissions attribuées
          </p>
        </button>
      </div>

      {/* Filter Bar & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtres :</span>
            </div>

            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="all">Tous les collaborateurs ({uniqueActors.length})</option>
              {uniqueActors.map((actor) => (
                <option key={actor.name} value={actor.name}>
                  {actor.name} ({actor.role})
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'all' | StaffLogSeverity)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="all">Toutes criticités</option>
              <option value="info">Nominal / Validation</option>
              <option value="warning">Modification (Prix, Stock, Droits)</option>
              <option value="critical">Critique (Annulation, Suppression)</option>
            </select>

            {(categoryFilter !== 'all' || severityFilter !== 'all' || actorFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setSeverityFilter('all');
                  setActorFilter('all');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold cursor-pointer"
              >
                Réinitialiser filtres
              </button>
            )}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher userId, actionType, entityId..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d44e8]"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void fetchLogs(false)}
              className="underline font-bold cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="p-6 space-y-2.5">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-11 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">Aucune action collaborateur ne correspond à ces filtres.</p>
            <p className="text-xs text-slate-500">
              Dès qu'un collaborateur modifie un prix, ajuste un stock, valide une commande ou se connecte, l'événement s'affiche ici en temps réel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4 whitespace-nowrap">timestamp</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">userId & Collaborateur</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">actionType</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">entityType & entityId</th>
                  <th className="py-2.5 px-4">details (Avant → Après)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const formattedTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const userIdVal = log.userId || log.actorId;
                  const actionTypeVal = log.actionType || log.actionLabel;
                  const entityTypeVal = log.entityType || log.targetType;
                  const entityIdVal = log.entityId || log.targetId || log.targetLabel;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/90 transition-colors align-top">
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-[11px] text-slate-600">
                        <div className="font-bold text-slate-900">{formattedTime}</div>
                        <div className="text-slate-400">{formattedDate}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.actorName}</div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          userId: <span className="text-slate-700 font-semibold">{userIdVal}</span>
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.actorRole}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 mb-1">{actionTypeVal}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderCategoryBadge(log.category)}
                          {renderSeverityIndicator(log.severity)}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-slate-600">
                          entityType: <span className="font-bold text-slate-900">{entityTypeVal}</span>
                        </div>
                        <div className="font-mono tabular-nums text-[11px] font-semibold text-[#0d44e8] mt-0.5">
                          entityId: {entityIdVal}
                        </div>
                        {log.targetLabel && log.targetLabel !== entityIdVal && (
                          <div className="text-[11px] text-slate-600 mt-0.5">{log.targetLabel}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {(log.previousValue || log.newValue) && (
                          <div className="flex items-center gap-1.5 flex-wrap mb-1 font-mono tabular-nums text-[11px]">
                            {log.previousValue && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 line-through border border-slate-200">
                                {log.previousValue}
                              </span>
                            )}
                            {log.previousValue && log.newValue && (
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                            {log.newValue && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                {log.newValue}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-slate-600 leading-relaxed">{log.details}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supabase SQL Modal for activity_logs */}
      {showSqlModal && (
        <div
          onClick={() => setShowSqlModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 text-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="font-extrabold text-sm">
                  SQL Supabase · Collection / Table <code className="text-emerald-400 font-mono">public.activity_logs</code>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Champs : userId, actionType, entityType, entityId, details, timestamp
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_ACTIVITY_LOGS_SQL);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 2500);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b38c4] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{sqlCopied ? 'SQL Copié !' : 'Copier le SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-[#0a0d14] font-mono text-xs text-slate-200 overflow-x-auto max-h-[65vh]">
              <pre className="whitespace-pre">{SUPABASE_ACTIVITY_LOGS_SQL}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

