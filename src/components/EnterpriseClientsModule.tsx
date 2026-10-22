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
  Edit2,
  Building2,
  Check,
  X,
  Layers,
  Award,
  ChevronRight
} from 'lucide-react';
import { User, ClientAccountStatus, PaymentTerms, HealthcareStructure } from '../types';
import { logAuditEvent } from '../utils/auditLogger';
import { 
  getHealthcareStructures, 
  updateStructureQuota, 
  approveDirectorRequest, 
  rejectDirectorRequest, 
  getPendingDirectorRequests,
  getStructureMembers
} from '../utils/structureStorage';

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
  const [subTab, setSubTab] = useState<'clients' | 'directors' | 'structures'>('clients');
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

  // Healthcare structures state
  const [structures, setStructures] = useState<HealthcareStructure[]>(() => getHealthcareStructures());
  const [quotaModalStructure, setQuotaModalStructure] = useState<HealthcareStructure | null>(null);
  const [quotaInput, setQuotaInput] = useState<number>(3);

  // Pending director requests
  const pendingDirectors = useMemo(() => {
    return clients.filter(c => c.jobTitle === 'directeur' && c.directorApprovalStatus === 'pending');
  }, [clients]);

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

  const handleApproveDirector = (targetUser: User) => {
    const res = approveDirectorRequest(targetUser.id);
    if (res.success && res.user) {
      onUpdateClient(res.user);
      logAuditEvent(
        currentUser,
        'statut_client',
        'Accès Direction Structure',
        targetUser.id,
        `Validation de l'accès Direction pour ${targetUser.contactName || targetUser.phone} (${targetUser.facilityName})`,
        'En attente',
        'Directeur validé'
      );
      setStructures(getHealthcareStructures());
      onRefresh();
    }
  };

  const handleRejectDirector = (targetUser: User) => {
    const res = rejectDirectorRequest(targetUser.id);
    if (res.success && res.user) {
      onUpdateClient(res.user);
      logAuditEvent(
        currentUser,
        'statut_client',
        'Accès Direction Structure',
        targetUser.id,
        `Refus de la demande Direction pour ${targetUser.contactName || targetUser.phone} (${targetUser.facilityName})`,
        'En attente',
        'Refusé'
      );
      onRefresh();
    }
  };

  const handleSaveQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaModalStructure) return;

    const updated = updateStructureQuota(quotaModalStructure.id, quotaInput);
    if (updated) {
      setStructures(getHealthcareStructures());
      logAuditEvent(
        currentUser,
        'modification_parametres',
        'Plafond Structure',
        quotaModalStructure.id,
        `Ajustement du plafond de comptes pour « ${quotaModalStructure.name} » : ${quotaModalStructure.maxAccounts} ➔ ${quotaInput} comptes`,
        String(quotaModalStructure.maxAccounts),
        String(quotaInput)
      );
    }
    setQuotaModalStructure(null);
  };

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
  };

  const handleExecuteMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryClientToKeep || !duplicateClientToMerge || primaryClientToKeep.id === duplicateClientToMerge.id) return;

    const updatedPrimary: User = {
      ...primaryClientToKeep,
      totalOrdersCount: (primaryClientToKeep.totalOrdersCount || 0) + (duplicateClientToMerge.totalOrdersCount || 0),
      totalSpent: (primaryClientToKeep.totalSpent || 0) + (duplicateClientToMerge.totalSpent || 0),
      outstandingBalance: (primaryClientToKeep.outstandingBalance || 0) + (duplicateClientToMerge.outstandingBalance || 0),
      notes: `${primaryClientToKeep.notes || ''}\n[Fusionné avec le compte ${duplicateClientToMerge.phone} le ${new Date().toLocaleDateString('fr-FR')}]`
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Structures de Santé & Comptes Clients B2B
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Validation des accès Direction, plafonds de comptes par établissement, conditions de crédit et fusion de doublons.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (clients.length >= 2) {
                setPrimaryClientToKeep(clients[0]);
                setDuplicateClientToMerge(clients[1]);
                setIsMergeModalOpen(true);
              }
            }}
            className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Fusionner Doublons</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1 p-2 bg-slate-100/70 border-b border-slate-200/80 text-xs px-4">
        <button
          type="button"
          onClick={() => setSubTab('clients')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            subTab === 'clients'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tous les Comptes ({clients.length})
        </button>

        <button
          type="button"
          onClick={() => setSubTab('directors')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'directors'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-purple-700'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Demandes Accès Direction</span>
          {pendingDirectors.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-400 text-slate-900 rounded-full text-[10px] font-black">
              {pendingDirectors.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setStructures(getHealthcareStructures());
            setSubTab('structures');
          }}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'structures'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Structures & Plafonds ({structures.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: TOUS LES COMPTES CLIENTS */}
      {subTab === 'clients' && (
        <div>
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
                  <th className="py-2.5 px-3">Établissement & Contact</th>
                  <th className="py-2.5 px-3">Poste Déclaré</th>
                  <th className="py-2.5 px-3">Statut B2B</th>
                  <th className="py-2.5 px-3 text-right">Plafond Crédit</th>
                  <th className="py-2.5 px-3 text-right">Encours Impayé</th>
                  <th className="py-2.5 px-3">Conditions</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => {
                  const status = client.accountStatus || 'actif';
                  const creditLimit = client.creditLimit || 500000;
                  const outstanding = client.outstandingBalance || 0;
                  const terms = client.paymentTerms || '30_jours';

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
                          client.jobTitle === 'directeur'
                            ? client.directorApprovalStatus === 'approved'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                            : client.jobTitle === 'docteur'
                              ? 'bg-blue-100 text-[#0d44e8]'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {client.jobTitle === 'directeur' 
                            ? `Directeur (${client.directorApprovalStatus === 'approved' ? 'Validé' : 'En attente'})` 
                            : client.jobTitle === 'docteur' 
                              ? 'Docteur' 
                              : 'Chargé commandes'}
                        </span>
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
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {outstanding.toLocaleString('fr-FR')} F
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium capitalize">
                        {terms.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTerms(client)}
                            className="p-1 text-[#0d44e8] hover:bg-blue-50 rounded cursor-pointer"
                            title="Modifier les plafonds et conditions de règlement"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteClientData(client.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Supprimer ce compte client"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DEMANDES D'ACCÈS DIRECTION EN ATTENTE */}
      {subTab === 'directors' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-700" />
                <span>Demandes d'accès Direction en attente ({pendingDirectors.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Seul l'administrateur Gloryday peut activer la vue consolidée de la structure après vérification de l'identité du déclarant.
              </p>
            </div>
          </div>

          {pendingDirectors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
              Toutes les demandes de direction ont été traitées. Aucune demande en attente.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingDirectors.map((user) => (
                <div 
                  key={user.id} 
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{user.facilityName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Direction Déclarée
                      </span>
                      <span className="text-xs text-slate-500">
                        {user.facilityType || 'Clinique'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1">
                      Déclarant : <strong>{user.contactName || 'Non spécifié'}</strong> · Tél : <span className="font-mono">{user.phone}</span> · Adresse : {user.deliveryAddress || 'Libreville'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Inscrit le : {new Date(user.createdAt).toLocaleString('fr-FR')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRejectDirector(user)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Rejeter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveDirector(user)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Valider l'Accès Direction</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: STRUCTURES & PLAFONDS DE COMPTES */}
      {subTab === 'structures' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0d44e8]" />
                <span>Gestion des Établissements & Plafonds de Comptes ({structures.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Plafond par défaut : 3 comptes (cliniques, cabinets, pharmacies, labos), modulable à 5 pour les polycliniques et 10 pour les centres hospitaliers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {structures.map((s) => {
              const members = getStructureMembers(s.id, clients);
              const isFull = members.length >= s.maxAccounts;

              return (
                <div 
                  key={s.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{s.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {s.type}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isFull 
                          ? 'bg-rose-100 text-rose-800' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {members.length} / {s.maxAccounts} comptes
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1">
                      Directeur titulaire : <strong>{s.directorName || 'Non désigné / En attente'}</strong>
                    </div>
                    {s.deliveryAddress && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {s.deliveryAddress}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {members.length} collaborateur(s) actif(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuotaModalStructure(s);
                        setQuotaInput(s.maxAccounts);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0d44e8] font-bold text-xs cursor-pointer flex items-center gap-1 border border-blue-200"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Modifier Plafond ({s.maxAccounts})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quota Edit Modal */}
      {quotaModalStructure && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Plafond de comptes : {quotaModalStructure.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Réglez le nombre maximum de comptes utilisateurs pouvant être rattachés à cette structure.
              </p>
            </div>

            <form onSubmit={handleSaveQuota} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nombre maximum de comptes (Actuel: {quotaModalStructure.maxAccounts})
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[3, 5, 10, 15].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuotaInput(q)}
                      className={`p-1.5 rounded-lg border font-bold text-center cursor-pointer ${
                        quotaInput === q 
                          ? 'bg-[#0d44e8] text-white border-[#0d44e8]' 
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={quotaInput}
                  onChange={(e) => setQuotaInput(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-slate-300 font-mono text-center font-bold text-base"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuotaModalStructure(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0d44e8] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Terms Modal */}
      {isEditTermsOpen && selectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Conditions B2B : {selectedClient.facilityName}
              </h3>
              <p className="text-xs text-slate-500">
                Ajustez le plafond d'encours, le délai accordé et le statut du compte.
              </p>
            </div>

            <form onSubmit={handleSaveTerms} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Plafond d'encours (FCFA)
                </label>
                <input
                  type="number"
                  step={50000}
                  value={creditLimitInput}
                  onChange={(e) => setCreditLimitInput(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Délai de règlement
                </label>
                <select
                  value={paymentTermsInput}
                  onChange={(e: any) => setPaymentTermsInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="comptant">Comptant à la livraison</option>
                  <option value="30_jours">Paiement à 30 jours fin de mois</option>
                  <option value="60_jours">Paiement à 60 jours</option>
                  <option value="acompte_solde">Acompte 50% & Solde à livraison</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Statut du Compte
                </label>
                <select
                  value={accountStatusInput}
                  onChange={(e: any) => setAccountStatusInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-bold"
                >
                  <option value="actif">Actif (Commandes autorisées)</option>
                  <option value="en_attente">En attente de pièces justificatives</option>
                  <option value="suspendu">Suspendu (Impayés dépassés)</option>
                  <option value="bloque">Bloqué définitivement</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTermsOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0d44e8] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-purple-600" />
                <span>Fusionner deux comptes clients doublons</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Transfère l'historique d'achats et les encours vers le compte principal, puis clôture le compte secondaire.
              </p>
            </div>

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
