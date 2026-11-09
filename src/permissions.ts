import type { StaffPermission, User } from './types';
import type { StaffRole } from './api';

export type PermissionDefinition = {
  id: StaffPermission;
  label: string;
  description: string;
};

export type PermissionGroup = {
  id: string;
  title: string;
  permissions: PermissionDefinition[];
};

export const STAFF_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'catalog', title: 'Catalogue & packs', permissions: [
      { id: 'catalog_view', label: 'Consulter les produits', description: 'Voir les fiches sans les modifier.' },
      { id: 'catalog_manage', label: 'Gérer les produits', description: 'Créer, modifier ou retirer les fiches produits.' },
      { id: 'packs_manage', label: 'Gérer les packs', description: 'Créer, modifier et supprimer les packs médicaux.' },
    ],
  },
  {
    id: 'stock', title: 'Stocks & inventaire', permissions: [
      { id: 'stock_view', label: 'Voir les stocks', description: 'Quantités internes, seuils, mouvements et alertes.' },
      { id: 'stock_receive', label: 'Réceptionner du stock', description: 'Ajouter une réception fournisseur avec sa provenance et un motif.' },
      { id: 'stock_adjust', label: 'Corriger le stock', description: 'Faire un inventaire ou corriger une quantité avec motif.' },
      { id: 'stock_batches_manage', label: 'Gérer les lots & quarantaines', description: 'Bloquer, réactiver ou détruire un lot suivi avec un motif.' },
      { id: 'stock_availability_manage', label: 'Gérer la disponibilité client', description: 'Basculer un article entre disponible et rupture dans le catalogue client.' },
      { id: 'stock_costs_view', label: 'Voir coûts & marges', description: 'Consulter les prix d’achat, prix de revient et marges.' },
      { id: 'stock_costs_manage', label: 'Modifier les coûts d’achat', description: 'Saisir ou modifier le prix de revient utilisé pour calculer les marges.' },
      { id: 'stock_export', label: 'Exporter le stock', description: 'Télécharger les données de stock et mouvements.' },
    ],
  },
  {
    id: 'orders', title: 'Commandes & paiements', permissions: [
      { id: 'orders_view', label: 'Consulter les commandes', description: 'Voir les commandes accessibles à son rôle.' },
      { id: 'orders_create_for_client', label: 'Créer une commande pour un client', description: 'Préparer et enregistrer un bon de commande au nom d’un client sélectionné.' },
      { id: 'orders_confirm', label: 'Confirmer & lancer la préparation', description: 'Valider une commande reçue puis la passer en préparation.' },
      { id: 'orders_cancel', label: 'Annuler une commande', description: 'Annuler une commande autorisée et déclencher la restitution de stock.' },
      { id: 'orders_finance_view', label: 'Voir les montants', description: 'Voir les prix, totaux, acomptes et soldes.' },
      { id: 'orders_finance_manage', label: 'Gérer factures & avoirs', description: 'Ouvrir et mettre à jour les documents financiers.' },
      { id: 'payments_manage', label: 'Enregistrer un paiement', description: 'Pointer un règlement ou modifier le statut de paiement.' },
    ],
  },
  {
    id: 'quotes', title: 'Devis & proforma', permissions: [
      { id: 'quotes_view', label: 'Consulter les devis', description: 'Voir les demandes et propositions de prix.' },
      { id: 'quotes_manage', label: 'Traiter les devis', description: 'Créer, transmettre et mettre à jour les devis.' },
    ],
  },
  {
    id: 'clients', title: 'Clients & communication', permissions: [
      { id: 'clients_view', label: 'Consulter les clients', description: 'Voir les fiches et coordonnées des clients.' },
      { id: 'clients_manage', label: 'Modifier les fiches client', description: 'Mettre à jour les coordonnées et informations de suivi.' },
      { id: 'clients_credit_manage', label: 'Modifier les conditions de crédit', description: 'Régler le plafond, le minimum et les échéances.' },
      { id: 'messages_view', label: 'Lire les messages', description: 'Consulter les conversations accessibles.' },
      { id: 'messages_send', label: 'Envoyer des messages', description: 'Répondre aux clients depuis la messagerie.' },
      { id: 'campaigns_manage', label: 'Envoyer des annonces', description: 'Créer une campagne visible par les clients.' },
    ],
  },
  {
    id: 'logistics', title: 'Livraison & logistique', permissions: [
      { id: 'logistics_view', label: 'Consulter les livraisons', description: 'Voir les étapes, adresses et affectations.' },
      { id: 'logistics_manage', label: 'Gérer les livraisons', description: 'Affecter un livreur et mettre à jour le suivi.' },
    ],
  },
  {
    id: 'receivables', title: 'Créances & finances', permissions: [
      { id: 'receivables_view', label: 'Voir les créances', description: 'Consulter les montants dus et les échéances.' },
      { id: 'receivables_payments_manage', label: 'Saisir un paiement de créance', description: 'Enregistrer un acompte et recalculer le solde.' },
      { id: 'receivables_reminders_manage', label: 'Gérer les relances', description: 'Planifier et historiser les relances de recouvrement.' },
      { id: 'finance_view', label: 'Consulter les finances', description: 'Voir le tableau des recettes et des dépenses.' },
      { id: 'expenses_manage', label: 'Enregistrer des dépenses', description: 'Ajouter ou annuler une dépense professionnelle.' },
    ],
  },
  {
    id: 'management', title: 'Pilotage & paramètres', permissions: [
      { id: 'stats_view', label: 'Voir les statistiques', description: 'Accéder aux indicateurs et historiques d’achat.' },
      { id: 'audit_view', label: 'Lire le journal d’audit', description: 'Consulter qui a effectué une opération et quand.' },
      { id: 'settings_manage', label: 'Modifier les paramètres', description: 'Configurer les remises et réglages opérationnels.' },
    ],
  },
];

export const ALL_CONFIGURABLE_PERMISSIONS: StaffPermission[] = STAFF_PERMISSION_GROUPS
  .flatMap(group => group.permissions.map(permission => permission.id));

const LEGACY_PERMISSION_EXPANSIONS: Partial<Record<StaffPermission, StaffPermission[]>> = {
  catalog_stock: ['catalog_view', 'catalog_manage', 'packs_manage', 'stock_view', 'stock_receive', 'stock_adjust', 'stock_batches_manage', 'stock_availability_manage', 'stock_costs_view', 'stock_costs_manage', 'stock_export'],
  orders_manage: ['orders_view', 'orders_confirm', 'orders_cancel', 'orders_finance_view', 'orders_finance_manage', 'payments_manage', 'receivables_view', 'receivables_payments_manage', 'receivables_reminders_manage'],
  orders_status_manage: ['orders_confirm', 'orders_cancel'],
};

export function normalizeStaffPermissions(input: unknown, fallbackRole: StaffRole): StaffPermission[] {
  const source = Array.isArray(input)
    ? input.filter((permission): permission is StaffPermission =>
      typeof permission === 'string' && (
        ALL_CONFIGURABLE_PERMISSIONS.includes(permission as StaffPermission) ||
        permission === 'catalog_stock' || permission === 'orders_manage' || permission === 'orders_status_manage' ||
        permission === 'clients_manage' || permission === 'logistics_manage'
      ))
    : getDefaultStaffPermissions(fallbackRole);
  const expanded = new Set<StaffPermission>();
  source.forEach(permission => {
    const legacyExpansion = LEGACY_PERMISSION_EXPANSIONS[permission];
    if (legacyExpansion) legacyExpansion.forEach(granted => expanded.add(granted));
    else expanded.add(permission);
  });
  if (expanded.has('stock_receive') || expanded.has('stock_adjust') || expanded.has('stock_batches_manage') || expanded.has('stock_availability_manage') || expanded.has('stock_costs_manage') || expanded.has('stock_export')) {
    expanded.add('stock_view');
  }
  if (expanded.has('stock_costs_manage')) expanded.add('stock_costs_view');
  if (expanded.has('logistics_manage')) expanded.add('logistics_view');
  if (expanded.has('receivables_payments_manage') || expanded.has('receivables_reminders_manage')) expanded.add('receivables_view');
  if (expanded.has('quotes_manage')) expanded.add('quotes_view');
  return Array.from(expanded);
}

export function getDefaultStaffPermissions(role: StaffRole): StaffPermission[] {
  switch (role) {
    case 'Admin simple':
      return ['orders_view', 'orders_confirm', 'orders_cancel', 'orders_finance_view', 'payments_manage', 'clients_view', 'clients_manage', 'clients_credit_manage', 'messages_view', 'messages_send', 'logistics_view', 'logistics_manage', 'receivables_view', 'receivables_payments_manage', 'receivables_reminders_manage', 'stats_view'];
    case 'Commercial':
      return ['orders_view', 'orders_confirm', 'orders_cancel', 'quotes_view', 'quotes_manage', 'clients_view', 'clients_manage', 'messages_view', 'messages_send', 'receivables_view', 'receivables_reminders_manage'];
    case 'Gestionnaire Catalogue':
      return ['catalog_view', 'catalog_manage', 'packs_manage', 'stock_view', 'stock_receive', 'stock_adjust', 'stock_batches_manage', 'stock_availability_manage', 'stock_costs_view', 'stock_costs_manage', 'stock_export', 'orders_view'];
    case 'Logistique':
      return ['orders_view', 'logistics_view', 'logistics_manage'];
    case 'Secrétaire':
      return ['orders_create_for_client', 'clients_view'];
    default:
      return [];
  }
}

export function userHasPermission(user: Pick<User, 'role' | 'permissions'> | null | undefined, permission: StaffPermission): boolean {
  if (!user) return false;
  if (user.role === 'Super-Admin') return true;
  const permissions = normalizeStaffPermissions(user.permissions, user.role as StaffRole);
  return permissions.includes(permission);
}
