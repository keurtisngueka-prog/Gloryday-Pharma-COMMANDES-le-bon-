import React, { FormEvent, useEffect, useState } from 'react';
import { Check, Edit, LoaderCircle, Plus, ShieldCheck, UserRoundX, Users, Activity, Clock } from 'lucide-react';
import { api, type StaffAccountSummary, type StaffRole } from '../api';
import { StaffPermission } from '../types';

const ROLE_DETAILS: Record<StaffRole, string> = {
  'Admin simple': 'Tableau de bord, commandes et clients ; sans réglages système ni export SQL',
  Commercial: 'Clients attribués, commandes et devis',
  'Gestionnaire Catalogue': 'Produits, tarifs dégressifs et stock',
  Logistique: 'Préparation et suivi des livraisons',
};

const PERMISSION_LABELS: { id: StaffPermission; label: string; desc: string }[] = [
  { id: 'catalog_stock', label: 'Catalogue & Stocks', desc: 'Modifier produits, quantités en stock et remises volume' },
  { id: 'orders_view', label: 'Voir Commandes', desc: 'Consulter les bons de commande reçus' },
  { id: 'orders_manage', label: 'Valider Commandes & Paiements', desc: 'Confirmer, annuler ou pointer les paiements' },
  { id: 'quotes_manage', label: 'Gérer les Devis / Proforma', desc: 'Traiter les demandes de devis et articles stock 0' },
  { id: 'clients_manage', label: 'Cliniques & Relances', desc: 'Voir le répertoire clients et envoyer des messages' },
  { id: 'logistics_manage', label: 'Logistique & Livreurs', desc: 'Affecter les coursiers et suivre les livraisons GPS' },
  { id: 'stats_view', label: 'Statistiques & KPIs', desc: 'Accéder aux chiffres d’affaires et statistiques achats' },
  { id: 'settings_manage', label: 'Paramètres Système', desc: 'Configurer Mobile Money et seuils de remise' },
];

function getDefaultPermissionsForRole(role: StaffRole): StaffPermission[] {
  switch (role) {
    case 'Admin simple':
      return ['orders_view', 'orders_manage', 'clients_manage', 'logistics_manage', 'stats_view'];
    case 'Commercial':
      return ['orders_view', 'orders_manage', 'quotes_manage', 'clients_manage'];
    case 'Gestionnaire Catalogue':
      return ['catalog_stock', 'orders_view'];
    case 'Logistique':
      return ['orders_view', 'logistics_manage'];
    default:
      return ['orders_view'];
  }
}

function formatLastSeen(iso?: string): string {
  if (!iso) return 'Jamais connecté';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 'Récemment';
  const diffMin = Math.floor((Date.now() - ms) / 60000);
  if (diffMin < 1) return 'À l’instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  return new Date(ms).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const EMPTY_FORM = {
  identifier: '',
  name: '',
  role: 'Commercial' as StaffRole,
  permissions: getDefaultPermissionsForRole('Commercial'),
};

export const StaffAccountsModule: React.FC = () => {
  const [accounts, setAccounts] = useState<StaffAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [editing, setEditing] = useState<StaffAccountSummary | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setAccounts(await api.getStaffAccounts());
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les comptes employés.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      api.getStaffAccounts().then(setAccounts).catch(() => {});
    }, 25000);
    return () => clearInterval(timer);
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPassword('');
    setPasswordConfirmation('');
    setEditing(null);
  };

  const startEditing = (account: StaffAccountSummary) => {
    setEditing(account);
    setForm({
      identifier: account.identifier,
      name: account.name,
      role: account.role,
      permissions: account.permissions && account.permissions.length > 0
        ? account.permissions
        : getDefaultPermissionsForRole(account.role),
    });
    setPassword('');
    setPasswordConfirmation('');
    setError('');
    setSuccess('');
  };

  const handleRoleChange = (nextRole: StaffRole) => {
    setForm(prev => ({
      ...prev,
      role: nextRole,
      permissions: getDefaultPermissionsForRole(nextRole),
    }));
  };

  const togglePermission = (perm: StaffPermission) => {
    setForm(prev => {
      const exists = prev.permissions.includes(perm);
      const next = exists
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: next };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (password !== passwordConfirmation) {
      setError('Les deux mots de passe ne sont pas identiques.');
      return;
    }
    if (!editing && (password.length < 8 || password.length > 85)) {
      setError('Le mot de passe doit contenir entre 8 et 85 caractères.');
      return;
    }
    if (password && (password.length < 8 || password.length > 85)) {
      setError('Le nouveau mot de passe doit contenir entre 8 et 85 caractères.');
      return;
    }
    if (form.permissions.length === 0) {
      setError('Sélectionnez au moins un droit d’accès pour ce collaborateur.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.updateStaffAccount(editing.id, {
          identifier: form.identifier,
          name: form.name,
          role: form.role,
          permissions: form.permissions,
          ...(password ? { password } : {}),
        });
        setSuccess('Les informations et droits d’accès du collaborateur ont été mis à jour.');
      } else {
        await api.createStaffAccount({
          identifier: form.identifier,
          name: form.name,
          role: form.role,
          permissions: form.permissions,
          password,
        });
        setSuccess('Le compte collaborateur a été créé avec ses droits personnalisés.');
      }
      resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer ce compte.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (account: StaffAccountSummary) => {
    const nextActive = !account.active;
    setError('');
    setSuccess('');
    try {
      await api.updateStaffAccount(account.id, { active: nextActive });
      setSuccess(nextActive ? 'Le compte a été réactivé.' : 'Le compte a été désactivé.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier l’état du compte.');
    }
  };

  const copySql = async () => {
    try {
      const sql = await api.getLatestMigrationSql();
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      setError('Le SQL n’a pas pu être copié. Ouvre « Sauvegardes & Déploiement » pour récupérer la mise à jour Supabase.');
    }
  };

  const migrationNeeded = /app_staff_accounts|PGRST205|42P01|schema cache|mise à jour des comptes employés/i.test(error);

  return (
    <section className="space-y-5">
      <div className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Comptes collaborateurs & Droits d’accès</h2>
            <p className="text-sm text-slate-600 mt-1">
              Attribuez un rôle et cochez individuellement les parties de l’application auxquelles chaque collaborateur a accès.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <p>{migrationNeeded ? 'La base Supabase doit recevoir la mise à jour des comptes employés avant leur création.' : error}</p>
            {migrationNeeded && (
              <button type="button" onClick={copySql} className="mt-3 rounded-xl bg-rose-800 px-3 py-2 text-xs font-bold text-white hover:bg-rose-900">
                {copiedSql ? 'SQL copié' : 'Copier le SQL de mise à jour'}
              </button>
            )}
          </div>
        )}
        {success && <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{success}</div>}

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">
            Nom du collaborateur
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ex. Aline Mba"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Identifiant de connexion
            <input
              required
              minLength={3}
              maxLength={64}
              pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}"
              value={form.identifier}
              onChange={(event) => setForm({ ...form, identifier: event.target.value.toLowerCase() })}
              placeholder="Ex. aline.commercial"
              autoComplete="username"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">
            Fonction principale (pré-remplit les droits par défaut)
            <select
              value={form.role}
              onChange={(event) => handleRoleChange(event.target.value as StaffRole)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              {(Object.keys(ROLE_DETAILS) as StaffRole[]).map((role) => (
                <option key={role} value={role}>{role} — {ROLE_DETAILS[role]}</option>
              ))}
            </select>
          </label>

          {/* Granular Permissions Selector */}
          <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Droits d’accès individuels du collaborateur
                </span>
                <span className="text-[11px] text-slate-500">
                  Cochez ou décochez librement chaque module accessible lors de la création ou plus tard.
                </span>
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                {form.permissions.length} droit(s) actif(s)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSION_LABELS.map((item) => {
                const checked = form.permissions.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      checked
                        ? 'bg-white border-purple-400 shadow-2xs'
                        : 'bg-white/60 border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(item.id)}
                      className="mt-0.5 rounded text-purple-700 focus:ring-purple-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block">{item.label}</span>
                      <span className="text-[11px] text-slate-500 block leading-snug">{item.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="text-xs font-bold text-slate-700">
            {editing ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe'}
            <input
              required={!editing}
              minLength={8}
              maxLength={85}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder={editing ? 'Laisser vide pour ne pas le changer' : '8 à 85 caractères'}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Confirmer le mot de passe
            <input
              required={!editing || Boolean(password)}
              minLength={8}
              maxLength={85}
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              autoComplete="new-password"
              placeholder={editing ? 'À remplir avec un nouveau mot de passe' : 'Saisir le même mot de passe'}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-60 cursor-pointer">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Enregistrement…' : editing ? 'Enregistrer les changements' : 'Créer le compte collaborateur'}
            </button>
            {editing && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Annuler</button>}
          </div>
        </form>
      </div>

      {/* Staff List with Online Status & Activity Statistics */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-5">
          <div>
            <h3 className="font-black text-slate-900">Équipe, Statut en ligne & Statistiques</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Visualisez en direct qui est connecté, ses droits d’accès actifs et son activité opérationnelle.
            </p>
          </div>
          <button type="button" onClick={() => void refresh()} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />Chargement des collaborateurs…
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">Aucun compte employé pour le moment</p>
            <p className="mt-1 text-xs text-slate-500">Utilisez le formulaire ci-dessus pour créer le premier accès.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accounts.map((account) => {
              const perms = account.permissions && account.permissions.length > 0
                ? account.permissions
                : getDefaultPermissionsForRole(account.role);
              return (
                <div key={account.id} className="p-4 sm:px-5 flex flex-col gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{account.name}</span>

                        {/* Online / Offline Badge */}
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-extrabold border ${
                          account.isOnline
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${account.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {account.isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>

                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                          account.active ? 'bg-blue-50 text-blue-800' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {account.active ? account.role : 'Compte Désactivé'}
                        </span>

                        {account.source === 'environment' && (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            Réglages serveur
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Identifiant : <strong className="text-slate-700">{account.identifier}</strong></span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          Dernière activité : {formatLastSeen(account.lastSeenAt || account.lastLoginAt)}
                        </span>
                      </div>

                      {/* Granular Permission Badges */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {perms.map((pId) => {
                          const found = PERMISSION_LABELS.find(item => item.id === pId);
                          return (
                            <span
                              key={pId}
                              className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200/80 text-[10px] font-bold"
                            >
                              ✓ {found ? found.label : pId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {account.source === 'managed' ? (
                      <div className="flex shrink-0 gap-2 self-start">
                        <button
                          type="button"
                          onClick={() => startEditing(account)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />Modifier droits / profil
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(account)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold cursor-pointer ${
                            account.active ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {account.active ? <UserRoundX className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          {account.active ? 'Désactiver' : 'Réactiver'}
                        </button>
                      </div>
                    ) : (
                      <p className="shrink-0 text-xs text-slate-400">Compte système</p>
                    )}
                  </div>

                  {/* Collaborator Activity Statistics Bar */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-blue-600" />
                        Commandes suivies
                      </span>
                      <strong className="font-black text-slate-900 tabular-nums">
                        {account.stats?.ordersProcessed ?? 0}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Devis traités</span>
                      <strong className="font-black text-slate-900 tabular-nums">
                        {account.stats?.quotesManaged ?? 0}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Livraisons effectuées</span>
                      <strong className="font-black text-emerald-700 tabular-nums">
                        {account.stats?.deliveriesHandled ?? 0}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
