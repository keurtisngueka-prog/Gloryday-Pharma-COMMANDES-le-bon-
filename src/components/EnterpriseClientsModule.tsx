import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldAlert, 
  ShieldCheck, 
  Ban, 
  CheckCircle2, 
  CreditCard, 
  Clock, 
  GitMerge, 
  Trash2, 
  Download, 
  ExternalLink,
  DollarSign,
  AlertTriangle,
  Edit2
} from 'lucide-react';
import { User, ClientAccountStatus, PaymentTerms } from '../types';
import { logAuditEvent } from '../utils/auditLogger';

interface EnterpriseClientsModuleProps {
  clients: User[];
  currentUser: User;
  onUpdateClient: (updatedClient: User) => void;
  onDeleteClientData: (clientId: string) => void;
  onRefresh: () => void;
}

export const EnterpriseClientsModule: React.FC<EnterpriseClientsModuleProps> = ({
  clients,
  currentUser,
  onUpdateClient,
  onDeleteClientData,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<User | null>(null);

  // Edit Credit / Terms Modal
  const [isEditTermsOpen, setIsEditTermsOpen] = useState(false);
  const [creditLimitInput, setCreditLimitInput] = useState<number>(500000);
  const [paymentTermsInput, setPaymentTermsInput] = useState<PaymentTerms>('30_jours');
  const [accountStatusInput, setAccountStatusInput] = useState<ClientAccountStatus>('actif');

  // Merge Duplicates Modal
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [primaryClientToKeep, setPrimaryClientToKeep] = useState<User | null>(null);
  const [duplicateClientToMerge, setDuplicateClientToMerge] = useState<User | null>(null);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const status = c.accountStatus || 'actif';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.facilityName.toLowerCase().includes(q) ||
        (c.contactName && c.contactName.toLowerCase().includes(q)) ||
        c.phone.toLowerCase().includes(q) ||
        (c.facilityType && c.facilityType.toLowerCase().includes(q))
      );
    });
  }, [clients, searchQuery, statusFilter]);

  const handleOpenEditTerms = (client: User) => {
    setSelectedClient(client);
    setCreditLimitInput(client.creditLimit || 500000);
    setPaymentTermsInput(client.paymentTerms || '30_jours');
    setAccountStatusInput(client.accountStatus || 'actif');
    setIsEditTermsOpen(true);
  };

  const handleSaveTerms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const previousStatus = selectedClient.accountStatus || 'actif';
    const previousLimit = selectedClient.creditLimit || 500000;

    const updated: User = {
      ...selectedClient,
      creditLimit: Number(creditLimitInput),
      paymentTerms: paymentTermsInput,
      accountStatus: accountStatusInput
    };

    onUpdateClient(updated);

    logAuditEvent(
      currentUser,
      'statut_client',
      'Client B2B',
      selectedClient.id,
      `Mise à jour des conditions B2B pour ${selectedClient.facilityName} : Statut=${accountStatusInput}, Plafond=${creditLimitInput.toLocaleString('fr-FR')} FCFA (${paymentTermsInput})`,
      `Statut:${previousStatus} / Plafond:${previousLimit}`,
      `Statut:${accountStatusInput} / Plafond:${creditLimitInput}`
    );

    setIsEditTermsOpen(false);
    setSelectedClient(null);
  };

  const handleExecuteMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryClientToKeep || !duplicateClientToMerge || primaryClientToKeep.id === duplicateClientToMerge.id) return;

    // Merge duplicate client into primary
    const updatedPrimary: User = {
      ...primaryClientToKeep,
      totalOrdersCount: (primaryClientToKeep.totalOrdersCount || 0) + (duplicateClientToMerge.totalOrdersCount || 0),
      totalSpent: (primaryClientToKeep.totalSpent || 0) + (duplicateClientToMerge.totalSpent || 0),
      notes: `${primaryClientToKeep.notes || ''} [Fusionné avec ${duplicateClientToMerge.facilityName} (${duplicateClientToMerge.phone})]`
    };

    const updatedDuplicate: User = {
      ...duplicateClientToMerge,
      accountStatus: 'bloque',
      isMergedInto: primaryClientToKeep.id,
      notes: `[Compte doublon fusionné dans ${primaryClientToKeep.facilityName} (${primaryClientToKeep.id})]`
    };

    onUpdateClient(updatedPrimary);
    onUpdateClient(updatedDuplicate);

    logAuditEvent(
      currentUser,
      'fusion_client',
      'Clients B2B',
      primaryClientToKeep.id,
      `Fusion du compte doublon ${duplicateClientToMerge.facilityName} (${duplicateClientToMerge.id}) vers le compte principal ${primaryClientToKeep.facilityName}`,
      duplicateClientToMerge.id,
      primaryClientToKeep.id
    );

    setIsMergeModalOpen(false);
    setPrimaryClientToKeep(null);
    setDuplicateClientToMerge(null);
  };

  const handleExportSingleClientData = (client: User) => {
    const data = JSON.stringify(client, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dossier_client_${client.facilityName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    logAuditEvent(
      currentUser,
      'export_donnees',
      'Données Client B2B',
      client.id,
      `Export des données du dossier client pour ${client.facilityName} (Droit d'accès et portabilité)`
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Approbation & Gestion des Comptes Clients B2B Pharma
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Plafonds de crédit indicatifs, conditions de paiement à terme, suivi de la balance âgée et fusion de doublons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (clients.length >= 2) {
                setPrimaryClientToKeep(clients[0]);
                setDuplicateClientToMerge(clients[1]);
                setIsMergeModalOpen(true);
              }
            }}
            className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Fusionner Doublons</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher clinique, pharmacie, téléphone, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
          >
            <option value="all">Tous les statuts de compte</option>
            <option value="actif">Comptes Actifs (Approuvés)</option>
            <option value="en_attente">En attente d'approbation</option>
            <option value="suspendu">Comptes Suspendus</option>
            <option value="bloque">Comptes Bloqués</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">Établissement & Type</th>
              <th className="py-2.5 px-3">Statut B2B</th>
              <th className="py-2.5 px-3 text-right">Plafond Crédit</th>
              <th className="py-2.5 px-3 text-right">Encours Impayé</th>
              <th className="py-2.5 px-3">Conditions</th>
              <th className="py-2.5 px-3">Ancienneté</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClients.map((client) => {
              const status = client.accountStatus || 'actif';
              const creditLimit = client.creditLimit || 500000;
              const outstanding = client.outstandingBalance || 0;
              const overdueDays = client.overdueDays || 0;
              const terms = client.paymentTerms || '30_jours';
              const isOverLimit = outstanding > creditLimit;

              return (
                <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{client.facilityName}</div>
                    <div className="text-[11px] text-slate-500">
                      {client.facilityType || 'Clinique'} · {client.contactName || 'Responsable'} ({client.phone})
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      status === 'actif'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'en_attente'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                    }`}>
                      {status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                    {creditLimit.toLocaleString('fr-FR')} F
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <span className={`font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-700'}`}>
                      {outstanding.toLocaleString('fr-FR')} F
                    </span>
                    {isOverLimit && (
                      <span className="block text-[10px] text-rose-500 font-semibold">
                        Alerte : plafond dépassé
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {terms === 'comptant' && 'Comptant à la livraison'}
                    {terms === '30_jours' && 'Fin de mois 30 jours'}
                    {terms === '60_jours' && 'Terme 60 jours'}
                    {terms === 'acompte_solde' && '50% acompte + solde'}
                  </td>
                  <td className="py-2.5 px-3">
                    {overdueDays > 0 ? (
                      <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold ${
                        overdueDays > 30 ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {overdueDays} jours
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">À jour</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditTerms(client)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        title="Modifier plafond et conditions"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportSingleClientData(client)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        title="Exporter dossier client (RGPD/Droit d'accès)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: CONDITIONS & PLAFOND B2B */}
      {isEditTermsOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Conditions B2B : {selectedClient.facilityName}
            </h3>

            <form onSubmit={handleSaveTerms} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statut du Compte Client</label>
                <select
                  value={accountStatusInput}
                  onChange={(e: any) => setAccountStatusInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="actif">Actif (Commandes autorisées)</option>
                  <option value="en_attente">En attente d'approbation pièces</option>
                  <option value="suspendu">Suspendu (Impayé en cours de traitement)</option>
                  <option value="bloque">Bloqué (Contentieux / Fermeture)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plafond de Crédit Autorisé (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  required
                  value={creditLimitInput}
                  onChange={(e) => setCreditLimitInput(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Note : En mode indicatif convenu, le dépassement génère une alerte sans bloquer la commande d'urgence.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Conditions de Paiement</label>
                <select
                  value={paymentTermsInput}
                  onChange={(e: any) => setPaymentTermsInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="comptant">Comptant à la livraison</option>
                  <option value="30_jours">Paiement à terme 30 jours fin de mois</option>
                  <option value="60_jours">Paiement à terme 60 jours</option>
                  <option value="acompte_solde">Paiement échelonné (50% acompte + solde)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTermsOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FUSION DE DOUBLONS */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-purple-600" />
              <span>Fusion de Deux Comptes Clients Doublons</span>
            </h3>

            <p className="text-xs text-slate-600">
              Le compte doublon sera clôturé et son historique d'achats ainsi que ses encours seront rattachés au compte principal conservé.
            </p>

            <form onSubmit={handleExecuteMerge} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Compte Principal à CONSERVER
                </label>
                <select
                  value={primaryClientToKeep?.id || ''}
                  onChange={(e) => {
                    const found = clients.find(c => c.id === e.target.value);
                    if (found) setPrimaryClientToKeep(found);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.facilityName} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  2. Compte Doublon à FUSIONNER & FERMER
                </label>
                <select
                  value={duplicateClientToMerge?.id || ''}
                  onChange={(e) => {
                    const found = clients.find(c => c.id === e.target.value);
                    if (found) setDuplicateClientToMerge(found);
                  }}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.facilityName} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={primaryClientToKeep?.id === duplicateClientToMerge?.id}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Confirmer la Fusion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
