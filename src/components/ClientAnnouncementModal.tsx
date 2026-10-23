import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Megaphone, Send, X } from 'lucide-react';
import { api } from '../api';

interface ClientAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClientAnnouncementModal: React.FC<ClientAnnouncementModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [pushSentCount, setPushSentCount] = useState<number | null>(null);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sentCount !== null) {
      onClose();
      return;
    }

    try {
      setSending(true);
      setError('');
      const result = await api.sendClientAnnouncement(title.trim(), message.trim());
      setSentCount(result.sentCount);
      setPushSentCount(result.pushSentCount);
      setPushConfigured(result.pushConfigured);
    } catch (err: any) {
      setError(err.message || 'L’information n’a pas pu être envoyée.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-announcement-title"
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="p-4 sm:p-5 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </span>
            <div>
              <h2 id="client-announcement-title" className="font-bold">Information aux clients</h2>
              <p className="text-[11px] text-slate-300">Notification dans l’application</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sentCount !== null ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="font-bold text-slate-900">Information envoyée</h3>
              <p className="text-sm text-slate-600 mt-1">Elle a été ajoutée aux notifications de {sentCount} compte(s) client(s).</p>
            </div>
            <p className="text-xs text-slate-600">
              {pushConfigured
                ? `${pushSentCount || 0} notification(s) push envoyée(s) aux appareils activés.`
                : 'Notification push en attente de configuration VAPID et de la migration Supabase.'}
            </p>
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold">Terminer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {error && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900">
              Annonce ajoutee dans la cloche; push envoye seulement aux appareils actifs.
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Titre
              <input
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Ex. Horaires de livraison"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Message
              <textarea
                required
                minLength={3}
                maxLength={2000}
                rows={5}
                value={message}
                onChange={event => setMessage(event.target.value)}
                className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Écris ici l’information à transmettre aux clients."
              />
              <span className="mt-1 block text-right text-[11px] text-slate-400">{message.length}/2 000</span>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={sending} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold disabled:opacity-50">Annuler</button>
              <button type="submit" disabled={sending || title.trim().length < 3 || message.trim().length < 3} className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                <Send className="w-4 h-4" />
                {sending ? 'Envoi…' : 'Envoyer aux clients'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
