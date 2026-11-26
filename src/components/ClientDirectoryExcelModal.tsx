import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Upload, X } from 'lucide-react';
import { api } from '../api';
import {
  parseClientDirectorySpreadsheet,
  downloadClientDirectoryTemplateXlsx,
  type ClientDirectoryImportPreview,
} from '../utils/clientDirectorySpreadsheet';

interface ClientDirectoryExcelModalProps {
  clients: any[];
  onClose: () => void;
  onImported: (message: string) => void;
}

const statusLabels = {
  ready: 'À importer',
  duplicate: 'Doublon ignoré',
  invalid: 'À corriger',
} as const;

export const ClientDirectoryExcelModal: React.FC<ClientDirectoryExcelModalProps> = ({ clients, onClose, onImported }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ClientDirectoryImportPreview | null>(null);
  const [fileError, setFileError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileError('');
    setPreview(null);
    const result = await parseClientDirectorySpreadsheet(file, clients);
    if (!result.success) {
      setFileError(result.message);
      return;
    }
    setPreview(result);
  };

  const handleImport = async () => {
    if (!preview || preview.readyCount === 0 || preview.invalidCount > 0 || isSaving) return;
    setIsSaving(true);
    setFileError('');
    try {
      const result = await api.importClientRecords(preview.records);
      onImported(`${result.createdCount} client(s) ajouté(s)${result.duplicateCount ? ` · ${result.duplicateCount} doublon(s) ignoré(s)` : ''}.`);
      onClose();
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'L’import n’a pas abouti. Le fichier n’a pas été ajouté.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setFileError('');
    try {
      await downloadClientDirectoryTemplateXlsx();
    } catch {
      setFileError('Le modèle Excel n’a pas pu être préparé. Réessayez dans un instant.');
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="client-directory-import-title" className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-100 p-2 text-emerald-800"><FileSpreadsheet className="h-5 w-5" /></span>
            <div>
              <h2 id="client-directory-import-title" className="text-lg font-black text-slate-950">Importer le répertoire clients</h2>
              <p className="mt-1 text-xs text-slate-600">Choisissez le modèle rempli par la secrétaire. L’aperçu signale les erreurs et les doublons avant tout enregistrement.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Fichier Excel ou CSV</p>
              <p className="mt-1 text-xs text-slate-500">Formats .xlsx, .xls ou .csv · maximum 5 Mo et 500 lignes clients.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void handleDownloadTemplate()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100">
                <Download className="h-4 w-4" /> Télécharger le modèle vierge
              </button>
              <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800">
                <Upload className="h-4 w-4" /> Choisir un fichier
              </button>
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelected} />
          </div>

          {fileError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{fileError}</p>}

          {preview && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="truncate text-xs font-bold text-slate-800">{preview.fileName} · {preview.totalRowsRead} ligne(s) lue(s)</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-3"><p className="text-[11px] text-slate-500">Prêts à importer</p><p className="mt-1 text-lg font-black text-emerald-800">{preview.readyCount}</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-[11px] text-slate-500">Doublons ignorés</p><p className="mt-1 text-lg font-black text-amber-800">{preview.duplicateCount}</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-[11px] text-slate-500">Lignes à corriger</p><p className="mt-1 text-lg font-black text-rose-800">{preview.invalidCount}</p></div>
                </div>
              </div>

              {preview.invalidCount > 0 && <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Corrigez les lignes signalées dans Excel puis sélectionnez de nouveau le fichier. Aucune ligne de ce fichier ne sera enregistrée tant qu’il reste une erreur.</p>}
              {preview.invalidCount === 0 && preview.readyCount > 0 && <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle2 className="h-4 w-4 shrink-0" />Les fiches existantes ne seront pas remplacées. Les doublons détectés seront ignorés.</p>}

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
                      <tr><th className="px-3 py-2">Ligne</th><th className="px-3 py-2">Entreprise / structure</th><th className="px-3 py-2">Téléphone entreprise</th><th className="px-3 py-2">Résultat</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.slice(0, 100).map((row) => (
                        <tr key={row.rowNumber} className="align-top">
                          <td className="px-3 py-2 font-mono text-slate-500">{row.rowNumber}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{row.facilityName || '—'}</td>
                          <td className="px-3 py-2 font-mono text-slate-700">{row.companyPhone || '—'}</td>
                          <td className={`px-3 py-2 ${row.status === 'ready' ? 'text-emerald-800' : row.status === 'duplicate' ? 'text-amber-800' : 'text-rose-800'}`}>
                            <strong>{statusLabels[row.status]}</strong>{row.issues.length > 0 && <span className="block pt-0.5 text-[11px]">{row.issues.join(' ')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 100 && <p className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">Aperçu des 100 premières lignes. Toutes les lignes sont vérifiées.</p>}
              </div>
            </>
          )}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50">Annuler</button>
          <button type="button" onClick={() => void handleImport()} disabled={!preview || preview.readyCount === 0 || preview.invalidCount > 0 || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSaving ? 'Enregistrement…' : `Importer ${preview?.readyCount || 0} client(s)`}
          </button>
        </footer>
      </section>
    </div>
  );
};
