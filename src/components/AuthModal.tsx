import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  Phone, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Compass,
  Briefcase,
  Users,
  ShieldCheck,
  Info,
  Eye,
  EyeOff,
  RotateCcw,
  HelpCircle
} from 'lucide-react';
import { api } from '../api';
import { User, AppRole, FacilityType, JobTitle, HealthcareStructure } from '../types';
import { 
  getHealthcareStructures, 
  canAddAccountToStructure, 
  getDefaultQuotaForFacilityType 
} from '../utils/structureStorage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'guest_choice' | 'login' | 'register' | 'admin' | 'forgot_password';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'guest_choice'
}) => {
  const [mode, setMode] = useState<'guest_choice' | 'login' | 'register' | 'admin' | 'forgot_password'>(initialMode);
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('Clinique');
  const [deliveryAddress, setDeliveryAddress] = useState('Libreville');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-account structure & job title states
  const [structuresList, setStructuresList] = useState<HealthcareStructure[]>(() => getHealthcareStructures());
  const [structureMode, setStructureMode] = useState<'existing' | 'new'>('existing');
  const [selectedStructureId, setSelectedStructureId] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<JobTitle>('charge_commandes');

  useEffect(() => {
    if (isOpen) {
      const list = getHealthcareStructures();
      setStructuresList(list);
      if (list.length > 0 && !selectedStructureId) {
        setSelectedStructureId(list[0].id);
        setFacilityName(list[0].name);
        setFacilityType(list[0].type);
        if (list[0].deliveryAddress) setDeliveryAddress(list[0].deliveryAddress);
      }
    }
  }, [isOpen]);

  const handleSelectStructure = (id: string) => {
    setSelectedStructureId(id);
    const found = structuresList.find(s => s.id === id);
    if (found) {
      setFacilityName(found.name);
      setFacilityType(found.type);
      if (found.deliveryAddress) setDeliveryAddress(found.deliveryAddress);
    }
  };

  if (!isOpen) return null;

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n est pas supportée par votre navigateur.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError('Impossible d accéder aux coordonnées GPS. Veuillez préciser votre quartier manuellement.');
      },
      { timeout: 8000 }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const finalFacilityName = structureMode === 'existing' 
      ? (structuresList.find(s => s.id === selectedStructureId)?.name || facilityName)
      : facilityName;

    if (!phone || !finalFacilityName || !password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    // Client-side quota guard
    if (structureMode === 'existing' && selectedStructureId) {
      const quotaCheck = canAddAccountToStructure(selectedStructureId);
      if (!quotaCheck.allowed) {
        setError(quotaCheck.reason || 'Quota de comptes atteint pour cette structure.');
        return;
      }
    }

    try {
      setLoading(true);
      const res = await api.register({
        phone,
        facilityName: finalFacilityName,
        contactName,
        facilityType,
        password,
        deliveryAddress,
        coordinates: coordinates || undefined,
        structureId: structureMode === 'existing' ? selectedStructureId : undefined,
        jobTitle
      });
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l inscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone || !password) {
      setError('Veuillez renseigner votre téléphone et mot de passe.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.login(phone, password);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Échec de connexion. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!adminIdentifier || !adminPassword) {
      setError('Veuillez renseigner votre identifiant et mot de passe administrateur.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.adminLogin(adminIdentifier, adminPassword);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Identifiants administrateur incorrects.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!resetIdentifier) {
      setError('Veuillez saisir votre numéro de téléphone ou votre identifiant.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.resetPassword(resetIdentifier, newPassword);
      setSuccessNotice('Mot de passe mis à jour avec succès ! Connexion en cours...');
      setTimeout(() => {
        onSuccess(res.user);
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemoData = () => {
    api.resetDemoAccounts();
    setSuccessNotice('Identifiants de démonstration réinitialisés. Mot de passe : client123 (Cliniques) / pharma123 (Pharmacie).');
    setError(null);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="bg-[#0f0f12] text-white p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-[#0d44e8] flex items-center justify-center mb-2 text-white font-bold text-sm">
            +
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight">Gloryday Pharma Gabon</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Commandes médicales pour cliniques, hôpitaux & officines
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* GUEST CHOICE */}
          {mode === 'guest_choice' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 mb-2">
                Accédez à vos fournitures médicales directement avec ou sans compte :
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-[#0d44e8] text-xs sm:text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0d44e8]" />
                    Continuer en invité, sans compte
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Consultez les 215 articles, composez le panier et commandez sur WhatsApp.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#0d44e8]" />
              </button>

              <div className="relative py-2 flex items-center justify-center">
                <span className="h-px bg-slate-200 w-full absolute"></span>
                <span className="bg-white px-3 text-[10px] font-bold text-slate-400 relative uppercase">
                  Ou connectez-vous
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-slate-500" />
                  Se connecter
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="py-2.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Créer un compte
                </button>
              </div>

              <div className="pt-3 text-center border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => { setMode('admin'); setError(null); }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Espace Collaborateur & Administration</span>
                </button>
              </div>
            </div>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+241 77 003 004 ou 074001122"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Formats acceptés : 074001122, 74001122, +241 74 00 11 22
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(phone);
                      setMode('forgot_password');
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-[11px] text-[#0d44e8] hover:underline font-semibold cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              {/* Pre-configured Demo Accounts Helper */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                    Comptes de démonstration :
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDemoData}
                    title="Réinitialiser les comptes de test et mots de passe par défaut"
                    className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold cursor-pointer hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Réinitialiser</span>
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPhone('+24174001122');
                      setPassword('client123');
                      setError(null);
                    }}
                    className="text-left py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-purple-400 hover:text-purple-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <span>Polyclinique El Rapha</span>
                        <span className="text-[9px] px-1 py-0.2 bg-purple-100 text-purple-800 rounded font-bold">Directrice</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Dr. Jeanne Mengue · Pass: <span className="font-mono text-purple-700 font-bold">client123</span></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">+24174001122</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhone('+24177556677');
                      setPassword('client123');
                      setError(null);
                    }}
                    className="text-left py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <span>Polyclinique El Rapha</span>
                        <span className="text-[9px] px-1 py-0.2 bg-blue-100 text-[#0d44e8] rounded font-bold">Chargé commandes</span>
                      </div>
                      <div className="text-[10px] text-slate-500">M. Paul Bongo · Pass: <span className="font-mono text-blue-700 font-bold">client123</span></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">+24177556677</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhone('+24177001122');
                      setPassword('client123');
                      setError(null);
                    }}
                    className="text-left py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <span>Clinique Chambrier</span>
                        <span className="text-[9px] px-1 py-0.2 bg-purple-100 text-purple-800 rounded font-bold">Directeur</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Dr. Marcel Chambrier · Pass: <span className="font-mono text-purple-700 font-bold">client123</span></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">+24177001122</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhone('+24166334455');
                      setPassword('pharma123');
                      setError(null);
                    }}
                    className="text-left py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Grande Pharmacie des Forestiers</div>
                      <div className="text-[10px] text-slate-500">Dr. Obame · Pass: <span className="font-mono text-emerald-700 font-bold">pharma123</span></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">+24166334455</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="text-[#0d44e8] hover:underline font-bold"
                >
                  Créer un compte
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('guest_choice'); setError(null); }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Retour
                </button>
              </div>
            </form>
          )}

          {/* REGISTER */}
          {mode === 'register' && (() => {
            const quotaStatus = structureMode === 'existing' && selectedStructureId 
              ? canAddAccountToStructure(selectedStructureId) 
              : null;
            const isQuotaExceeded = quotaStatus && !quotaStatus.allowed;

            return (
              <form onSubmit={handleRegister} className="space-y-3 text-xs">
                {/* 1. RATTACHEMENT STRUCTURE */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#0d44e8]" />
                      <span>Établissement de santé *</span>
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setStructureMode('existing');
                          if (structuresList.length > 0) {
                            handleSelectStructure(structuresList[0].id);
                          }
                        }}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                          structureMode === 'existing' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Existant
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStructureMode('new');
                          setFacilityName('');
                        }}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                          structureMode === 'new' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        + Nouveau
                      </button>
                    </div>
                  </div>

                  {structureMode === 'existing' ? (
                    <div className="space-y-1.5">
                      <select
                        value={selectedStructureId}
                        onChange={(e) => handleSelectStructure(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 font-semibold bg-white text-xs"
                      >
                        {structuresList.map(s => {
                          const qs = canAddAccountToStructure(s.id);
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.type} · {qs.currentCount}/{qs.maxAccounts} comptes)
                            </option>
                          );
                        })}
                      </select>

                      {/* Quota Indicator */}
                      {quotaStatus && (
                        <div className={`p-2 rounded-lg text-[11px] flex items-center justify-between border ${
                          isQuotaExceeded 
                            ? 'bg-rose-50 border-rose-200 text-rose-800' 
                            : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                        }`}>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>Capacité structure :</span>
                          </span>
                          <span className="font-bold">
                            {quotaStatus.currentCount} / {quotaStatus.maxAccounts} comptes utilisés
                          </span>
                        </div>
                      )}

                      {isQuotaExceeded && (
                        <div className="p-2.5 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-900 text-[11px] flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Limite atteinte :</strong> Cet établissement a atteint son quota maximal de {quotaStatus.maxAccounts} comptes. Veuillez contacter l'administrateur Gloryday ou votre direction pour étendre le quota.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        placeholder="Ex: Clinique du Littoral, Hôpital d'Arrondissement..."
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300"
                      />

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          Type de structure
                        </label>
                        <select
                          value={facilityType}
                          onChange={(e: any) => setFacilityType(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 font-semibold bg-white"
                        >
                          <option value="Clinique">Clinique (Plafond 3 comptes)</option>
                          <option value="Polyclinique">Polyclinique (Plafond 5 comptes)</option>
                          <option value="Hôpital">Hôpital / CHU (Plafond 10 comptes)</option>
                          <option value="Laboratoire">Laboratoire (Plafond 3 comptes)</option>
                          <option value="Pharmacie">Pharmacie (Plafond 3 comptes)</option>
                          <option value="Cabinet médical">Cabinet médical (Plafond 3 comptes)</option>
                          <option value="Autre">Autre établissement (Plafond 3 comptes)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. CHOIX DU POSTE / FONCTION */}
                <div>
                  <label className="block font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#0d44e8]" />
                    <span>Votre poste au sein de la structure *</span>
                  </label>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setJobTitle('charge_commandes')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        jobTitle === 'charge_commandes'
                          ? 'border-[#0d44e8] bg-blue-50/70 text-[#0d44e8] font-bold ring-1 ring-[#0d44e8]'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">Chargé de cdes</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Achats & stocks</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setJobTitle('docteur')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        jobTitle === 'docteur'
                          ? 'border-[#0d44e8] bg-blue-50/70 text-[#0d44e8] font-bold ring-1 ring-[#0d44e8]'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">Docteur</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Prescriptions</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setJobTitle('directeur')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        jobTitle === 'directeur'
                          ? 'border-purple-600 bg-purple-50/70 text-purple-800 font-bold ring-1 ring-purple-600'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">Directeur</div>
                      <div className="text-[9px] text-purple-600 font-semibold mt-0.5">Supervision</div>
                    </button>
                  </div>

                  {/* Notice validation si directeur */}
                  {jobTitle === 'directeur' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Validation administrative requise</span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        Le compte est créé immédiatement comme compte client. <strong>L'accès au tableau de bord consolidé</strong> réunissant tous les achats de votre établissement sera activé après vérification par l'administrateur Gloryday.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. CONTACT & COORDONNÉES */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-0.5">
                    Nom & Prénom du responsable *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dr. Ondo ou M. Bongo"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-0.5">
                    Téléphone WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+241 77 003 004"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="font-bold text-slate-700 uppercase">
                      Adresse de livraison
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectGps}
                      disabled={locating}
                      className="text-[#0d44e8] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      {locating ? 'GPS...' : 'Détecter GPS'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Quartier, repère (ex: Batterie 4, Libreville)"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300"
                  />
                  {coordinates && (
                    <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
                      <MapPin className="w-3 h-3" />
                      GPS capturé : {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-0.5">
                    Mot de passe (min. 6 car.) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !!isQuotaExceeded}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md mt-1 cursor-pointer transition-all ${
                    isQuotaExceeded
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#0d44e8] hover:bg-[#0b3ac7] text-white'
                  }`}
                >
                  {loading ? 'Création...' : isQuotaExceeded ? 'Quota de comptes atteint' : 'Créer mon compte'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="text-[#0d44e8] hover:underline font-bold"
                  >
                    Déjà un compte ? Se connecter
                  </button>
                </div>
              </form>
            );
          })()}

          {/* ADMIN & STAFF LOGIN */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-3.5 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-950 text-[11px] leading-relaxed">
                <div className="font-bold mb-0.5 flex items-center gap-1.5 text-purple-900">
                  <Lock className="w-3.5 h-3.5 text-purple-700" />
                  Espace Collaborateur & Direction Gloryday
                </div>
                Identifiez-vous pour accéder au back-office, au catalogue, aux commandes et aux outils opérationnels.
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Email ou Identifiant Administrateur
                </label>
                <input
                  type="text"
                  required
                  placeholder="Email ou identifiant (ex: direction@glorydaypharma.ga)"
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mot de passe Administrateur
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    placeholder="Mot de passe sécurisé"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showAdminPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier(adminIdentifier);
                      setMode('forgot_password');
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-[11px] text-purple-700 hover:underline font-semibold cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              {/* Staff quick preset buttons */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                  Accès rapides démonstration collaborateurs :
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminIdentifier('direction@glorydaypharma.ga');
                      setAdminPassword('Gloryday@2026');
                      setError(null);
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-purple-900 text-[10px]">Direction Générale</div>
                    <div className="text-[9px] text-slate-500">Super-Admin</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminIdentifier('commercial@glorydaypharma.ga');
                      setAdminPassword('Gloryday@2026');
                      setError(null);
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-blue-900 text-[10px]">Commercial</div>
                    <div className="text-[9px] text-slate-500">Devis & Ventes</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminIdentifier('stock@glorydaypharma.ga');
                      setAdminPassword('Gloryday@2026');
                      setError(null);
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-amber-900 text-[10px]">Gestion Stock</div>
                    <div className="text-[9px] text-slate-500">Catalogue & Lots</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminIdentifier('logistique@glorydaypharma.ga');
                      setAdminPassword('Gloryday@2026');
                      setError(null);
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-500 hover:bg-purple-50 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-emerald-900 text-[10px]">Logistique</div>
                    <div className="text-[9px] text-slate-500">Expéditions Libreville</div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold shadow-md cursor-pointer transition-colors mt-1"
              >
                {loading ? 'Authentification...' : "S'identifier & Ouvrir la session"}
              </button>

              <div className="text-center pt-1 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-purple-700 hover:underline font-semibold cursor-pointer"
                >
                  Espace Client
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('guest_choice'); setError(null); }}
                  className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Retour accueil
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD / RESET PASSWORD */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-950 text-[11px] leading-relaxed">
                <div className="font-bold mb-0.5 flex items-center gap-1.5 text-blue-900">
                  <KeyRound className="w-3.5 h-3.5 text-[#0d44e8]" />
                  Réinitialisation sécurisée du mot de passe
                </div>
                Entrez votre numéro de téléphone (ou email) et définissez directement votre nouveau mot de passe.
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Téléphone ou Identifiant
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: 074001122 ou direction@glorydaypharma.ga"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Formats acceptés : 074001122, +241 74 00 11 22, email collaborateur
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nouveau mot de passe (min. 6 caractères)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Votre nouveau mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Répétez le mot de passe"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour & Me connecter'}
              </button>

              <div className="text-center pt-1 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-[#0d44e8] hover:underline font-semibold cursor-pointer"
                >
                  Retour à la connexion
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('guest_choice'); setError(null); }}
                  className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
