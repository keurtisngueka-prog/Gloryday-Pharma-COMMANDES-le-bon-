import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  Filter, 
  Clock, 
  MessageCircle, 
  Truck, 
  Package, 
  ShoppingBag, 
  UserCheck, 
  Settings, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { getAuditLogs, AuditLogEntry, AuditCategory } from '../utils/auditLogger';
import { Order } from '../types';

interface AuditLogModuleProps {
  orders?: Order[];
}

export const AuditLogModule: React.FC<AuditLogModuleProps> = ({ orders = [] }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | AuditCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = () => {
    const storedLogs = getAuditLogs();
    // Merge with any WhatsApp logs embedded in orders so nothing is missed
    const orderWhatsAppEntries: AuditLogEntry[] = [];
    orders.forEach(order => {
      if (order.whatsappLogs && order.whatsappLogs.length > 0) {
        order.whatsappLogs.forEach(wLog => {
          const entryId = `wa-ord-${wLog.id}`;
          if (!storedLogs.some(l => l.id === entryId)) {
            orderWhatsAppEntries.push({
              id: entryId,
              timestamp: wLog.timestamp,
              category: 'whatsapp',
              action: `WhatsApp Étape : ${wLog.stageLabel}`,
              actorName: wLog.triggeredBy || 'Automate API Logistique',
              actorRole: 'Système',
              targetReference: order.reference,
              details: `Notification envoyée à ${wLog.recipientName} (${wLog.recipientPhone}) — "${wLog.messagePreview.slice(0, 90)}..."`,
              status: wLog.status === 'failed' ? 'error' : 'success'
            });
          }
        });
      }
    });

    const combined = [...storedLogs, ...orderWhatsAppEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(combined);
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener('gloryday_audit_updated', handleUpdate);
    return () => window.removeEventListener('gloryday_audit_updated', handleUpdate);
  }, [orders]);

  const filteredLogs = logs.filter(log => {
    if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        (log.targetReference && log.targetReference.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['Horodatage', 'Categorie', 'Action', 'Operateur', 'Role', 'Reference', 'Details', 'Statut'];
    const rows = filteredLogs.map(l => [
      new Date(l.timestamp).toLocaleString('fr-FR'),
      l.category,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.actorName.replace(/"/g, '""')}"`,
      l.actorRole,
      l.targetReference || '-',
      `"${l.details.replace(/"/g, '""')}"`,
      l.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Gloryday_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryIcon = (cat: AuditCategory) => {
    switch (cat) {
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'delivery': return <Truck className="w-4 h-4 text-purple-600" />;
      case 'order': return <ShoppingBag className="w-4 h-4 text-[#0d44e8]" />;
      case 'stock': return <Package className="w-4 h-4 text-amber-600" />;
      case 'auth': return <UserCheck className="w-4 h-4 text-indigo-600" />;
      case 'settings': return <Settings className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryLabel = (cat: AuditCategory) => {
    switch (cat) {
      case 'whatsapp': return 'WhatsApp Auto';
      case 'delivery': return 'Logistique';
      case 'order': return 'Commandes';
      case 'stock': return 'Stocks';
      case 'auth': return 'Sessions';
      case 'settings': return 'Paramètres';
    }
  };

  const whatsappCount = logs.filter(l => l.category === 'whatsapp').length;
  const deliveryCount = logs.filter(l => l.category === 'delivery').length;
  const stockCount = logs.filter(l => l.category === 'stock').length;

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Événements Tracés</span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{logs.length}</div>
          <span className="text-[11px] text-slate-500">Horodatage certifié</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Envois WhatsApp Auto</span>
          <div className="text-2xl font-black text-emerald-900 mt-1 tabular-nums">{whatsappCount}</div>
          <span className="text-[11px] text-emerald-700">Notifications clients & coursiers</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">Transitions Logistiques</span>
          <div className="text-2xl font-black text-purple-900 mt-1 tabular-nums">{deliveryCount}</div>
          <span className="text-[11px] text-purple-700">Mises à jour d'étapes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Mouvements Catalogue</span>
          <div className="text-2xl font-black text-amber-900 mt-1 tabular-nums">{stockCount}</div>
          <span className="text-[11px] text-amber-700">Disponibilité & ruptures</span>
        </div>
      </div>

      {/* Main Audit Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0d44e8]" />
              <span>Journal d'Audit Opérationnel & Traçabilité</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historique complet des actions administrateurs, notifications WhatsApp automatiques et mouvements de stock.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={loadLogs}
              className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="py-1.5 px-3.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
            {(['all', 'whatsapp', 'delivery', 'order', 'stock', 'auth', 'settings'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#0d44e8] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat === 'all' ? `Tous (${logs.length})` : getCategoryLabel(cat)}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrer par réf, opérateur, texte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs w-full md:w-64 focus:ring-2 focus:ring-[#0d44e8]"
            />
          </div>
        </div>

        {/* Audit Entries List */}
        <div className="divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              Aucun événement trouvé pour ce filtre.
            </div>
          ) : (
            filteredLogs.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(entry.category)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {entry.action}
                      </span>
                      {entry.targetReference && (
                        <span className="font-mono font-bold text-[11px] text-[#0d44e8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {entry.targetReference}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        · Par <strong className="text-slate-700">{entry.actorName}</strong> ({entry.actorRole})
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {entry.details}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 text-[11px] text-slate-500 font-mono tabular-nums">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(entry.timestamp).toLocaleDateString('fr-FR')} {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-sans font-bold text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Enregistré
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
