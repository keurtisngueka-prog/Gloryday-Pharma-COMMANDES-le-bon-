import React, { useState } from 'react';
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
  Compass
} from 'lucide-react';
import { api } from '../api';
import { User, AppRole, FacilityType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'guest_choice' | 'login' | 'register' | 'admin' | 'google_complete';
}

const GoogleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'guest_choice'
}) => {
  const [mode, setMode] = useState<'guest_choice' | 'login' | 'register' | 'admin' | 'google_complete'>(initialMode);
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('Clinique');
  const [deliveryAddress, setDeliveryAddress] = useState('Libreville, Gabon');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [password, setPassword] = useState('');
  const [adminIdentifier, setAdminIdentifier] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('Super-Admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Sign-In state & profile
  const [googleProfile, setGoogleProfile] = useState<{
    email: string;
    name: string;
    avatarUrl?: string;
  }>({
    email: 'chidisstore3@gmail.com',
    name: 'Responsable Établissement',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  });
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

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
      () => {
        setLocating(false);
        setError('Impossible d accéder aux coordonnées GPS. Veuillez préciser votre quartier manuellement.');
      },
      { timeout: 8000 }
    );
  };

  const handleGoogleSignIn = async (customEmail?: string) => {
    setError(null);
    setLoading(true);
    const targetEmail = (customEmail || (showCustomGoogleInput && googleCustomEmail.trim()) || googleProfile.email).trim().toLowerCase();
    const targetName = googleProfile.name || 'Responsable Pharmacie';
    const profile = {
      email: targetEmail,
      name: targetName,
      avatarUrl: googleProfile.avatarUrl
    };

    try {
      const res = await api.loginWithGoogle(profile);
      if (res.isNewUser) {
        // Needs clinical establishment completion
        setGoogleProfile(profile);
        setMode('google_complete');
      } else if (res.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la connexion avec Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!facilityName.trim()) {
      setError('Veuillez renseigner le nom de votre établissement de santé.');
      return;
    }
    if (!phone.trim()) {
      setError('Veuillez renseigner votre numéro de téléphone gabonais (+241).');
      return;
    }

    try {
      setLoading(true);
      const res = await api.completeGoogleRegistration({
        email: googleProfile.email,
        name: contactName.trim() || googleProfile.name,
        avatarUrl: googleProfile.avatarUrl,
        facilityName: facilityName.trim(),
        phone: phone.trim(),
        contactName: contactName.trim() || googleProfile.name,
        facilityType,
        deliveryAddress: deliveryAddress.trim() || 'Libreville, Gabon',
        coordinates: coordinates || undefined
      });
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l enregistrement de votre profil clinique.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone || !facilityName || !password) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.register({
        phone,
        facilityName,
        contactName,
        facilityType,
        password,
        deliveryAddress,
        coordinates: coordinates || undefined
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
      const res = await api.adminLogin(adminIdentifier, adminPassword, selectedRole);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Identifiants administrateur incorrects.');
    } finally {
      setLoading(false);
    }
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

          {/* GUEST CHOICE */}
          {mode === 'guest_choice' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 mb-1">
                Accédez à vos commandes et approvisionnements médicaux :
              </p>

              {/* 1-CLICK GOOGLE SIGN IN BUTTON */}
              <div className="p-3 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 space-y-2">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn()}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer relative"
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Continuer avec Google</span>
                  <span className="hidden sm:inline-block text-[11px] text-slate-400 font-normal">
                    ({googleProfile.email})
                  </span>
                </button>

                <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                  <span>⚡ 1-Clic rapide & sécurisé</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(!showCustomGoogleInput)}
                    className="text-[#0d44e8] hover:underline font-semibold"
                  >
                    {showCustomGoogleInput ? 'Masquer' : 'Autre compte Google ?'}
                  </button>
                </div>

                {showCustomGoogleInput && (
                  <div className="pt-2 border-t border-blue-100 flex gap-2">
                    <input
                      type="email"
                      placeholder="votre.email@gmail.com"
                      value={googleCustomEmail}
                      onChange={(e) => setGoogleCustomEmail(e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleGoogleSignIn(googleCustomEmail)}
                      disabled={!googleCustomEmail.trim()}
                      className="px-3 py-2 rounded-lg bg-[#0d44e8] hover:bg-[#0b3ac7] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      Valider
                    </button>
                  </div>
                )}
              </div>

              {/* GUEST ACCESS */}
              <button
                type="button"
                onClick={onClose}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Continuer en invité, sans compte
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Consultez le catalogue, composez le panier et commandez directement sur WhatsApp.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <div className="relative py-1 flex items-center justify-center">
                <span className="h-px bg-slate-200 w-full absolute"></span>
                <span className="bg-white px-3 text-[10px] font-bold text-slate-400 relative uppercase">
                  Ou compte classique par mot de passe
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
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Créer un compte
                </button>
              </div>

              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setMode('admin'); setError(null); }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Espace Collaborateur & Direction Gloryday</span>
                </button>
              </div>
            </div>
          )}

          {/* GOOGLE PROFILE COMPLETION (FOR NEW GOOGLE USERS) */}
          {mode === 'google_complete' && (
            <form onSubmit={handleCompleteGoogleProfile} className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-center gap-3">
                <img
                  src={googleProfile.avatarUrl}
                  alt={googleProfile.name}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-xs object-cover"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-sm">{googleProfile.name}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Google Vérifié
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">{googleProfile.email}</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
                Pour éditer vos devis, bons de commande officiels et assurer la livraison express au Gabon, veuillez préciser votre établissement de santé :
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nom de l'établissement de santé *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Clinique Ste-Marie, Pharmacie du Bord de Mer, Polyclinique..."
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8] bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Type d'établissement
                  </label>
                  <select
                    value={facilityType}
                    onChange={(e: any) => setFacilityType(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 font-semibold bg-white text-xs"
                  >
                    <option value="Clinique">Clinique</option>
                    <option value="Polyclinique">Polyclinique</option>
                    <option value="Hôpital">Hôpital</option>
                    <option value="Laboratoire">Laboratoire</option>
                    <option value="Pharmacie">Pharmacie</option>
                    <option value="Cabinet médical">Cabinet médical</option>
                    <option value="Autre">Autre structure</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Téléphone Gabon (+241) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="+241 77 00 11 22"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8] bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nom du responsable / Contact
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dr. Mengue / Major de Bloc"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 uppercase">
                    Quartier & Adresse de livraison
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={locating}
                    className="text-[#0d44e8] font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    {locating ? 'GPS...' : 'Détecter GPS'}
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Quartier (ex: Batterie 4, Louis, Glass, Libreville...)"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                {coordinates && (
                  <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
                    <MapPin className="w-3 h-3" />
                    GPS capturé : {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Création du profil...' : 'Valider & Ouvrir mon Espace Client'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('guest_choice'); setError(null); }}
                  className="text-slate-500 hover:text-slate-700 text-xs"
                >
                  Annuler et revenir au choix
                </button>
              </div>
            </form>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Direct Google Button in Login Form */}
              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                disabled={loading}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <GoogleIcon className="w-4 h-4 shrink-0" />
                <span>Connexion directe en 1-Clic avec Google</span>
              </button>

              <div className="relative py-1 flex items-center justify-center">
                <span className="h-px bg-slate-200 w-full absolute"></span>
                <span className="bg-white px-2 text-[10px] font-bold text-slate-400 relative uppercase">
                  Ou avec vos identifiants
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+241 77 003 004"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#0d44e8]"
                  />
                </div>
              </div>

              {/* Pre-configured Demo Accounts Helper */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
                  Comptes de test enregistrés :
                </span>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPhone('+24177001122');
                      setPassword('client123');
                      setError(null);
                    }}
                    className="text-left py-1 px-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">Clinique Ste-Marie</span>
                    <span className="text-[10px] font-mono text-slate-500">+24177001122 / client123</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhone('+24166334455');
                      setPassword('pharma123');
                      setError(null);
                    }}
                    className="text-left py-1 px-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">Pharmacie du Bord de Mer</span>
                    <span className="text-[10px] font-mono text-slate-500">+24166334455 / pharma123</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs shadow-md cursor-pointer"
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
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-0.5">
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Clinique Ste Marie, Polyclinique..."
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-0.5">
                  Type d'établissement
                </label>
                <select
                  value={facilityType}
                  onChange={(e: any) => setFacilityType(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 font-semibold"
                >
                  <option value="Clinique">Clinique</option>
                  <option value="Polyclinique">Polyclinique</option>
                  <option value="Hôpital">Hôpital</option>
                  <option value="Laboratoire">Laboratoire d'analyses</option>
                  <option value="Pharmacie">Pharmacie</option>
                  <option value="Cabinet médical">Cabinet médical</option>
                  <option value="Autre">Autre structure</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-0.5">
                  Responsable / Contact
                </label>
                <input
                  type="text"
                  placeholder="Dr. / Mme / M."
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
                  className="w-full p-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="font-bold text-slate-700 uppercase">
                    Localisation de livraison
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
                  placeholder="Ville, quartier (ex: Libreville, Mont-Bouët...)"
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
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs shadow-md cursor-pointer mt-1"
              >
                {loading ? 'Création...' : 'Créer mon compte'}
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
          )}

          {/* ADMIN & STAFF LOGIN */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-3.5 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-950 text-[11px] leading-relaxed">
                <div className="font-bold mb-0.5 flex items-center gap-1.5 text-purple-900">
                  <Lock className="w-3.5 h-3.5 text-purple-700" />
                  Espace Réservé : Collaborateurs & Direction Gloryday
                </div>
                Identifiez-vous pour accéder au back-office, à la gestion des commandes, des devis et aux droits opérationnels.
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Email ou Identifiant Administrateur
                </label>
                <input
                  type="text"
                  required
                  placeholder="admin ou admin@glorydaypharma.ga"
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mot de passe Administrateur
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mot de passe (admin)"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Poste / Rôle à activer :
                </label>
                <select
                  value={selectedRole}
                  onChange={(e: any) => setSelectedRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-purple-300 font-bold text-purple-950 bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  <option value="Super-Admin">Super-Admin (Direction Générale)</option>
                  <option value="Commercial">Commercial (Devis & Relances)</option>
                  <option value="Gestionnaire Catalogue">Gestionnaire Catalogue (Produits & Stocks)</option>
                  <option value="Logistique">Logistique (Expéditions & Livraisons)</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                💡 <strong>Accès par défaut :</strong> Identifiant <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono text-purple-900 font-bold">admin</code> (ou <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono text-purple-900 font-bold">admin@glorydaypharma.ga</code>) · Mot de passe : <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono text-purple-900 font-bold">admin</code>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold shadow-md cursor-pointer transition-colors"
              >
                {loading ? 'Authentification...' : `S'identifier & Ouvrir la session [${selectedRole}]`}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('guest_choice'); setError(null); }}
                  className="text-slate-500 hover:text-slate-800 font-medium"
                >
                  Retour à l'accueil
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
