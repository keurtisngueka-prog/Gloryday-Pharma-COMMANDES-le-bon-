import React, { FormEvent, useEffect, useState } from 'react';
import { Check, Edit, LoaderCircle, Plus, ShieldCheck, UserRoundX, Users } from 'lucide-react';
import { api, type StaffAccountSummary, type StaffRole } from '../api';

const ROLE_DETAILS: Record<StaffRole, string> = {
  'Admin simple': 'Tableau de bord, commandes et clients ; sans réglages système ni export SQL',
  Commercial: 'Clients attribués, commandes et devis',
  'Gestionnaire Catalogue': 'Produits et stock',
  Logistique: 'Préparation et suivi des livraisons',
};

const EMPTY_FORM = {
  identifier: '',
  name: '',
  role: 'Commercial' as StaffRole,
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

  useEffect(() => { void refresh(); }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPassword('');
    setPasswordConfirmation('');
    setEditing(null);
  };

  const startEditing = (account: StaffAccountSummary) => {
    setEditing(account);
    setForm({ identifier: account.identifier, name: account.name, role: account.role });
    setPassword('');
    setPasswordConfirmation('');
    setError('');
    setSuccess('');
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

    setSaving(true);
    try {
      if (editing) {
        await api.updateStaffAccount(editing.id, {
          ...form,
          ...(password ? { password } : {}),
        });
        setSuccess('Les informations du compte ont été mises à jour.');
      } else {
        await api.createStaffAccount({ ...form, password });
        setSuccess('Le compte employé a été créé.');
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
    if (!nextActive && !window.confirm(`Désactiver le compte de ${account.name} ?`)) return;
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
            <h2 className="text-lg font-black text-slate-900">Comptes employés</h2>
            <p className="text-sm text-slate-600 mt-1">Crée un accès pour chaque membre de l’équipe et choisis ce qu’il peut gérer.</p>
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

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">
            Nom de l’employé
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
            Rôle dans l’application
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as StaffRole })}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              {(Object.keys(ROLE_DETAILS) as StaffRole[]).map((role) => <option key={role} value={role}>{role} — {ROLE_DETAILS[role]}</option>)}
            </select>
          </label>
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
            <button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-60">
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : editing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Enregistrement…' : editing ? 'Enregistrer les changements' : 'Créer le compte'}
            </button>
            {editing && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Annuler</button>}
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">Le mot de passe doit contenir entre 8 et 85 caractères et doit être saisi deux fois. Il ne sera jamais affiché après l’enregistrement.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-5">
          <div>
            <h3 className="font-black text-slate-900">Équipe et rôles</h3>
            <p className="mt-0.5 text-xs text-slate-500">Les accès désactivés ne peuvent plus se connecter.</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Actualiser</button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Chargement des comptes…</div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">Aucun compte employé pour le moment</p>
            <p className="mt-1 text-xs text-slate-500">Utilise le formulaire ci-dessus pour créer le premier accès.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{account.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${account.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {account.active ? 'Actif' : 'Désactivé'}
                    </span>
                    {account.source === 'environment' && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Réglages serveur</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Identifiant : <span className="font-semibold text-slate-700">{account.identifier}</span> · {account.role}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{ROLE_DETAILS[account.role]}</p>
                </div>
                {account.source === 'managed' ? (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => startEditing(account)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                      <Edit className="h-3.5 w-3.5" />Modifier
                    </button>
                    <button type="button" onClick={() => void toggleActive(account)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${account.active ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                      {account.active ? <UserRoundX className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{account.active ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </div>
                ) : (
                  <p className="shrink-0 text-xs text-slate-400">À modifier dans les réglages privés du serveur</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
