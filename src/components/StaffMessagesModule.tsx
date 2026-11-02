import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, LoaderCircle, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { api } from '../api';
import type { DirectMessage, User } from '../types';

interface StaffMessagesModuleProps {
  currentUser: User;
}

const channelLabel: Record<DirectMessage['channel'], string> = {
  in_app: 'Dans le site',
  whatsapp: 'WhatsApp préparé',
  both: 'Site + WhatsApp préparé',
};

function formatMessageDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('fr-FR', { timeZone: 'Africa/Libreville', dateStyle: 'medium', timeStyle: 'short' })
    : 'Date indisponible';
}

export const StaffMessagesModule: React.FC<StaffMessagesModuleProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setMessages(await api.getDirectMessages());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Les messages ne sont pas disponibles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filteredMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return [...messages]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .filter(message => !normalizedQuery || [
        message.subject,
        message.content,
        message.senderName,
        message.recipientFacilityName,
      ].some(value => value?.toLocaleLowerCase('fr').includes(normalizedQuery)));
  }, [messages, query]);

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Communication interne</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-slate-900">
            <Inbox className="h-5 w-5 text-indigo-600" /> Messages du site
          </h2>
          <p className="mt-1 text-xs text-slate-500">Consultation des messages accessibles à votre compte. Les liens WhatsApp sont préparés, aucun envoi automatique n’est effectué.</p>
        </div>
        <button type="button" onClick={() => void refresh(true)} disabled={refreshing || loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
          {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualiser
        </button>
      </header>

      <label className="relative block max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un sujet, un client ou un message…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50" />
      </label>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-800">{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 p-10 text-sm font-semibold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Chargement des messages…</div>
      ) : filteredMessages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <MessageCircle className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">Aucun message trouvé</p>
          <p className="mt-1 text-xs text-slate-500">Les nouveaux messages apparaîtront ici quand ils seront envoyés depuis le site.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-500">{filteredMessages.length} message(s) · {messages.length} au total</p>
          {filteredMessages.map(message => (
            <article key={message.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-slate-900">{message.subject || 'Sans objet'}</h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    De <strong className="text-slate-700">{message.senderId === currentUser.id ? 'Vous' : message.senderName}</strong>
                    {' · À '}
                    <strong className="text-slate-700">{message.recipientFacilityName || (message.recipientId === 'staff' ? 'Équipe Gloryday' : 'Destinataire')}</strong>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">{channelLabel[message.channel]}</span>
                  <time dateTime={message.createdAt}>{formatMessageDate(message.createdAt)}</time>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">{message.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
