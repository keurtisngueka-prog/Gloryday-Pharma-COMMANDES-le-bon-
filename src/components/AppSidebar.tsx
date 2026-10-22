import React, { useState } from 'react';
import { 
  Layers, 
  Sparkles, 
  ShoppingBag, 
  FileText, 
  ShieldCheck, 
  Package, 
  Users, 
  Image as ImageIcon, 
  Truck, 
  LogOut, 
  X, 
  ChevronRight,
  PhoneCall,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  PlusCircle,
  UserCheck,
  Briefcase,
  Database
} from 'lucide-react';
import { User, AppRole } from '../types';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  currentUser: User | null;
  cartCount: number;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenCreateProduct?: () => void;
  onLogoClick?: () => void;
  onSwitchRole?: (role: AppRole) => void;
  onOpenDraftsModal?: () => void;
  draftsCount?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  currentUser,
  cartCount,
  onLogout,
  onOpenAuth,
  onOpenCreateProduct,
  onLogoClick
}) => {
  const role: AppRole = currentUser?.role || 'client';
  const hasPermission = (permission: string) => role === 'Super-Admin' || Boolean(currentUser?.permissions?.includes(permission as any));

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Lateral Drawer Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-80 max-w-[85vw] bg-white text-slate-900 flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-200 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="overflow-y-auto flex-1">
          {/* 1. Header with Brand & Close Button */}
          <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div 
              onClick={() => {
                if (onLogoClick) {
                  onLogoClick();
                } else {
                  handleNav('catalog');
                }
                onClose();
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              title="GLORYDAY Pharma · Clic pour réinitialiser le panier à 0 et revenir à l'accueil"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0d44e8] text-white flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform">
                +
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#000000] block leading-none">
                  GLORYDAY
                </span>
                <span className="text-[10px] text-[#0d44e8] font-bold uppercase tracking-wider">
                  Pharma Gabon
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Fermer le menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. User & Facility Profile */}
          <div className="p-4 border-b border-slate-100">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#eef3ff] text-[#0d44e8] flex items-center justify-center font-black text-base shrink-0">
                {currentUser ? currentUser.facilityName.charAt(0).toUpperCase() : 'V'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-slate-900 block truncate">
                  {currentUser ? currentUser.facilityName : 'Mode Visiteur'}
                </span>
                <span className="text-[11px] text-[#6a6a6b] block truncate">
                  {currentUser ? (currentUser.contactName || currentUser.facilityType || 'Client') : 'Consultation libre'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                {role}
              </span>
            </div>
          </div>

          {/* 3. Main Client Navigation */}
          <div className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
              Navigation Client
            </span>

            <button
              type="button"
              onClick={() => handleNav('catalog')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-[#eef3ff] text-[#0d44e8] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#0d44e8]" />
                <span>Catalogue médical</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleNav('bulk-order')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'bulk-order'
                  ? 'bg-[#eef3ff] text-[#0d44e8] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 text-center font-bold text-[#0d44e8] leading-none">⚡</span>
                <span>Saisie Rapide (Bulk Order)</span>
              </div>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-[#0d44e8]">
                Bloc & Majors
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNav('packs')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'packs'
                  ? 'bg-[#eef3ff] text-[#0d44e8] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Packs Promotionnels</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleNav('cart')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'cart'
                  ? 'bg-[#eef3ff] text-[#0d44e8] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[#0d44e8]" />
                <span>Mon Panier</span>
              </div>
              <div className="flex items-center gap-1.5">
                {cartCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#0d44e8] text-white text-[10px] font-black">
                    {cartCount}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#eef3ff] text-[#0d44e8] font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#0d44e8]" />
                <span>Mes Commandes & Suivi Direct</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* 4. Professional Back-Office Modules (STRICTLY HIDDEN FROM CLIENTS - ONLY VISIBLE WHEN AUTHENTICATED STAFF) */}
          {currentUser && role !== 'client' && (
            <div className="p-4 pt-1 space-y-1 border-t border-purple-100 bg-purple-50/30">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">
                  Espace Opérationnel [{role}]
                </span>
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
              </div>

              {(hasPermission('quotes_manage') || hasPermission('clients_manage')) && (
                <>
                  {hasPermission('quotes_manage') && <>
                  <button
                    type="button"
                    onClick={() => handleNav('commercial-quotes')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'commercial-quotes' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      <span>Devis & Remises Commerciales</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  </>}
                  {hasPermission('clients_manage') && <>
                  <button
                    type="button"
                    onClick={() => handleNav('clients-list')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'clients-list' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Clients Assignés & Relances 10j</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  </>}
                </>
              )}

              {role === 'Super-Admin' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleNav('admin-catalog')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'admin-catalog' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4 text-purple-600" />
                      <span>Gestion Produits & Stocks</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNav('admin-orders')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'admin-orders' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-purple-600" />
                      <span>Colisage & Expéditions (RG6)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNav('admin')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'admin' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Tableau de Bord Super-Admin</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNav('admin-staff')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'admin-staff' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Comptes employés & rôles</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNav('admin-deploy')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'admin-deploy' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>Sauvegardes & Déploiement</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </>
              )}

              {role === 'Admin simple' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleNav('admin')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'admin' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Tableau de bord</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNav('admin-orders')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'admin-orders' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-purple-600" />
                      <span>Commandes & livraisons</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </>
              )}

              {role !== 'Super-Admin' && hasPermission('catalog_stock') && (
                <button type="button" onClick={() => handleNav('admin-catalog')} className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold ${activeTab === 'admin-catalog' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'}`}>
                  <span className="flex items-center gap-2.5"><Package className="w-4 h-4 text-purple-600" /><span>Catalogue & stocks</span></span><ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {role !== 'Super-Admin' && role !== 'Admin simple' && (hasPermission('orders_view') || hasPermission('orders_manage') || hasPermission('logistics_manage')) && (
                <button
                  type="button"
                  onClick={() => handleNav('admin-orders')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'admin-orders' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-purple-600" />
                    <span>Commandes & livraisons</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {role !== 'Super-Admin' && role !== 'Admin simple' && (hasPermission('stats_view') || hasPermission('settings_manage')) && (
                <button type="button" onClick={() => handleNav('admin')} className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold ${activeTab === 'admin' ? 'bg-purple-100 text-purple-900 font-bold' : 'text-slate-700 hover:bg-white'}`}>
                  <span className="flex items-center gap-2.5"><ShieldCheck className="w-4 h-4 text-purple-600" /><span>Tableau de bord</span></span><ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          )}

          {/* 5. Verified Staff Session Badge (Strictly locked to backend credentials) */}
          {currentUser && role !== 'client' && (
            <div className="p-4 pt-2 space-y-2 border-t border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
                <div className="overflow-hidden">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Session Collaborateur
                  </span>
                  <span className="font-bold text-slate-900 truncate block">
                    {currentUser.contactName || currentUser.facilityName}
                  </span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    {role}
                  </span>
                </div>
              </div>

              {onOpenCreateProduct && (role === 'Super-Admin' || role === 'Gestionnaire Catalogue') && (
                <button
                  type="button"
                  onClick={() => { onOpenCreateProduct(); onClose(); }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Créer un Nouveau Produit</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 6. Footer Support & Session Action */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <PhoneCall className="w-3.5 h-3.5 text-[#0d44e8]" />
              +241 77 003 004
            </span>
            <a
              href="https://wa.me/24177003004"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0d44e8] font-bold hover:underline flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          </div>

          {currentUser ? (
            <button
              type="button"
              onClick={() => { onLogout(); onClose(); }}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Se déconnecter de l'établissement</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onOpenAuth(); onClose(); }}
              className="w-full py-2.5 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              style={{
                boxShadow: 'rgba(4, 24, 85, 0.28) 0px 2px 6px -1px, rgba(66, 174, 247, 0.48) 0px 6px 14px 0px inset'
              }}
            >
              <UserCheck className="w-4 h-4" />
              <span>Se connecter / Créer un compte</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
