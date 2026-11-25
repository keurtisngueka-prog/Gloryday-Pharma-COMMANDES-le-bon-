import React, { useMemo, useState } from 'react';
import { Building2, LoaderCircle, X } from 'lucide-react';
import type { ClientRecord, FacilityType } from '../types';
import { api } from '../api';

interface AdminClientRecordModalProps {
  record?: (ClientRecord & { linkedUserId?: string }) | null;
  clients: any[];
  onClose: () => void;
  onSaved: () => void;
}

const facilityTypes: FacilityType[] = ['Clinique', 'Polyclinique', 'Hôpital', 'Laboratoire', 'Pharmacie', 'Cabinet médical', 'Autre'];

export const AdminClientRecordModal: React.FC<AdminClientRecordModalProps> = ({ record, clients, onClose, onSaved }) => {
  const accountOptions = useMemo(() => clients
    .filter((client) => client.hasAccount && client.linkedUserId)
    .sort((left, right) => String(left.facilityName || '').localeCompare(String(right.facilityName || ''), 'fr')),
  [clients]);
  const [facilityName, setFacilityName] = useState(record?.facilityName || '');
  const [invoiceName, setInvoiceName] = useState(record?.invoiceName || '');
  const [facilityType, setFacilityType] = useState<FacilityType>(record?.facilityType || 'Clinique');
  const [contactName, setContactName] = useState(record?.contactName || '');
  const [directorName, setDirectorName] = useState(record?.directorName || '');
  const [companyPhone, setCompanyPhone] = useState(record?.companyPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(record?.secondaryPhone || '');
  const [city, setCity] = useState(record?.city || '');
  const [deliveryAddress, setDeliveryAddress] = useState(record?.deliveryAddress || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState(record?.deliveryInstructions || '');
  const [linkedUserId, setLinkedUserId] = useState(record?.linkedUserId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!facilityName.trim() || !companyPhone.trim()) {
      setError('Renseignez le nom de l’établissement et son téléphone de contact.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        facilityName: facilityName.trim(),
        invoiceName: invoiceName.trim() || undefined,
        facilityType,
        contactName: contactName.trim() || 'Contact achats',
        directorName: directorName.trim() || undefined,
        companyPhone: companyPhone.trim(),
        secondaryPhone: secondaryPhone.trim() || undefined,
        city: city.trim() || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
      };
      const saved = record?.id
        ? await api.updateClientRecord(record.id, data)
        : await api.createClientRecord(data);
      if (linkedUserId && linkedUserId !== record?.linkedUserId) {
        await api.linkClientRecordToAccount(saved.id, linkedUserId);
      }
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La fiche client n’a pas pu être enregistrée.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="client-record-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-blue-100 p-2 text-blue-800"><Building2 className="h-5 w-5" /></span>
            <div>
              <h2 id="client-record-title" className="text-lg font-black text-slate-950">{record ? 'Modifier la fiche client' : 'Ajouter un client'}</h2>
              <p className="mt-1 text-xs text-slate-600">Créez la fiche maintenant. Le client pourra créer son compte plus tard et vous pourrez le rattacher ici.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </header>

        <form onSubmit={handleSubmit} className="min-h-0 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">Nom de l’entreprise ou structure *
              <input required maxLength={120} value={facilityName} onChange={(event) => setFacilityName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-bold text-slate-700">Nom court sur facture
              <input maxLength={120} value={invoiceName} onChange={(event) => setInvoiceName(event.target.value)} placeholder="Facultatif, pour éviter les noms trop longs" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-bold text-slate-700">Type d’établissement
              <select value={facilityType} onChange={(event) => setFacilityType(event.target.value as FacilityType)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold">
                {facilityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">Contact opérationnel
              <input maxLength={120} value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Responsable achats / pharmacie" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-bold text-slate-700">Propriétaire / directeur général
              <input maxLength={120} value={directorName} onChange={(event) => setDirectorName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-bold text-slate-700">Téléphone de l’entreprise *
              <input required maxLength={32} type="tel" value={companyPhone} onChange={(event) => setCompanyPhone(event.target.value)} placeholder="+241…" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-bold text-slate-700">Téléphone secondaire
              <input maxLength={32} type="tel" value={secondaryPhone} onChange={(event) => setSecondaryPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-bold text-slate-700">Ville
              <input maxLength={100} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Libreville" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-bold text-slate-700">Adresse
              <input maxLength={300} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Quartier et rue" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">Précision / repère de livraison
              <textarea maxLength={250} rows={2} value={deliveryInstructions} onChange={(event) => setDeliveryInstructions(event.target.value)} placeholder="Bâtiment, entrée, repère…" className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium" />
            </label>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
            <label className="block text-xs font-bold text-slate-700">Compte de connexion à rattacher
              <select value={linkedUserId} onChange={(event) => setLinkedUserId(event.target.value)} disabled={Boolean(record?.linkedUserId)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold disabled:bg-slate-100">
                <option value="">Aucun pour le moment</option>
                {accountOptions.map((account) => <option key={account.linkedUserId} value={account.linkedUserId}>{account.facilityName} — connexion {account.loginPhone || account.phone}</option>)}
              </select>
            </label>
            <p className="mt-1.5 text-[11px] text-slate-600">Le téléphone de connexion reste distinct du numéro de l’entreprise. Le rattachement donne accès à l’historique de ce dossier.</p>
          </div>

          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Annuler</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? 'Enregistrement…' : record ? 'Enregistrer la fiche' : 'Créer la fiche client'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
