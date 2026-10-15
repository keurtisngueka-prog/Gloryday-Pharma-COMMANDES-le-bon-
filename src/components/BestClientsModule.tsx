import React, { useState } from 'react';
import { 
  Crown, 
  AlertTriangle, 
  MessageCircle, 
  Send,
  Clock,
  MapPin
} from 'lucide-react';
import { User } from '../types';
import { api } from '../api';

interface BestClientsModuleProps {
  clients: any[];
  commercials: User[];
  isSuperAdmin: boolean;
  onRefreshClients: () => void;
  onOpenMessageModal: (client: any) => void;
}

export const BestClientsModule: React.FC<BestClientsModuleProps> = ({
  clients,
  commercials,
  isSuperAdmin,
  onRefreshClients,
  onOpenMessageModal
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'inactive10'>('all');

  const filteredClients = clients.filter(c => {
    if (filterMode === 'inactive10') return c.isInactive10Days;
    return true;
  });

  const inactiveCount = clients.filter(c => c.isInactive10Days).length;

  const getWhatsAppRelaunchUrl = (client: any) => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const message = `Bonjour ${client.contactName || client.facilityName},\nL'équipe Gloryday Pharma espère que vous allez bien.\nNous constatons que votre établissement n'a pas renouvelé ses approvisionnements depuis plus de 10 jours. Avez-vous besoin d'un réassort urgent en consommables (gants, seringues, perfusion) ?\nNous sommes à votre disposition pour une livraison rapide à Libreville.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24 px-2 sm:px-0">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Portefeuille Clients & Relances</span>
          </h2>
          <p className="text-xs text-[#6a6a6b] mt-0.5">
            Suivi des {clients.length} établissements clients et détection d'inactivité &gt; 10 jours
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#0f0f12] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('inactive10')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'inactive10'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Inactifs &gt; 10 jours ({inactiveCount})</span>
          </button>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {filteredClients.map((client, idx) => (
          <div key={client.id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-slate-900">
                  {client.facilityName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {client.facilityType || 'Clinique'}
                </span>
                {client.isInactive10Days && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    Inactif ({client.daysSinceLastOrder || 10}j)
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                <span>Contact : <strong>{client.contactName || 'Responsable'}</strong></span>
                <span>WhatsApp : <strong>{client.phone}</strong></span>
                {client.deliveryAddress && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {client.deliveryAddress}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-500 mt-1">
                Commandes : <strong>{client.totalOrdersCount || 0}</strong> · CA : <strong>{(client.totalSpent || 0).toLocaleString('fr-FR')} FCFA</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <a
                href={getWhatsAppRelaunchUrl(client)}
                target="_blank"
                rel="noopener noreferrer"
                className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                  client.isInactive10Days
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Relancer WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => onOpenMessageModal(client)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Message In-App"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
