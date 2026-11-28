import React, { useEffect, useRef, useState } from 'react';
import { Building2, Camera, CheckCircle2, ImagePlus, KeyRound, LoaderCircle, MapPin, MapPinned, Phone, Save, ShieldCheck, UserRound, X } from 'lucide-react';
import type { FacilityType, User } from '../types';
import { api } from '../api';
import { processAvatarFile } from '../utils/avatarImage';
import {
  detectNeighborhoodFromAddress,
  extractDeliveryInstructions,
  getNeighborhoodById,
} from '../data/librevilleZones';
import { GabonLocationPicker } from './GabonLocationPicker';
import { buildGabonDeliveryAddress, getNeighborhoodLocality, isGrandLibrevilleLocality } from '../data/gabonLocations';

interface ClientProfileModalProps {
  user: User;
  onClose: () => void;
  onProfileUpdated?: (user: User) => void;
  initialSection?: ClientProfileSection;
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

const PROFILE_SECTIONS = [
  { id: 'facility', label: 'Établissement', icon: Building2 },
  { id: 'contacts', label: 'Coordonnées', icon: Phone },
  { id: 'address', label: 'Adresse', icon: MapPinned },
  { id: 'security', label: 'Sécurité', icon: ShieldCheck },
] as const;

export type ClientProfileSection = (typeof PROFILE_SECTIONS)[number]['id'];

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({ user, onClose, onProfileUpdated, initialSection = 'facility' }) => {
  const initialNeighborhood = user.neighborhoodId && getNeighborhoodById(user.neighborhoodId)
    ? user.neighborhoodId
    : detectNeighborhoodFromAddress(user.deliveryAddress || '')?.id || '';
  const [city, setCity] = useState(user.city || (initialNeighborhood ? getNeighborhoodLocality(initialNeighborhood) : 'Libreville'));
  const [neighborhoodName, setNeighborhoodName] = useState(user.neighborhoodName || '');
  const [facilityName, setFacilityName] = useState(user.facilityName || '');
  const [contactName, setContactName] = useState(user.contactName || '');
  const [directorName, setDirectorName] = useState(user.directorName || '');
  const [companyPhone, setCompanyPhone] = useState(user.companyPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(user.secondaryPhone || '');
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ClientProfileSection>(initialSection);
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
      setActiveSection('facility');
      setErrorMessage('Le nom de votre établissement est obligatoire.');
      return;
    }
    const hasValidLocation = isGrandLibrevilleLocality(city)
      ? Boolean(neighborhoodId && getNeighborhoodById(neighborhoodId))
      : Boolean(city.trim() && neighborhoodName.trim());
    if (!hasValidLocation) {
      setActiveSection('address');
      setErrorMessage('Choisissez votre ville et votre quartier.');
      return;
    }

    setIsSaving(true);
    try {
      const profileData: Parameters<typeof api.updateClientProfile>[0] = {
        facilityName: facilityName.trim(),
        contactName: contactName.trim(),
        directorName: directorName.trim(),
        companyPhone: companyPhone.trim(),
        secondaryPhone: secondaryPhone.trim(),
        facilityType,
        facilityTypeOther: facilityType === 'Autre' ? facilityTypeOther.trim() : '',
        city: city.trim(),
        neighborhoodId: isGrandLibrevilleLocality(city) ? neighborhoodId : '',
        neighborhoodName: isGrandLibrevilleLocality(city) ? (getNeighborhoodById(neighborhoodId)?.name || '') : neighborhoodName.trim(),
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

  const handleChangePassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (newPassword.length < 8 || newPassword.length > 85) {
      setErrorMessage('Le nouveau mot de passe doit contenir entre 8 et 85 caractères.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.changeClientPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMessage('Votre mot de passe a été modifié.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Le mot de passe n’a pas pu être modifié. Réessayez.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const selectedNeighborhood = getNeighborhoodById(neighborhoodId);
  const selectedNeighborhoodName = isGrandLibrevilleLocality(city) ? selectedNeighborhood?.name || '' : neighborhoodName;
  const addressPreview = selectedNeighborhoodName
    ? buildGabonDeliveryAddress(city, selectedNeighborhoodName, deliveryInstructions, isGrandLibrevilleLocality(city) ? neighborhoodId : undefined)
    : city
      ? `${city} · choisissez un quartier pour compléter l’adresse`
      : user.deliveryAddress || 'Votre adresse sera ajoutée à la prochaine commande.';

  const activeSectionLabel = PROFILE_SECTIONS.find(section => section.id === activeSection)?.label || 'Établissement';

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-white" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-profile-title"
        className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-white"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">Espace client</p>
            <h2 id="client-profile-title" className="mt-1 text-xl font-black text-slate-900">Profil & coordonnées</h2>
            <p className="mt-1 text-xs text-slate-500">{activeSectionLabel} · vos informations Gloryday</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={isSaving} aria-label="Fermer le profil" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav aria-label="Rubriques du profil" role="tablist" className="grid shrink-0 grid-cols-2 gap-1.5 border-b border-slate-100 bg-white p-3 sm:grid-cols-4 sm:px-8">
          {PROFILE_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`client-profile-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activeSection === id}
              aria-controls="client-profile-panel"
              onClick={() => { setActiveSection(id); setErrorMessage(null); setSuccessMessage(null); }}
              disabled={isSaving}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${activeSection === id ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-100' : 'text-slate-600 hover:bg-white/80'} disabled:opacity-60`}
            >
              <Icon className="h-4 w-4 shrink-0" />{label}
            </button>
          ))}
        </nav>

        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <div id="client-profile-panel" role="tabpanel" aria-labelledby={`client-profile-tab-${activeSection}`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-7">
            {activeSection === 'facility' && (
              <div className="space-y-5">
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-2xl font-black text-emerald-900">
                    {avatarUrl ? <img src={avatarUrl} alt="Photo de profil de l’établissement" className="h-full w-full object-cover" /> : facilityName.charAt(0).toUpperCase() || <Building2 className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">Logo ou photo</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Identifiez votre clinique, pharmacie ou laboratoire.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => galleryRef.current?.click()} disabled={isProcessingPhoto || isSaving} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><ImagePlus className="h-3.5 w-3.5" />Galerie</button>
                      <button type="button" onClick={() => cameraRef.current?.click()} disabled={isProcessingPhoto || isSaving} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><Camera className="h-3.5 w-3.5" />Photo</button>
                      {avatarUrl && <button type="button" onClick={() => { setAvatarUrl(null); setAvatarChanged(true); setSuccessMessage(null); }} disabled={isSaving} className="px-1 text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50">Retirer</button>}
                    </div>
                    {isProcessingPhoto && <p role="status" className="mt-1 text-xs text-emerald-800">Préparation de la photo…</p>}
                    <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                    <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handlePhotoChange} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">Nom de l’établissement *</span>
                    <input required maxLength={120} value={facilityName} onChange={(event) => setFacilityName(event.target.value)} placeholder="Ex. : Clinique Sainte-Marie" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">Type d’établissement</span>
                    <select value={facilityType} onChange={(event) => setFacilityType(event.target.value as FacilityType)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                      {FACILITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  {facilityType === 'Autre' && <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700">Précisez le type</span><input maxLength={120} value={facilityTypeOther} onChange={(event) => setFacilityTypeOther(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>}
                </div>
              </div>
            )}

            {activeSection === 'contacts' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50/70 p-4">
                  <p className="text-sm font-extrabold text-emerald-950">Qui devons-nous joindre ?</p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-900/80">Le numéro de connexion identifie votre compte. Les autres numéros servent aux échanges et à la livraison.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Responsable à contacter</span><input maxLength={120} value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Nom et prénom" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Directeur / direction</span><input maxLength={120} value={directorName} onChange={(event) => setDirectorName(event.target.value)} placeholder="Nom ou fonction" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Téléphone de l’établissement</span><input type="tel" inputMode="tel" maxLength={32} value={companyPhone} onChange={(event) => setCompanyPhone(event.target.value)} placeholder="Numéro de la clinique ou pharmacie" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Autre numéro (facultatif)</span><input type="tel" inputMode="tel" maxLength={32} value={secondaryPhone} onChange={(event) => setSecondaryPhone(event.target.value)} placeholder="Ex. +241 06 12 34 56" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /><span className="mt-1 block text-[11px] leading-relaxed text-slate-500">À utiliser si le contact principal ne répond pas.</span></label>
                  <label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-700">Numéro de connexion</span><input type="tel" value={user.phone} readOnly aria-describedby="client-login-phone-help" className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600" /><span id="client-login-phone-help" className="mt-1 block text-[11px] leading-relaxed text-slate-500">Ce numéro sert à ouvrir votre compte. Pour le changer, l’équipe doit d’abord vérifier le nouveau numéro.</span></label>
                </div>
              </div>
            )}

            {activeSection === 'address' && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-emerald-50/70 p-4">
                  <p className="text-sm font-extrabold text-emerald-950">Adresse de livraison habituelle</p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-900/80">Elle sera proposée lors de vos prochaines commandes et restera modifiable à chaque livraison.</p>
                </div>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700"><MapPin className="h-3.5 w-3.5 text-emerald-800" />Ville et quartier *</span>
                  <GabonLocationPicker idPrefix="client-profile" city={city} neighborhoodName={neighborhoodName} neighborhoodId={neighborhoodId} onCityChange={(nextCity) => { setCity(nextCity); setNeighborhoodId(''); setNeighborhoodName(''); }} onNeighborhoodNameChange={setNeighborhoodName} onNeighborhoodIdChange={setNeighborhoodId} />
                </label>
                <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Adresse détaillée ou repère</span><input maxLength={250} value={deliveryInstructions} onChange={(event) => setDeliveryInstructions(event.target.value)} placeholder="Rue, avenue, bâtiment ou repère proche" className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3.5" aria-live="polite">
                  <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">Aperçu de l’adresse</p>
                  <p className="mt-1.5 flex items-start gap-2 text-sm font-semibold leading-relaxed text-slate-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{addressPreview}</p>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-labelledby="client-password-title">
                <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-emerald-800" /><h3 id="client-password-title" className="text-sm font-extrabold text-slate-900">Changer le mot de passe</h3></div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">Saisissez l’ancien mot de passe puis le nouveau. Il ne sera jamais affiché ni prérempli.</p>
                <div className="mt-4 space-y-3">
                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Mot de passe actuel</span><input type="password" autoComplete="current-password" minLength={8} maxLength={85} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Nouveau mot de passe</span><input type="password" autoComplete="new-password" minLength={8} maxLength={85} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Confirmer le nouveau mot de passe</span><input type="password" autoComplete="new-password" minLength={8} maxLength={85} value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
                </div>
                <button type="button" onClick={() => void handleChangePassword()} disabled={isChangingPassword || isSaving || currentPassword.length < 8 || newPassword.length < 8 || confirmNewPassword.length < 8} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
                  {isChangingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{isChangingPassword ? 'Modification…' : 'Modifier le mot de passe'}
                </button>
              </section>
            )}

            {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-800">{errorMessage}</p>}
            {successMessage && <p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{successMessage}</p>}
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="hidden text-xs text-slate-500 sm:block"><UserRound className="mr-1 inline h-3.5 w-3.5" />Modifiez une rubrique à la fois.</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={isSaving || isChangingPassword} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Fermer</button>
              <button type="submit" disabled={isSaving || isProcessingPhoto || isChangingPassword} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSaving ? 'Enregistrement…' : 'Enregistrer le profil'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
};
