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
  ExternalLink,
  KeyRound,
  Smartphone,
  BellRing,
  BellOff,
  LoaderCircle
} from 'lucide-react';
import { AppNotification } from '../types';
import type { PushNotificationStatus } from '../utils/pushNotifications';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onSelectNotificationAction?: (notification: AppNotification) => void;
  onSendCustomNotification?: (title: string, message: string, type: AppNotification['type']) => void;
  pushStatus: PushNotificationStatus;
  pushError?: string | null;
  onEnablePush?: () => void;
  onDisablePush?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectNotificationAction,
  onSendCustomNotification,
  pushStatus,
  pushError,
  onEnablePush,
  onDisablePush
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
                Commandes, annonces et demandes d’assistance
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

        <div className="px-4 py-3 border-b border-slate-100 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 w-8 h-8 rounded-xl bg-white text-[#0d44e8] border border-blue-100 flex items-center justify-center shrink-0">
              {pushStatus === 'enabled' ? <BellRing className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">
                {pushStatus === 'enabled' ? 'Notifications push activées'
                  : pushStatus === 'loading' ? 'Vérification des notifications…'
                    : pushStatus === 'available' ? 'Recevoir les nouvelles même si le site est fermé'
                      : pushStatus === 'permission-denied' ? 'Notifications bloquées dans le navigateur'
                        : pushStatus === 'unsupported' ? 'Notifications push indisponibles sur cet appareil'
                          : pushStatus === 'unconfigured' ? 'Notifications push à configurer sur le site'
                            : pushStatus === 'signed-out' ? 'Connectez-vous pour activer les notifications'
                              : 'Paramètres des notifications push'}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {pushStatus === 'enabled'
                  ? 'Les annonces et les mises à jour de commande peuvent vous être envoyées sur cet appareil.'
                  : pushStatus === 'unconfigured'
                    ? 'L’activation sera disponible après configuration technique du site.'
                    : pushStatus === 'permission-denied'
                      ? 'Autorisez les notifications depuis les réglages du navigateur.'
                      : pushStatus === 'unsupported'
                        ? 'Utilisez un navigateur compatible sur une connexion HTTPS.'
                        : pushStatus === 'signed-out'
                          ? 'Un compte connecté est nécessaire pour associer cet appareil.'
                          : 'Vous gardez le contrôle : aucune autorisation n’est demandée sans votre clic.'}
              </p>
              {pushError && <p className="text-[11px] text-rose-700 mt-1">{pushError}</p>}
            </div>
          </div>
          {pushStatus === 'available' && (
            <button type="button" onClick={onEnablePush} className="shrink-0 px-3.5 py-2 rounded-xl bg-[#0d44e8] text-white text-xs font-bold hover:bg-[#0b3ac7]">
              Activer les notifications push
            </button>
          )}
          {pushStatus === 'enabled' && (
            <button type="button" onClick={onDisablePush} className="shrink-0 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5">
              <BellOff className="w-3.5 h-3.5" /> Désactiver
            </button>
          )}
          {pushStatus === 'loading' && (
            <LoaderCircle className="w-4 h-4 text-[#0d44e8] animate-spin shrink-0" />
          )}
          {pushStatus === 'error' && (
            <button type="button" onClick={onEnablePush} className="shrink-0 px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-[#0d44e8] text-xs font-bold hover:bg-blue-50">
              Réessayer
            </button>
          )}
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
                  {n.type === 'password_recovery' && <KeyRound className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-slate-900 truncate">
                      {n.title || (n.type === 'promotion' 
                        ? 'Offre Promotionnelle' 
                        : n.type === 'status_changed' 
                          ? 'Suivi de Commande' 
                          : n.type === 'inactivity_reminder'
                            ? 'Alerte Réassort'
                            : 'Information Gloryday')}
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
          <span className="text-[11px] text-slate-500">Activez le push pour les annonces et le suivi de commande.</span>
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
