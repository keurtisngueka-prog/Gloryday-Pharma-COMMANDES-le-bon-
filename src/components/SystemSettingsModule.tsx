import React, { useState } from 'react';
import { 
  Settings, 
  MapPin, 
  Percent, 
  Tag, 
  PhoneCall, 
  FileText, 
  Clock, 
  DollarSign, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2 
} from 'lucide-react';
import { SystemSettings, User, DeliveryZoneConfig, VolumeDiscountTier, SystemPromoCode } from '../types';
import { getSystemSettings, saveSystemSettings } from '../utils/systemSettingsStorage';

interface SystemSettingsModuleProps {
  currentUser: User;
  onRefresh: () => void;
}

export const SystemSettingsModule: React.FC<SystemSettingsModuleProps> = ({
  currentUser,
  onRefresh
}) => {
  const [settings, setSettings] = useState<SystemSettings>(() => getSystemSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'zones' | 'discounts' | 'promos' | 'templates'>('general');

  const handleSave = () => {
    saveSystemSettings(settings, currentUser);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onRefresh();
  };

  // Zones management
  const handleUpdateZone = (index: number, updated: Partial<DeliveryZoneConfig>) => {
    const newZones = [...settings.deliveryZones];
    newZones[index] = { ...newZones[index], ...updated };
    setSettings({ ...settings, deliveryZones: newZones });
  };

  // Promo code management
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPercent, setNewPromoPercent] = useState<number>(10);
  const [newPromoMin, setNewPromoMin] = useState<number>(25000);

  const handleAddPromoCode = () => {
    if (!newPromoCode.trim()) return;
    const newPromo: SystemPromoCode = {
      code: newPromoCode.trim().toUpperCase(),
      discountPercentage: newPromoPercent,
      minOrderAmount: newPromoMin,
      validUntil: '2026-12-31',
      active: true
    };
    setSettings({
      ...settings,
      promoCodes: [...settings.promoCodes, newPromo]
    });
    setNewPromoCode('');
  };

  const handleRemovePromoCode = (code: string) => {
    setSettings({
      ...settings,
      promoCodes: settings.promoCodes.filter(p => p.code !== code)
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Paramétrage Général Sans Code
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajustez en temps réel les tarifs de livraison, numéros marchands, remises, codes promo et modèles WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span>Enregistré avec succès !</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="py-2 px-4 bg-[#0d44e8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer les Paramètres</span>
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex border-b border-slate-100 bg-white px-4 gap-2 overflow-x-auto text-xs font-semibold py-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('general')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            activeSubTab === 'general' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Général & Marchands
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('zones')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            activeSubTab === 'zones' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Zones & Frais de Livraison ({settings.deliveryZones.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('discounts')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            activeSubTab === 'discounts' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Paliers Remises Volume
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('promos')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            activeSubTab === 'promos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Codes Promo & Tarifs
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('templates')}
          className={`py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${
            activeSubTab === 'templates' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Modèles WhatsApp & En-tête PDF
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* SUBTAB 1: GENERAL */}
        {activeSubTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/40">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#0d44e8]" />
                <span>Horaires & Commande Minimale</span>
              </h3>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Commande Minimale B2B (FCFA)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={settings.minOrderAmount}
                  onChange={(e) => setSettings({ ...settings, minOrderAmount: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plage d'Ouverture & Urgences
                </label>
                <input
                  type="text"
                  value={settings.openingHours}
                  onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>

            <div className="space-y-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/40">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span>Numéros Marchands & WhatsApp Direct</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Principal</label>
                  <input
                    type="text"
                    value={settings.whatsappPrimaryPhone}
                    onChange={(e) => setSettings({ ...settings, whatsappPrimaryPhone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Secondaire</label>
                  <input
                    type="text"
                    value={settings.whatsappSecondaryPhone}
                    onChange={(e) => setSettings({ ...settings, whatsappSecondaryPhone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Airtel Money Marchand</label>
                  <input
                    type="text"
                    value={settings.airtelMerchantPhone}
                    onChange={(e) => setSettings({ ...settings, airtelMerchantPhone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Moov Money Marchand</label>
                  <input
                    type="text"
                    value={settings.moovMerchantPhone}
                    onChange={(e) => setSettings({ ...settings, moovMerchantPhone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: ZONES */}
        {activeSubTab === 'zones' && (
          <div className="space-y-3">
            <p className="text-slate-500 text-xs">
              Configurez le tarif et le délai moyen garanti pour chaque zone géographique de livraison.
            </p>

            <div className="space-y-2">
              {settings.deliveryZones.map((zone, idx) => (
                <div key={zone.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="font-bold text-slate-900">{zone.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Frais :</span>
                      <input
                        type="number"
                        step="500"
                        value={zone.fee}
                        onChange={(e) => handleUpdateZone(idx, { fee: Number(e.target.value) })}
                        className="w-24 p-1.5 border border-slate-300 rounded-lg font-mono text-right bg-white"
                      />
                      <span className="text-slate-500 font-mono">FCFA</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Délai :</span>
                      <input
                        type="number"
                        min="1"
                        value={zone.delayHours}
                        onChange={(e) => handleUpdateZone(idx, { delayHours: Number(e.target.value) })}
                        className="w-16 p-1.5 border border-slate-300 rounded-lg font-mono text-center bg-white"
                      />
                      <span className="text-slate-500">h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 3: DISCOUNTS */}
        {activeSubTab === 'discounts' && (
          <div className="space-y-3">
            <p className="text-slate-500 text-xs">
              Paliers de remise par volume automatique appliqués dans le panier.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {settings.volumeDiscounts.map((tier, idx) => (
                <div key={idx} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <span className="font-bold text-slate-900">Palier {idx + 1}</span>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Quantité minimale</label>
                    <input
                      type="number"
                      value={tier.minQuantity}
                      onChange={(e) => {
                        const newTiers = [...settings.volumeDiscounts];
                        newTiers[idx].minQuantity = Number(e.target.value);
                        setSettings({ ...settings, volumeDiscounts: newTiers });
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Remise (%)</label>
                    <input
                      type="number"
                      value={tier.discountPercentage}
                      onChange={(e) => {
                        const newTiers = [...settings.volumeDiscounts];
                        newTiers[idx].discountPercentage = Number(e.target.value);
                        setSettings({ ...settings, volumeDiscounts: newTiers });
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 4: PROMOS */}
        {activeSubTab === 'promos' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 items-end p-3 border border-slate-200 rounded-xl bg-slate-50/50">
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 mb-1">Nouveau Code Promo</label>
                <input
                  type="text"
                  placeholder="Ex: SPECIALCLINIQUE"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl uppercase font-mono bg-white"
                />
              </div>
              <div className="w-32">
                <label className="block font-semibold text-slate-700 mb-1">Remise (%)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newPromoPercent}
                  onChange={(e) => setNewPromoPercent(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono bg-white"
                />
              </div>
              <div className="w-40">
                <label className="block font-semibold text-slate-700 mb-1">Seuil Mini (FCFA)</label>
                <input
                  type="number"
                  step="5000"
                  value={newPromoMin}
                  onChange={(e) => setNewPromoMin(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPromoCode}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="space-y-2">
              {settings.promoCodes.map((promo) => (
                <div key={promo.code} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono font-bold text-slate-900">{promo.code}</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      -{promo.discountPercentage}%
                    </span>
                    <span className="text-slate-400">
                      (Dès {(promo.minOrderAmount || 0).toLocaleString('fr-FR')} FCFA)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePromoCode(promo.code)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 5: TEMPLATES */}
        {activeSubTab === 'templates' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900">Modèles de Messages WhatsApp Automatisés</h3>
              <div>
                <label className="block text-slate-600 mb-1">Confirmation de Commande</label>
                <textarea
                  rows={2}
                  value={settings.whatsappTemplates.orderConfirmation}
                  onChange={(e) => setSettings({
                    ...settings,
                    whatsappTemplates: { ...settings.whatsappTemplates, orderConfirmation: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Commande En Cours de Livraison</label>
                <textarea
                  rows={2}
                  value={settings.whatsappTemplates.inTransit}
                  onChange={(e) => setSettings({
                    ...settings,
                    whatsappTemplates: { ...settings.whatsappTemplates, inTransit: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h3 className="font-bold text-slate-900">En-tête et Mentions Légales PDF / Factures</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">Raison Sociale</label>
                  <input
                    type="text"
                    value={settings.pdfHeaderInfo.companyName}
                    onChange={(e) => setSettings({
                      ...settings,
                      pdfHeaderInfo: { ...settings.pdfHeaderInfo, companyName: e.target.value }
                    })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">RCCM / NIF</label>
                  <input
                    type="text"
                    value={`${settings.pdfHeaderInfo.rccm} · ${settings.pdfHeaderInfo.nif}`}
                    onChange={(e) => {
                      const parts = e.target.value.split('·');
                      setSettings({
                        ...settings,
                        pdfHeaderInfo: {
                          ...settings.pdfHeaderInfo,
                          rccm: parts[0]?.trim() || settings.pdfHeaderInfo.rccm,
                          nif: parts[1]?.trim() || settings.pdfHeaderInfo.nif
                        }
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
