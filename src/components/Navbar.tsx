import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  ShoppingBag, 
  User as UserIcon, 
  Bell, 
  Search,
  PhoneCall,
  Sparkles,
  Layers,
  FileText,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { User as UserType, AppNotification } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  cartCount: number;
  cartTotal: number;
  currentUser: UserType | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  onToggleSidebar: () => void;
  onLogoClick?: () => void;
  onOpenDraftsModal?: () => void;
  draftsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  cartTotal,
  currentUser,
  onOpenAuth,
  onLogout,
  notifications,
  onOpenNotifications,
  onToggleSidebar,
  onLogoClick
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  const role = currentUser?.role || 'client';

  // Subtle Cart Animation on item addition
  const [isCartBumping, setIsCartBumping] = useState(false);
  const prevCountRef = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setIsCartBumping(true);
      const timer = setTimeout(() => setIsCartBumping(false), 650);
      prevCountRef.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      {/* Desktop Micro Utility Top Bar */}
      <div className="hidden sm:flex bg-[#0f0f12] text-slate-300 px-4 py-1.5 text-[11px] justify-between items-center font-medium">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">
              Gloryday Pharma Gabon
            </span>
            <span className="text-slate-500">·</span>
            <span>Équipements & consommables hospitaliers</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="tel:+24177003004" 
              className="hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <PhoneCall className="w-3 h-3 text-[#0d44e8]" />
              <span>Libreville : +241 77 003 004</span>
            </a>
            {currentUser ? (
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${role === 'Super-Admin' ? 'bg-purple-400' : 'bg-emerald-400'}`}></span>
                {role === 'Super-Admin' ? (
                  <span>
                    Session : <strong className="text-white">Direction Générale Gloryday</strong> [Super-Admin]
                  </span>
                ) : (
                  <span>
                    Connecté : <strong className="text-white">{currentUser.facilityName}</strong> [{role}]
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                <span>Mode : <strong className="text-slate-200">Visiteur Invité</strong></span>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-blue-400 hover:text-white font-bold transition-colors cursor-pointer ml-1"
                >
                  Se connecter / Inscription →
                </button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Bar (56px) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Left Zone: Menu Toggle & Brand Wordmark */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="w-10 h-10 rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div 
              onClick={() => {
                if (onLogoClick) {
                  onLogoClick();
                } else {
                  if (role === 'Super-Admin') {
                    setActiveTab('admin');
                  } else {
                    setActiveTab('catalog');
                  }
                }
              }}
              className="flex items-center gap-2 cursor-pointer select-none group"
              title="GLORYDAY Pharma · Clic pour réinitialiser le panier à 0 et revenir à l'accueil"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0d44e8] text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
                +
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-extrabold text-base sm:text-lg text-[#000000] tracking-tight">
                  GLORYDAY
                </span>
                <span className="text-[11px] font-bold text-[#0d44e8] uppercase tracking-wider">
                  Pharma
                </span>
              </div>
            </div>
          </div>

          {/* Center Zone (Desktop navigation links) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-slate-100 text-[#000000] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Catalogue</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bulk-order')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'bulk-order'
                  ? 'bg-blue-50 text-[#0d44e8] font-bold border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="text-[#0d44e8] font-black">⚡</span>
              <span>Saisie Rapide</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 text-[#0d44e8] font-bold uppercase hidden lg:inline">
                Bulk
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('packs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'packs'
                  ? 'bg-slate-100 text-[#000000] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#0d44e8]" />
              <span>Packs & Promos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-[#000000] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Mes Commandes</span>
            </button>

            {role === 'Super-Admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="px-2.5 py-1 rounded-md bg-[#0f0f12] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs ml-1 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Panneau de bord Super-Admin"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#0d44e8]" />
                <span>Super-Admin</span>
              </button>
            )}

            {role === 'Commercial' && (
              <button
                type="button"
                onClick={() => setActiveTab('commercial-quotes')}
                className="px-2.5 py-1 rounded-md bg-purple-900 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs ml-1 hover:bg-purple-800 transition-colors cursor-pointer"
                title="Espace Commercial"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                <span>Commercial</span>
              </button>
            )}
          </nav>

          {/* Right Zone: Notifications, Cart, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Desktop Cart Button with Subtle Bounce & Pulse */}
            <button
              type="button"
              onClick={() => setActiveTab('cart')}
              className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                isCartBumping ? 'scale-105 shadow-md ring-2 ring-[#0d44e8] bg-blue-50' : ''
              } ${
                activeTab === 'cart'
                  ? 'bg-[#0d44e8] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}
            >
              <ShoppingBag className={`w-4 h-4 transition-transform duration-300 ${
                isCartBumping ? 'scale-125 -rotate-12 text-[#0d44e8]' : ''
              }`} />
              <span>{cartTotal > 0 ? `${cartTotal.toLocaleString('fr-FR')} F` : 'Panier'}</span>
              {cartCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black transition-all duration-300 ${
                  isCartBumping 
                    ? 'scale-125 ring-4 ring-[#0d44e8]/50 bg-emerald-600 text-white animate-pulse'
                    : (activeTab === 'cart' ? 'bg-white text-[#0d44e8]' : 'bg-[#0d44e8] text-white')
                }`}>
                  {cartCount}
                </span>
              )}
            </button>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative w-9 h-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {/* Profile / Account */}
            {currentUser ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-slate-200 hover:border-[#0d44e8] hover:ring-2 hover:ring-blue-100 transition-all flex items-center justify-center cursor-pointer bg-slate-100"
                  title={`${currentUser.facilityName} - Ouvrir Tableau de Bord`}
                >
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.facilityName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-xs text-[#0d44e8]">{currentUser.facilityName.charAt(0).toUpperCase()}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                  title="Se déconnecter"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-[#0d44e8] hover:bg-blue-50 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Se connecter / Connexion Google"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#0d44e8]" />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Super-Admin Active Session Banner when browsing catalog or other views */}
      {role === 'Super-Admin' && !['admin', 'admin-orders', 'admin-catalog', 'admin-deploy'].includes(activeTab) && (
        <div className="bg-slate-900 text-slate-200 px-3 sm:px-4 py-1.5 text-xs border-t border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-1 sm:px-2">
            <span className="flex items-center gap-2 font-medium text-[11px] sm:text-xs">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Session <strong className="text-white">Super-Admin active</strong> · Vous conservez l'accès intégral à la gestion.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0 ml-2 shadow-xs"
            >
              Tableau de Bord Admin →
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
