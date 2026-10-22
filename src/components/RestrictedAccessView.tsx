import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, LogIn, AlertCircle, Phone, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface RestrictedAccessViewProps {
  requestedTab: string;
  currentUser: User | null;
  onOpenAuth: () => void;
  onReturnToCatalog: () => void;
}

export const RestrictedAccessView: React.FC<RestrictedAccessViewProps> = ({
  requestedTab,
  currentUser,
  onOpenAuth,
  onReturnToCatalog
}) => {
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'admin':
        return 'Tableau de Bord & Métriques Super-Admin';
      case 'admin-orders':
        return 'Colisage, Expéditions & Suivi Global';
      case 'admin-catalog':
        return 'Gestion des Produits & Tarifs Grossiste';
      case 'admin-deploy':
        return 'Sauvegardes, Export & Déploiement';
      default:
        return 'Zone Administrative Restreinte';
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Security Header Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            Accès Réservé · Sécurité Médicale & Commerciale
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Gloryday Pharma</span>
        </div>

        {/* Main Alert Block */}
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Accès Restreint aux Administrateurs
            </h1>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              La section <strong className="text-slate-900 font-bold">« {getTabLabel(requestedTab)} »</strong> est strictement protégée et réservée aux membres de la direction générale de Gloryday Pharma possédant les droits <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 font-mono text-xs font-bold">Super-Admin</span>.
            </p>
          </div>
        </div>

        {/* Current User Session Status Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              État de votre session
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
              currentUser
                ? 'bg-blue-100 text-blue-800'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {currentUser ? currentUser.role : 'Déconnecté / Public'}
            </span>
          </div>

          {currentUser ? (
            <div className="text-xs text-slate-700 space-y-1">
              <p>
                Connecté avec le compte : <strong className="text-slate-900">{currentUser.facilityName || currentUser.contactName || currentUser.phone}</strong>
              </p>
              <p className="text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Votre rôle actuel ({currentUser.role}) ne dispose pas des privilèges nécessaires pour visualiser ou éditer les données administratives globales.
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-600">
              <p>Vous n'êtes actuellement pas connecté à votre espace professionnel Gloryday Pharma.</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Si vous êtes l'administrateur de la plateforme, veuillez vous authentifier pour débloquer le panneau de gestion.
              </p>
            </div>
          )}
        </div>

        {/* Instructions for authorized personnel */}
        <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-blue-950">
            <CheckCircle2 className="w-4 h-4 text-[#0d44e8] shrink-0" />
            Accès Administrateur Dédié
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Utilisez l’identifiant administrateur communiqué par Gloryday et le mot de passe Super-Admin configuré.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onReturnToCatalog}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner au Catalogue Public</span>
          </button>

          <button
            type="button"
            onClick={onOpenAuth}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#0d44e8] hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>S'identifier comme Administrateur</span>
          </button>
        </div>

        {/* Support Footer */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            Besoin d'assistance ? Contactez le support Gloryday Pharma au{' '}
            <a href="tel:+24177003004" className="text-slate-600 hover:text-[#0d44e8] font-bold inline-flex items-center gap-1">
              <Phone className="w-3 h-3 inline" /> +241 77 003 004
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
