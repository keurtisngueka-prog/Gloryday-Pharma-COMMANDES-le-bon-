import React from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Megaphone,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sun,
} from 'lucide-react';
import type { AppNotification, Order, User } from '../types';

const StaffMessagesModule = React.lazy(() => import('./StaffMessagesModule').then(module => ({ default: module.StaffMessagesModule })));

interface AdminWorkspaceTopbarProps {
  user: User;
  searchValue: string;
  unreadCount: number;
  isDarkTheme: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onOpenNotifications: () => void;
  onOpenAccountMenu: () => void;
  onToggleTheme: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onCreateCampaign?: () => void;
  canCreateCampaign: boolean;
}

export const AdminWorkspaceTopbar: React.FC<AdminWorkspaceTopbarProps> = ({
  user,
  searchValue,
  unreadCount,
  isDarkTheme,
  onSearchChange,
  onSearchSubmit,
  onOpenNotifications,
  onOpenAccountMenu,
  onToggleTheme,
  onRefresh,
  refreshing,
  onCreateCampaign,
  canCreateCampaign,
}) => (
  <header className="admin-workspace-topbar">
    <form
      role="search"
      className="admin-workspace-search"
      onSubmit={(event) => { event.preventDefault(); onSearchSubmit(); }}
    >
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
      <input
        aria-label="Rechercher une commande ou un client"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Rechercher une commande, un client…"
      />
      <button type="submit" aria-label="Lancer la recherche" className="admin-workspace-search-submit">
        Rechercher
      </button>
    </form>

    <div className="admin-workspace-topbar-actions">
      <a className="admin-workspace-help" href="https://wa.me/24177003004" target="_blank" rel="noreferrer">Aide</a>
      {canCreateCampaign && onCreateCampaign && <button type="button" onClick={onCreateCampaign} className="admin-workspace-topbar-campaign"><Megaphone aria-hidden="true" className="h-4 w-4" /><span>Campagne</span></button>}
      <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Actualiser les données" className="admin-workspace-icon-button">
        <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={isDarkTheme ? 'Activer le thème clair' : 'Activer le thème sombre'}
        aria-pressed={isDarkTheme}
        className="admin-workspace-icon-button"
      >
        {isDarkTheme ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onOpenNotifications}
        aria-label={unreadCount ? `Notifications, ${unreadCount} non lue(s)` : 'Notifications'}
        className="admin-workspace-icon-button relative"
      >
        <Bell aria-hidden="true" className="h-4 w-4" />
        {unreadCount > 0 && <span className="admin-workspace-notification-dot" aria-hidden="true" />}
      </button>
      <button type="button" onClick={onOpenAccountMenu} className="admin-workspace-account-button">
        <span className="admin-workspace-avatar" aria-hidden="true">{(user.contactName || user.facilityName || 'É').trim().charAt(0).toLocaleUpperCase('fr')}</span>
        <span className="hidden sm:block">Équipe</span>
      </button>
    </div>
  </header>
);

interface AdminWorkspaceOverviewProps {
  orders: Order[];
  clients: any[];
  notifications: AppNotification[];
  canCreateOrder: boolean;
  canCreateInvoice: boolean;
  canSeePayments: boolean;
  canSeeMessages: boolean;
  canReplyToMessages: boolean;
  onOpenQuickEntry?: () => void;
  onCreateOrder: () => void;
  onOpenOrders: (order?: Order) => void;
  onOpenOrdersToConfirm: () => void;
  onOpenPayments: () => void;
  onOpenMessages: (conversationId?: string) => void;
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('fr-FR', { timeZone: 'Africa/Libreville', hour: '2-digit', minute: '2-digit' })
    : '—';
}

function getOrderStatusClass(status: Order['status']): string {
  if (status === 'À confirmer') return 'is-pending';
  if (status === 'En préparation') return 'is-preparing';
  if (status === 'Confirmée') return 'is-confirmed';
  return 'is-neutral';
}

export const AdminWorkspaceOverview: React.FC<AdminWorkspaceOverviewProps> = ({
  orders,
  clients,
  notifications,
  canCreateOrder,
  canCreateInvoice,
  canSeePayments,
  canSeeMessages,
  canReplyToMessages,
  onOpenQuickEntry,
  onCreateOrder,
  onOpenOrders,
  onOpenOrdersToConfirm,
  onOpenPayments,
  onOpenMessages,
}) => {
  const toConfirm = orders.filter(order => order.status === 'À confirmer');
  const paymentsToReview = canSeePayments ? orders.filter(order => order.mobilePayment?.status === 'submitted') : [];
  const unreadMessages = canSeeMessages ? notifications.filter(notification => notification.type === 'admin_message' && !notification.read).length : 0;
  const activeOrders = [...orders]
    .filter(order => order.status !== 'Annulée' && order.status !== 'Livrée')
    .sort((left, right) => {
      const priority = (order: Order) => order.status === 'À confirmer' ? 0 : order.mobilePayment?.status === 'submitted' ? 1 : 2;
      return priority(left) - priority(right) || right.createdAt.localeCompare(left.createdAt);
    })
    .slice(0, 3);
  const recentActivity = [...notifications].sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, 3);
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Africa/Libreville' }).format(new Date()).toLocaleUpperCase('fr-FR');

  return (
    <div className="admin-workspace-overview">
      <div className="admin-workspace-greeting">
        <div>
          <p className="admin-workspace-eyebrow">{weekday} · ESPACE OPÉRATIONNEL</p>
          <h1>Bonjour, l’équipe</h1>
          <p>Voici ce qui demande une action aujourd’hui.</p>
        </div>
        <div className="admin-workspace-primary-actions">
          {canCreateOrder && <button type="button" className="admin-workspace-primary-button" onClick={onOpenQuickEntry}><Plus aria-hidden="true" className="h-4 w-4" /> Saisie rapide</button>}
          {canCreateInvoice && <button type="button" className="admin-workspace-secondary-button" onClick={onCreateOrder}>Nouvelle facture</button>}
        </div>
      </div>

      <section aria-label="Priorités du jour" className="admin-workspace-priorities">
        <button type="button" className="admin-workspace-priority-card" onClick={onOpenOrdersToConfirm}>
          <span>Commandes à confirmer</span>
          <strong>{String(toConfirm.length).padStart(2, '0')}</strong>
          <small>Priorité : demandes reçues en premier</small>
          {toConfirm.length > 0 && <span className="admin-workspace-priority-badge">{toConfirm.length} à traiter</span>}
        </button>
        {canSeePayments && <button type="button" className="admin-workspace-priority-card" onClick={onOpenPayments}>
          <span>Paiements à vérifier</span>
          <strong>{String(paymentsToReview.length).padStart(2, '0')}</strong>
          <small>Références Mobile Money en attente</small>
          <span className="admin-workspace-card-link">Ouvrir les paiements <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></span>
        </button>}
        {canSeeMessages && <button type="button" className="admin-workspace-priority-card" onClick={() => onOpenMessages()}>
          <span>Messages clients non lus</span>
          <strong>{String(unreadMessages).padStart(2, '0')}</strong>
          <small>Les échanges récents restent accessibles ici</small>
          <span className="admin-workspace-card-link">Ouvrir la boîte de réception <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></span>
        </button>}
      </section>

      <section className="admin-workspace-workbench" aria-label="Travail en cours">
        <div className="admin-workspace-panel admin-workspace-queue">
          <div className="admin-workspace-panel-heading">
            <h2>À traiter maintenant</h2>
            <button type="button" onClick={() => onOpenOrders()} className="admin-workspace-text-link">Toutes les commandes <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
          </div>
          {activeOrders.length ? (
            <div className="admin-workspace-order-list">
              {activeOrders.map(order => (
                <button type="button" key={order.id} className="admin-workspace-order-row" onClick={() => onOpenOrders(order)}>
                  <span className="admin-workspace-order-ref">{order.reference}</span>
                  <span className="admin-workspace-order-client"><strong>{order.customer.facilityName}</strong><small>{order.items.length} article(s) · reçue à {formatTime(order.createdAt)}</small></span>
                  <span className={`admin-workspace-status ${getOrderStatusClass(order.status)}`}>{order.status}</span>
                  <span className="admin-workspace-text-link">Ouvrir <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="admin-workspace-empty"><CheckCircle2 aria-hidden="true" className="h-5 w-5" /><span>Tout est à jour. Aucune commande active à traiter.</span></div>
          )}
        </div>

        {canSeeMessages && <div className="admin-workspace-panel admin-workspace-conversations">
          <div className="admin-workspace-panel-heading">
            <h2>Conversations</h2>
            <button type="button" onClick={() => onOpenMessages()} className="admin-workspace-text-link">Voir la boîte <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
          </div>
          <React.Suspense fallback={<div className="admin-workspace-inline-loading">Chargement des conversations…</div>}>
            <StaffMessagesModule
              clients={clients}
              canSend={canReplyToMessages}
              compact
              onOpenAll={onOpenMessages}
            />
          </React.Suspense>
        </div>}
      </section>

      <section className="admin-workspace-panel admin-workspace-activity" aria-labelledby="admin-workspace-activity-title">
        <div className="admin-workspace-panel-heading">
          <h2 id="admin-workspace-activity-title">Activité récente</h2>
          <span className="admin-workspace-activity-icon"><Activity aria-hidden="true" className="h-4 w-4" /></span>
        </div>
        {recentActivity.length ? (
          <div className="admin-workspace-activity-list">
            {recentActivity.map(notification => (
              <div className="admin-workspace-activity-row" key={notification.id}>
                <strong>{notification.title || (notification.type === 'order_created' ? 'Nouvelle commande' : notification.type === 'payment_updated' ? 'Paiement mis à jour' : notification.type === 'status_changed' ? 'Statut modifié' : 'Mise à jour')}</strong>
                <span>{notification.message}</span>
                <time dateTime={notification.timestamp}>{formatTime(notification.timestamp)}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-workspace-empty-activity">Les commandes, paiements et changements de statut apparaîtront ici.</p>
        )}
      </section>

    </div>
  );
};
