import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Package, 
  Sparkles, 
  AlertTriangle, 
  FileText, 
  Send,
  ExternalLink 
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onSelectNotificationAction?: (notification: AppNotification) => void;
  onSendCustomNotification?: (title: string, message: string, type: AppNotification['type']) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectNotificationAction,
  onSendCustomNotification
}) => {
  const [filterType, setFilterType] = useState<'all' | 'orders' | 'promos'>('all');

  if (!isOpen) return null;

  const filtered = notifications.filter(n => {
    if (filterType === 'orders') return n.type === 'order_created' || n.type === 'status_changed' || n.type === 'payment_updated';
    if (filterType === 'promos') return n.type === 'promotion';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0d44e8] text-white flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                <span>Centre de Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                    {unreadCount} nouv.
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                Suivi automatique des commandes & alertes réductions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-[11px] text-[#0d44e8] hover:underline font-bold cursor-pointer"
            >
              Tout marquer comme lu
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-white text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-[#0f0f12] text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('orders')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'orders' ? 'bg-[#0d44e8] text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-3 h-3" />
            <span>Commandes</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('promos')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'promos' ? 'bg-gradient-to-r from-rose-600 to-red-500 text-white font-bold' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>Promotions</span>
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto divide-y divide-slate-100 p-2.5 flex-1 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
              <p>Aucune notification dans cette catégorie.</p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => onSelectNotificationAction?.(n)}
                className={`p-3 rounded-xl transition-all text-xs flex items-start gap-3 cursor-pointer ${
                  n.read ? 'bg-white hover:bg-slate-50' : 'bg-[#eef3ff]/60 border border-blue-100/80 font-medium'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  n.type === 'promotion'
                    ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white'
                    : n.type === 'status_changed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : n.type === 'inactivity_reminder'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-[#0d44e8]'
                }`}>
                  {n.type === 'order_created' && <Package className="w-4 h-4" />}
                  {n.type === 'status_changed' && <CheckCircle2 className="w-4 h-4" />}
                  {n.type === 'payment_updated' && <DollarSign className="w-4 h-4" />}
                  {n.type === 'promotion' && <Sparkles className="w-4 h-4" />}
                  {n.type === 'inactivity_reminder' && <AlertTriangle className="w-4 h-4" />}
                  {n.type === 'quote_created' && <FileText className="w-4 h-4" />}
                  {n.type === 'admin_message' && <Send className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-slate-900 truncate">
                      {n.type === 'promotion' 
                        ? 'Offre Promotionnelle' 
                        : n.type === 'status_changed' 
                          ? 'Suivi de Commande' 
                          : n.type === 'inactivity_reminder'
                            ? 'Alerte Réassort'
                            : 'Information Gloryday'}
                    </span>
                    {n.discountBadge && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-extrabold text-[9px]">
                        {n.discountBadge}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-800 leading-snug text-xs">{n.message}</p>

                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {new Date(n.timestamp).toLocaleDateString('fr-FR')}
                    </span>
                    {n.orderReference && (
                      <span className="font-mono font-semibold text-[#0d44e8]">
                        Réf {n.orderReference}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 px-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            Notifications push automatiques actives
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-[#0f0f12] text-white font-bold hover:bg-slate-800 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
