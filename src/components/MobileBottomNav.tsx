import React, { useState, useEffect, useRef } from 'react';
import { Layers, Sparkles, ShoppingBag, FileText, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  cartCount: number;
  onOpenSidebar: () => void;
  draftsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  onOpenSidebar,
  draftsCount
}) => {
  const [isBumping, setIsBumping] = useState(false);
  const prevCountRef = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCountRef.current) {
      setIsBumping(true);
      const timer = setTimeout(() => setIsBumping(false), 650);
      prevCountRef.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = cartCount;
  }, [cartCount]);
  return (
    <nav 
      aria-label="Navigation principale mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(22,22,24,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
        {/* Tab 1: Catalogue */}
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'text-[#0d44e8] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 stroke-[2.2]" />
            {activeTab === 'catalog' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0d44e8]"></span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">
            Catalogue
          </span>
        </button>

        {/* Tab 2: Packs */}
        <button
          type="button"
          onClick={() => setActiveTab('packs')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'packs'
              ? 'text-[#0d44e8] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 stroke-[2.2]" />
            {activeTab === 'packs' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0d44e8]"></span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">
            Packs
          </span>
        </button>

        {/* Tab 3: Panier */}
        <button
          type="button"
          onClick={() => setActiveTab('cart')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all duration-300 cursor-pointer relative ${
            isBumping ? 'scale-110' : ''
          } ${
            activeTab === 'cart'
              ? 'text-[#0d44e8] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 stroke-[2.2] transition-transform duration-300 ${
              isBumping ? 'scale-125 -rotate-12 text-[#0d44e8]' : ''
            }`} />
            {cartCount > 0 && (
              <span className={`absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs transition-all duration-300 ${
                isBumping 
                  ? 'bg-emerald-600 scale-125 ring-4 ring-[#0d44e8]/40 animate-pulse' 
                  : 'bg-[#0d44e8]'
              }`}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
            {activeTab === 'cart' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0d44e8]"></span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">
            Panier
          </span>
        </button>

        {/* Tab 4: Commandes */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-[#0d44e8] font-bold'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <FileText className="w-5 h-5 stroke-[2.2]" />
            {activeTab === 'dashboard' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0d44e8]"></span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">
            Commandes
          </span>
        </button>

        {/* Tab 5: Menu */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center h-full min-h-[44px] text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer relative"
        >
          <div className="relative">
            <Menu className="w-5 h-5 stroke-[2.2]" />
            {draftsCount !== undefined && draftsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" title={`${draftsCount} brouillon(s) hors-ligne`}></span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1 leading-none">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
