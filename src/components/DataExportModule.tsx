import React, { useState } from 'react';
import { 
  Download, 
  Database, 
  Cloud, 
  FileSpreadsheet, 
  FileJson, 
  FileCode, 
  Server, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Layers,
  Terminal,
  HelpCircle,
  Eye,
  FileText,
  Upload,
  X
} from 'lucide-react';
import { Product, Order, User, Pack, AppNotification } from '../types';
import { 
  downloadFullBackupJSON, 
  downloadProductsCSV, 
  downloadOrdersCSV, 
  downloadClientsCSV, 
  downloadSupabaseSQL,
  generateSupabaseSQLString,
  restoreBackupJSON
} from '../utils/dataExport';

interface DataExportModuleProps {
  products: Product[];
  orders: Order[];
  clients: any[];
  packs: Pack[];
  notifications: AppNotification[];
  onDataRestored?: () => void;
}

export const DataExportModule: React.FC<DataExportModuleProps> = ({
  products,
  orders,
  clients,
  packs,
  notifications,
  onDataRestored
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'vercel' | 'supabase'>('vercel');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const fullSqlContent = React.useMemo(() => {
    return generateSupabaseSQLString(products, clients, orders);
  }, [products, clients, orders]);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownload = (type: 'json' | 'products-csv' | 'orders-csv' | 'clients-csv' | 'sql') => {
    if (type === 'json') {
      downloadFullBackupJSON({ products, orders, clients, packs, notifications });
      setDownloadSuccess('Sauvegarde JSON générée avec succès');
    } else if (type === 'products-csv') {
      downloadProductsCSV(products);
      setDownloadSuccess('Export Catalogue CSV généré');
    } else if (type === 'orders-csv') {
      downloadOrdersCSV(orders);
      setDownloadSuccess('Export Commandes CSV généré');
    } else if (type === 'clients-csv') {
      downloadClientsCSV(clients);
      setDownloadSuccess('Export Clients CSV généré');
    } else if (type === 'sql') {
      downloadSupabaseSQL(products, clients, orders);
      setDownloadSuccess('Script SQL PostgreSQL Supabase généré');
    }
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const envExample = `SUPABASE_URL=https://<votre-projet>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret-privé-Vercel>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<secret-unique-de-8-a-85-caracteres>`;

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {downloadSuccess && (
        <div className="fixed top-20 right-4 z-50 bg-[#0f0f12] text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Main Banner */}
      <div className="bg-[#0f0f12] text-white rounded-2xl p-5 sm:p-6 shadow-2xs border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0d44e8] to-[#42aef7] flex items-center justify-center text-white shrink-0 shadow-md">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Centre d'Exportation & Déploiement Cloud
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Configuration requise avant production
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Exportez vos données et consultez les conditions de déploiement. L'API actuelle requiert un serveur Node.js et un volume persistant privé.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleDownload('json')}
            className="px-4 py-2.5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Exporter Tout (JSON)</span>
          </button>
        </div>
      </div>

      {/* 5 One-Click Export Cards */}
      <div>
        <h3 className="text-xs sm:text-sm font-extrabold text-[#161618] uppercase tracking-wider mb-3">
          1. Téléchargement Immédiat des Données
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Card 1: JSON Full Backup */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0d44e8] flex items-center justify-center">
                  <FileJson className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Format .JSON
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                Sauvegarde Intégrale Gloryday
              </h4>
              <p className="text-[11px] text-[#6a6a6b] mt-1 leading-relaxed">
                Inclut les {products.length} articles, conditionnements, remises, {orders.length} commandes et comptes clients.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload('json')}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger JSON ({products.length} articles)</span>
            </button>

            {/* Restore file input */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
              <label className="w-full py-1.5 px-3 rounded-xl border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-[#0d44e8] font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3 h-3" />
                <span>Restaurer / Importer Sauvegarde</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const content = event.target?.result as string;
                      if (!content) return;
                      const res = restoreBackupJSON(content);
                      setDownloadSuccess(res.message);
                      if (res.success) {
                        setTimeout(() => {
                          if (onDataRestored) onDataRestored();
                          else window.location.reload();
                        }, 1200);
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Card 2: Products CSV */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Excel / Sheets
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                Catalogue Médical & Tarifs CSV
              </h4>
              <p className="text-[11px] text-[#6a6a6b] mt-1 leading-relaxed">
                Tableau avec noms, catégories, conditionnements, prix nets, remises % et prix barrés avec encodage UTF-8 Excel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload('products-csv')}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger Catalogue CSV</span>
            </button>
          </div>

          {/* Card 3: Orders CSV */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-extrabold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Ventes & Commandes
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                Bons de Commande CSV
              </h4>
              <p className="text-[11px] text-[#6a6a6b] mt-1 leading-relaxed">
                Historique des références GP, dates, établissements clients, adresses, montants FCFA et statuts de livraison.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload('orders-csv')}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger Commandes CSV ({orders.length})</span>
            </button>
          </div>

          {/* Card 4: Clients CSV */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Clients Hospitaliers
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                Portefeuille Clients CSV
              </h4>
              <p className="text-[11px] text-[#6a6a6b] mt-1 leading-relaxed">
                Liste des cliniques, pharmacies et hôpitaux avec contacts, numéros de téléphone et volumes d'achats cumulés.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload('clients-csv')}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger Clients CSV ({clients.length})</span>
            </button>
          </div>

          {/* Card 5: SQL Supabase */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#0d44e8] shadow-sm flex flex-col justify-between hover:shadow-md transition-all bg-gradient-to-b from-blue-50/30 to-white">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#0d44e8] text-white flex items-center justify-center shadow-xs">
                  <FileCode className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-extrabold text-[#0d44e8] bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                  schema.sql
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                Script SQL DDL & Données (PostgreSQL)
              </h4>
              <p className="text-[11px] text-[#6a6a6b] mt-1 leading-relaxed">
                Fichier présent à la racine de votre projet sous <strong>/schema.sql</strong>. Contient les tables, index et les {products.length} articles médicaux.
              </p>
              
              <div className="mt-2.5 p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[10px] text-blue-900 font-mono flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#0d44e8] shrink-0" />
                <span className="truncate">Localisation : <strong>/schema.sql</strong></span>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Voir & Copier le Code SQL</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('sql')}
                className="w-full py-2 px-3 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger schema.sql</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Step-by-Step Interactive Guide */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-[#0d44e8]" />
              <span>2. Guide de Déploiement : Où et Comment Héberger ?</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vercel héberge le site et l’API; Supabase conserve les données et les sessions.
            </p>
          </div>

          {/* Guide Selector Tabs */}
          <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveGuideTab('vercel')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeGuideTab === 'vercel' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vercel (site + API)
            </button>
            <button
              type="button"
              onClick={() => setActiveGuideTab('supabase')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeGuideTab === 'supabase' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Supabase (base à configurer)
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 text-xs text-slate-700 space-y-5">
          {/* VERCEL GUIDE */}
          {activeGuideTab === 'vercel' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#0d44e8] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Tout le site et son API sont sur Vercel :</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Les pages sont publiées depuis dist et les appels /api utilisent une fonction Vercel. Aucun deuxième hébergeur n’est requis.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <div>
                    <h5 className="font-bold text-slate-900">Relier le projet à Vercel</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Importez le dépôt Git privé du projet dans Vercel. Si vous avez seulement l’archive ZIP, il faut d’abord placer le code dans un dépôt Git privé.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <div>
                    <h5 className="font-bold text-slate-900">Importer le projet</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Importez le dépôt Git dans Vercel. Le fichier vercel.json configure la construction du site et les routes API.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <div>
                    <h5 className="font-bold text-slate-900">Construction Vercel</h5>
                    <div className="mt-1.5 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1">
                      <div>Install Command : <span className="text-emerald-400">npm ci</span></div>
                      <div>Build Command : <span className="text-emerald-400">npm run build</span></div>
                      <div>Output Directory : <span className="text-blue-400">dist</span></div>
                      <div>API : <span className="text-amber-400">fonction Vercel /api/*</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-bold text-slate-900">Variables privées à saisir dans Vercel :</h5>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(envExample, 'vercel-env')}
                        className="text-[11px] text-[#0d44e8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedSection === 'vercel-env' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSection === 'vercel-env' ? 'Copié !' : 'Copier l’exemple'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded-xl bg-slate-100 text-slate-800 font-mono text-[11px] overflow-x-auto">
                      {envExample}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUPABASE GUIDE */}
          {activeGuideTab === 'supabase' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
                <Database className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950">Raccordement Supabase préparé, activation en attente :</h4>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    Le serveur enregistre les données et les sessions dans Supabase. L’activation attend l’application des migrations et la configuration de la clé privée dans les variables Vercel.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <div>
                    <h5 className="font-bold text-slate-900">Appliquer la migration du projet</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Appliquez les migrations ajoutées dans supabase/migrations dans l'ordre des noms de fichiers, jusqu'à la plus récente. Ne relancez pas les anciennes migrations de création.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <div className="flex-1">
                    <h5 className="font-bold text-slate-900">Exporter les données actuelles (facultatif)</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-2">
                      Le bouton ci-dessous génère un export SQL des données actuellement chargées. Cet export n’applique pas les migrations et ne remplace pas la configuration Supabase dans Vercel.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownload('sql')}
                      className="py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger le script SQL maintenant</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                    <h5 className="font-bold text-slate-900">Variables privées de Vercel :</h5>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(envExample, 'env-example')}
                        className="text-[11px] text-[#0d44e8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedSection === 'env-example' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSection === 'env-example' ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                      {envExample}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* SQL Viewer Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl text-white overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0d44e8] text-white flex items-center justify-center shadow-xs">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base">Script SQL PostgreSQL / Supabase</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                      /schema.sql
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Fichier disponible à la racine du projet sous <strong>schema.sql</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(fullSqlContent);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 2500);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  {sqlCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{sqlCopied ? 'Copié !' : 'Copier tout le SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('sql')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSqlModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Supabase Steps Banner */}
            <div className="bg-[#0b132b] px-4 py-2.5 border-b border-blue-900/50 flex flex-wrap items-center justify-between text-xs text-blue-200 gap-2">
              <span className="font-semibold text-emerald-300">
                ⚡ Comment l'exécuter dans Supabase :
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span>1. Rendez-vous sur <strong>supabase.com</strong></span>
                <span>→ 2. Ouvrez <strong>SQL Editor</strong></span>
                <span>→ 3. Collez ce code et cliquez sur <strong>Run</strong></span>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 bg-[#0a0d14] font-mono text-xs leading-relaxed text-slate-300 select-all">
              <pre className="whitespace-pre">{fullSqlContent}</pre>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{products.length} articles + tables DDL prêts pour exécution</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSqlModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
