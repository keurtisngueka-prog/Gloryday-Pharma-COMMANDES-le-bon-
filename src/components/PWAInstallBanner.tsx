import React, { useState } from 'react';
import { Download, Share2, X, Smartphone, CheckCircle } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../utils/pwa';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed or dismissed, do not display
  if (isInstalled || isDismissed) {
    return null;
  }

  // If neither Chrome installable nor iOS, return null
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <aside aria-label="Installation de l'application" className="bg-[#0f0f12] text-white px-3 py-2 border-b border-slate-800 text-xs flex items-center justify-between gap-2 transition-all">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#0d44e8] flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5 text-white" />
          </div>
          <p className="truncate text-[11px] sm:text-xs">
            <span className="font-bold text-white">Application Gloryday</span> : installez sur votre écran d'accueil
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isInstallable && (
            <button
              type="button"
              onClick={install}
              className="px-2.5 py-1 rounded-lg bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Download className="w-3 h-3" />
              <span>Installer</span>
            </button>
          )}

          {isIOS && !isInstallable && (
            <button
              type="button"
              onClick={() => setShowIOSModal(true)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
            >
              <Share2 className="w-3 h-3 text-[#42aef7]" />
              <span>Installer iOS</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
            title="Masquer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSModal && (
        <div 
          onClick={() => setShowIOSModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-900"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0d44e8] flex items-center justify-center text-white">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">Installer sur iPhone / iPad</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-[11px] flex items-center justify-center text-slate-800 shrink-0">1</span>
                <p>
                  Dans Safari, appuyez sur le bouton de <strong>Partage</strong> (<Share2 className="w-3 h-3 inline text-[#0d44e8]" /> dans la barre du bas).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-[11px] flex items-center justify-center text-slate-800 shrink-0">2</span>
                <p>
                  Faites défiler vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-[11px] flex items-center justify-center text-slate-800 shrink-0">3</span>
                <p>
                  Touchez <strong>Ajouter</strong> en haut à droite. L'icône Gloryday s'affichera directement sur votre écran !
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#0f0f12] text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:right-auto sm:left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-lg animate-in slide-in-from-bottom duration-200">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
      <span className="truncate">Mode Hors-ligne — Catalogue et panier disponibles en cache local.</span>
    </div>
  );
};
