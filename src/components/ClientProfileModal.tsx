import React, { useEffect, useRef, useState } from 'react';
import { Building2, Camera, CheckCircle2, ImagePlus, LoaderCircle, MapPin, Save, X } from 'lucide-react';
import type { FacilityType, User } from '../types';
import { api } from '../api';
import { processAvatarFile } from '../utils/avatarImage';
import {
  buildNeighborhoodDeliveryAddress,
  detectNeighborhoodFromAddress,
  extractDeliveryInstructions,
  getNeighborhoodById,
  LIBREVILLE_ZONE_GROUPS
} from '../data/librevilleZones';

interface ClientProfileModalProps {
  user: User;
  onClose: () => void;
  onProfileUpdated?: (user: User) => void;
}

const FACILITY_TYPES: FacilityType[] = [
  'Clinique',
  'Polyclinique',
  'Hôpital',
  'Laboratoire',
  'Pharmacie',
  'Cabinet médical',
  'Autre'
];

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({ user, onClose, onProfileUpdated }) => {
  const initialNeighborhood = user.neighborhoodId && getNeighborhoodById(user.neighborhoodId)
    ? user.neighborhoodId
    : detectNeighborhoodFromAddress(user.deliveryAddress || '')?.id || '';
  const [facilityName, setFacilityName] = useState(user.facilityName || '');
  const [contactName, setContactName] = useState(user.contactName || '');
  const [facilityType, setFacilityType] = useState<FacilityType>(user.facilityType || 'Clinique');
  const [facilityTypeOther, setFacilityTypeOther] = useState(user.facilityTypeOther || '');
  const [neighborhoodId, setNeighborhoodId] = useState(initialNeighborhood);
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    user.deliveryInstructions !== undefined
      ? user.deliveryInstructions
      : extractDeliveryInstructions(user.deliveryAddress || '', initialNeighborhood)
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setErrorMessage(null);
    setIsProcessingPhoto(true);
    try {
      setAvatarUrl(await processAvatarFile(file));
      setAvatarChanged(true);
      setSuccessMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'La photo n’a pas pu être préparée.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!facilityName.trim()) {
      setErrorMessage('Le nom de votre établissement est obligatoire.');
      return;
    }
    if (!neighborhoodId || !getNeighborhoodById(neighborhoodId)) {
      setErrorMessage('Sélectionnez votre quartier de livraison.');
      return;
    }

    setIsSaving(true);
    try {
      const profileData: Parameters<typeof api.updateClientProfile>[0] = {
        facilityName: facilityName.trim(),
        contactName: contactName.trim(),
        facilityType,
        facilityTypeOther: facilityType === 'Autre' ? facilityTypeOther.trim() : '',
        neighborhoodId,
        deliveryInstructions: deliveryInstructions.trim()
      };
      if (avatarChanged) profileData.avatarUrl = avatarUrl;

      const result = await api.updateClientProfile(profileData);
      onProfileUpdated?.(result.user);
      setAvatarUrl(result.user.avatarUrl || null);
      setAvatarChanged(false);
      setSuccessMessage('Votre profil a bien été mis à jour.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible d’enregistrer votre profil. Réessayez.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedNeighborhood = getNeighborhoodById(neighborhoodId);
  const addressPreview = selectedNeighborhood
    ? buildNeighborhoodDeliveryAddress(neighborhoodId, deliveryInstructions)
    : user.deliveryAddress || 'Votre adresse sera ajoutée à la prochaine commande.';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center overflow-y-auto bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-profile-title"
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Espace client</p>
            <h2 id="client-profile-title" className="mt-1 text-xl font-black text-slate-900">Mon profil</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={isSaving} aria-label="Fermer le profil" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 text-2xl font-black text-blue-800">
              {avatarUrl ? <img src={avatarUrl} alt="Photo de profil" className="h-full w-full object-cover" /> : facilityName.charAt(0).toUpperCase() || <Building2 className="h-7 w-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Photo de profil</p>
              <p className="mt-0.5 text-xs text-slate-500">Ajoutez le logo ou la photo de votre établissement.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => galleryRef.current?.click()} disabled={isProcessingPhoto || isSaving} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                  <ImagePlus className="h-3.5 w-3.5" /> Galerie
                </button>
                <button type="button" onClick={() => cameraRef.current?.click()} disabled={isProcessingPhoto || isSaving} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                  <Camera className="h-3.5 w-3.5" /> Appareil photo
                </button>
                {avatarUrl && <button type="button" onClick={() => { setAvatarUrl(null); setAvatarChanged(true); setSuccessMessage(null); }} disabled={isSaving} className="px-1 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">Retirer</button>}
              </div>
              {isProcessingPhoto && <p className="mt-1 text-xs text-blue-700">Préparation de la photo…</p>}
              <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
              <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Nom de l’établissement *</span>
              <input required maxLength={120} value={facilityName} onChange={(event) => setFacilityName(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Nom du contact</span>
              <input maxLength={120} value={contactName} onChange={(event) => setContactName(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Type d’établissement</span>
              <select value={facilityType} onChange={(event) => setFacilityType(event.target.value as FacilityType)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {FACILITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            {facilityType === 'Autre' && (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Précisez le type</span>
                <input maxLength={120} value={facilityTypeOther} onChange={(event) => setFacilityTypeOther(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700"><MapPin className="h-3.5 w-3.5 text-blue-700" /> Quartier de livraison *</span>
              <select required value={neighborhoodId} onChange={(event) => setNeighborhoodId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="">Sélectionnez votre quartier</option>
                {LIBREVILLE_ZONE_GROUPS.map((group) => (
                  <optgroup key={group.zoneName} label={group.zoneName}>
                    {group.neighborhoods.map((neighborhood) => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Adresse détaillée / repère</span>
              <input maxLength={250} value={deliveryInstructions} onChange={(event) => setDeliveryInstructions(event.target.value)} placeholder="Ex. : avenue, rue, bâtiment, près de…" className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <span className="mt-1 block text-[11px] text-slate-500">Cette adresse sera proposée automatiquement pour vos prochaines commandes.</span>
            </label>
            <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-blue-800">Adresse enregistrée</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{addressPreview}</p>
            </div>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Téléphone de connexion</span>
              <input value={user.phone} readOnly className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500" />
              <span className="mt-1 block text-[11px] text-slate-500">Le numéro sert à vous connecter. Pour le modifier, contactez l’équipe Gloryday Pharma.</span>
            </label>
          </div>

          {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800">{errorMessage}</p>}
          {successMessage && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{successMessage}</p>}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Fermer</button>
            <button type="submit" disabled={isSaving || isProcessingPhoto} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d44e8] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Enregistrement…' : 'Enregistrer mon profil'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
