import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  Laptop, 
  ArrowRight,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { AuditEntry, AuditActionType } from '../types';
import { getAuditLogs } from '../utils/auditLogger';

export const AuditLogModule: React.FC = () => {
  const [logs, setLogs] = useState<AuditEntry[]>(() => getAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const reloadLogs = () => {
    setLogs(getAuditLogs());
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(entry => {
      if (selectedActionType !== 'all' && entry.actionType !== selectedActionType) {
        return false;
      }
      if (selectedRole !== 'all' && entry.userRole !== selectedRole) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.userName.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.targetEntity.toLowerCase().includes(q) ||
        entry.targetId.toLowerCase().includes(q) ||
        entry.deviceInfo.toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery, selectedActionType, selectedRole]);

  const exportAuditCSV = () => {
    const headers = ['ID', 'Date Heure', 'Utilisateur', 'Role', 'Action', 'Entite Cible', 'ID Cible', 'Appareil', 'Details', 'Avant', 'Apres'];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString('fr-FR')}"`,
      `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.userRole}"`,
      `"${l.actionType}"`,
      `"${l.targetEntity}"`,
      `"${l.targetId}"`,
      `"${l.deviceInfo.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${(l.previousState || '').replace(/"/g, '""')}"`,
      `"${(l.newState || '').replace(/"/g, '""')}"`
    ].join(';'));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_audit_gloryday_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getActionColor = (action: AuditActionType) => {
    switch (action) {
      case 'validation_paiement':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'statut_commande':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'annulation_commande':
      case 'suppression_produit':
      case 'suppression_pack':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'modification_prix':
      case 'mouvement_stock':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'statut_client':
      case 'fusion_client':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0d44e8]" />
            <h2 className="text-sm font-bold text-slate-900">
              Journal d'Audit Immuable des Opérations
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
              {filteredLogs.length} entrées
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre de traçabilité légale B2B Pharma : horodatage, utilisateur, appareil et valeurs avant/après.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadLogs}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Rafraîchir les entrées"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>
          <button
            type="button"
            onClick={exportAuditCSV}
            className="py-2 px-3 bg-[#0d44e8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher action, utilisateur, appareil..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs outline-none focus:border-[#0d44e8]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
          >
            <option value="all">Toutes les actions</option>
            <option value="statut_commande">Changement Statut Commande</option>
            <option value="validation_paiement">Validation Paiement / Rapprochement</option>
            <option value="modification_prix">Modification de Prix</option>
            <option value="mouvement_stock">Mouvement de Stock</option>
            <option value="annulation_commande">Annulation de Commande</option>
            <option value="statut_client">Statut Client (Blocage/Suspension)</option>
            <option value="fusion_client">Fusion de Doublon Client</option>
            <option value="modification_parametres">Modification Paramètres</option>
            <option value="export_donnees">Export de Données</option>
          </select>
        </div>

        <div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
          >
            <option value="all">Tous les rôles d'utilisateurs</option>
            <option value="Super-Admin">Super-Admin</option>
            <option value="Commercial">Commercial</option>
            <option value="Gestionnaire Catalogue">Gestionnaire Catalogue</option>
            <option value="Logistique">Logistique</option>
            <option value="client">Client</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
              <th className="py-2.5 px-3 whitespace-nowrap">Horodatage</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Opérateur</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Type d'Action</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Entité Cible</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Appareil & Système</th>
              <th className="py-2.5 px-3">Détails & Modifications</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Aucun événement d'audit enregistré correspondant à vos critères.
                </td>
              </tr>
            ) : (
              filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(entry.timestamp).toLocaleString('fr-FR')}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{entry.userName}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-mono">{entry.userRole}</div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionColor(entry.actionType)}`}>
                      {entry.actionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{entry.targetEntity}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{entry.targetId}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Laptop className="w-3 h-3 text-slate-400" />
                      <span>{entry.deviceInfo}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="text-slate-800 font-medium">{entry.details}</p>
                    {(entry.previousState || entry.newState) && (
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-600">
                        {entry.previousState && (
                          <span className="line-through text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            {entry.previousState}
                          </span>
                        )}
                        {entry.previousState && entry.newState && (
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        )}
                        {entry.newState && (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                            {entry.newState}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
