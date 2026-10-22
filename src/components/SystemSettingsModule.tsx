import React, { useState } from 'react';
import { 
  Smartphone, 
  Building2, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Zap,
  Database,
  Copy
} from 'lucide-react';
import { 
  getSystemSettings, 
  saveSystemSettings, 
  resetSystemSettings, 
  SystemSettings 
} from '../utils/systemSettingsStorage';
import { recordAuditLog } from '../utils/auditLogger';

interface SystemSettingsModuleProps {
  actorName?: string;
  actorRole?: string;
}

export const SystemSettingsModule: React.FC<SystemSettingsModuleProps> = ({
  actorName = 'Direction Générale Gloryday',
  actorRole = 'Super-Admin'
}) => {
  const [formData, setFormData] = useState<SystemSettings>(() => getSystemSettings());
  const [savedBanner, setSavedBanner] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopyMigrationSql = async () => {
    try {
      const res = await fetch('/api/supabase/migration-sql');
      const data = await res.json();
      if (data?.sql) {
        await navigator.clipboard.writeText(data.sql);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 3000);
      }
    } catch {}
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSystemSettings(formData);
    setFormData(updated);
    recordAuditLog({
      category: 'settings',
      action: 'Mise à jour des Paramètres Système',
      actorName,
      actorRole,
      details: 'Configuration locale mise à jour dans ce navigateur.',
      status: 'success'
    });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const handleReset = () => {
    const def = resetSystemSettings();
    setFormData(def);
    recordAuditLog({
      category: 'settings',
      action: 'Réinitialisation Paramètres par Défaut',
      actorName,
      actorRole,
      details: 'Restauration des paramètres originaux de Gloryday Pharma Gabon.',
      status: 'warning'
    });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
        Ces valeurs sont enregistrées dans ce navigateur uniquement. Elles ne changent pas les paramètres du serveur, les numéros affichés aux clients ni les frais calculés lors d’une commande.
      </div>
      {savedBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Vos paramètres locaux ont été enregistrés dans ce navigateur.</span>
        </div>
      )}

      {/* 1. COMPANY & STANDARD WHATSAPP */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0d44e8]" />
              <span>Identité & Standard Pharmaceutique</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informations affichées sur les bons de commande PDF, factures et liens d'assistance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Raison Sociale
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Numéro utilisé pour préparer les messages WhatsApp
            </label>
            <input
              type="text"
              value={formData.whatsappOfficialPhone}
              onChange={(e) => setFormData({ ...formData, whatsappOfficialPhone: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-emerald-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Adresse du Siège & Dépôt
            </label>
            <input
              type="text"
              value={formData.headquartersAddress}
              onChange={(e) => setFormData({ ...formData, headquartersAddress: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Email Direction Commerciale
            </label>
            <input
              type="email"
              value={formData.supportEmail}
              onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
            />
          </div>

          <div className="sm:col-span-2 pt-2 border-t border-slate-100 text-xs text-amber-800">
            Le mot de passe administrateur se configure uniquement dans les variables sécurisées de l’hébergeur. Les réglages affichés ici restent enregistrés dans ce navigateur.
          </div>
        </div>
      </div>

      {/* 2. MOBILE MONEY GABON CONFIGURATION */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-red-600" />
            <span>Comptes Marchands Mobile Money (Gabon)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Numéros et préfixes USSD utilisés pour le règlement instantané Airtel Money et Moov Money.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Airtel Money Box */}
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50/30 space-y-3">
            <div className="font-bold text-red-900 uppercase tracking-wider flex items-center justify-between">
              <span>Airtel Money Gabon</span>
              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-red-200">Actif</span>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Numéro Marchand Airtel</label>
              <input
                type="text"
                value={formData.airtelMoneyPhone}
                onChange={(e) => setFormData({ ...formData, airtelMoneyPhone: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nom du Compte Marchand</label>
              <input
                type="text"
                value={formData.airtelMoneyMerchantName}
                onChange={(e) => setFormData({ ...formData, airtelMoneyMerchantName: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Préfixe USSD Direct</label>
              <input
                type="text"
                value={formData.airtelUssdPrefix}
                onChange={(e) => setFormData({ ...formData, airtelUssdPrefix: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          {/* Moov Money Box */}
          <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3">
            <div className="font-bold text-blue-900 uppercase tracking-wider flex items-center justify-between">
              <span>Moov Money (Flooz)</span>
              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-blue-200">Actif</span>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Numéro Marchand Moov</label>
              <input
                type="text"
                value={formData.moovMoneyPhone}
                onChange={(e) => setFormData({ ...formData, moovMoneyPhone: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nom du Compte Marchand</label>
              <input
                type="text"
                value={formData.moovMoneyMerchantName}
                onChange={(e) => setFormData({ ...formData, moovMoneyMerchantName: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Préfixe USSD Direct</label>
              <input
                type="text"
                value={formData.moovUssdPrefix}
                onChange={(e) => setFormData({ ...formData, moovUssdPrefix: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUPABASE SERVER CONNECTION */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <span>Connexion à la base Supabase</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Le projet Supabase existe déjà. Cette migration ajoute uniquement les éléments nécessaires au raccordement du serveur.
            </p>
            <p className="text-[11px] text-amber-800 mt-1">
              Pour activer la connexion, appliquez cette migration puis configurez la clé serveur dans les secrets privés de l’hébergeur. Ne la collez jamais dans cette page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMigrationSql}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedSql ? 'Migration copiée !' : 'Copier la migration de raccordement'}</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 text-slate-100 rounded-2xl p-3.5 text-xs space-y-1">
          <div>Les commandes et le catalogue seront enregistrés dans les tables Supabase existantes.</div>
          <div>La clé serveur doit rester dans les variables privées de l’hébergeur, jamais dans le navigateur.</div>
          <div>La connexion démarre uniquement quand la migration et la clé serveur sont toutes les deux configurées.</div>
        </div>
      </div>

      {/* 4. LOGISTICS & WHATSAPP AUTOMATION */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              <span>Tarification et notifications de livraison</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Le tarif du serveur suit les règles du catalogue et des quartiers. L’envoi automatique WhatsApp n’est pas connecté.
            </p>
          </div>

          <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 self-start sm:self-center">
            <input
              type="checkbox"
              checked={false}
              disabled
              className="rounded"
            />
            <span>Envoi automatique indisponible</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Seuil Livraison Gratuite (FCFA)
            </label>
            <input
              type="number"
              value={formData.freeDeliveryThreshold}
              onChange={(e) => setFormData({ ...formData, freeDeliveryThreshold: Number(e.target.value) })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold tabular-nums"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Tarif Livraison Standard Libreville (FCFA)
            </label>
            <input
              type="number"
              value={formData.standardDeliveryFeeLibreville}
              onChange={(e) => setFormData({ ...formData, standardDeliveryFeeLibreville: Number(e.target.value) })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Modèle Étape 1 : En préparation (Colisage)</label>
            <textarea
              value={formData.customPreparationTemplate}
              onChange={(e) => setFormData({ ...formData, customPreparationTemplate: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 h-20 text-xs"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Modèle Étape 2 : Pris en charge par coursier</label>
            <textarea
              value={formData.customPickedUpTemplate}
              onChange={(e) => setFormData({ ...formData, customPickedUpTemplate: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 h-20 text-xs"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Modèle Étape 3 : En cours d'acheminement</label>
            <textarea
              value={formData.customInTransitTemplate}
              onChange={(e) => setFormData({ ...formData, customInTransitTemplate: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 h-20 text-xs"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Modèle Étape 4 : Livré & Réceptionné</label>
            <textarea
              value={formData.customDeliveredTemplate}
              onChange={(e) => setFormData({ ...formData, customDeliveredTemplate: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 h-20 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="py-2 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Valeurs par défaut</span>
          </button>

          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer la Configuration</span>
          </button>
        </div>
      </div>
    </form>
  );
};

