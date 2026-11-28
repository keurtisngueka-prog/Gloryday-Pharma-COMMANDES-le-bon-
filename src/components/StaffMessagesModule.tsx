import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Inbox, LoaderCircle, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { api } from '../api';
import type { DirectMessage } from '../types';
import { DirectMessagingModal } from './DirectMessagingModal';

interface StaffMessagesModuleProps {
  clients: any[];
  canSend: boolean;
}

interface ClientConversation {
  id: string;
  clientId: string;
  clientName: string;
  facilityName: string;
  phone?: string;
  orderId?: string;
  orderReference?: string;
  subject: string;
  messages: DirectMessage[];
  latest: DirectMessage;
}

function formatMessageDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('fr-FR', { timeZone: 'Africa/Libreville', dateStyle: 'medium', timeStyle: 'short' })
    : 'Date indisponible';
}

function conversationSubject(subject: string): string {
  return subject.replace(/^(?:(?:re|fw)\s*:\s*)+/i, '').trim() || 'Discussion';
}

function getClientId(message: DirectMessage): string {
  return message.senderRole === 'client' || message.recipientId === 'staff'
    ? message.senderId
    : message.recipientId || message.senderId;
}

function groupMessages(messages: DirectMessage[], clients: any[]): ClientConversation[] {
  const grouped = new Map<string, DirectMessage[]>();

  for (const message of messages) {
    const clientId = getClientId(message);
    const subjectKey = conversationSubject(message.subject).toLocaleLowerCase('fr');
    const topic = message.orderId ? `order:${message.orderId}` : `subject:${subjectKey}`;
    const id = `${clientId}:${topic}`;
    const conversationMessages = grouped.get(id) || [];
    conversationMessages.push(message);
    grouped.set(id, conversationMessages);
  }

  return Array.from(grouped, ([id, groupedMessages]) => {
    const sortedMessages = [...groupedMessages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const latest = sortedMessages[sortedMessages.length - 1];
    const clientId = getClientId(latest);
    const clientRecord = clients.find(client => client.id === clientId || client.userId === clientId);
    const clientMessage = [...sortedMessages].reverse().find(message => message.senderRole === 'client' || message.senderId === clientId);
    const staffMessage = [...sortedMessages].reverse().find(message => message.senderId !== clientId);
    const clientName = clientRecord?.contactName || clientMessage?.senderName || staffMessage?.recipientFacilityName || 'Client';
    const facilityName = clientRecord?.facilityName || staffMessage?.recipientFacilityName || clientName;

    return {
      id,
      clientId,
      clientName,
      facilityName,
      phone: clientRecord?.phone || clientMessage?.senderPhone || staffMessage?.recipientPhone,
      orderId: latest.orderId || sortedMessages.find(message => message.orderId)?.orderId,
      orderReference: latest.orderReference || sortedMessages.find(message => message.orderReference)?.orderReference,
      subject: conversationSubject(sortedMessages[0].subject),
      messages: sortedMessages,
      latest,
    };
  }).sort((left, right) => right.latest.createdAt.localeCompare(left.latest.createdAt));
}

export const StaffMessagesModule: React.FC<StaffMessagesModuleProps> = ({ clients, canSend }) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [replyConversation, setReplyConversation] = useState<ClientConversation | null>(null);
  const [newMessageTarget, setNewMessageTarget] = useState<any | null>(null);
  const [newMessageClientId, setNewMessageClientId] = useState('');
  const [showNewMessageSelector, setShowNewMessageSelector] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setMessages(await api.getDirectMessages());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Les conversations ne sont pas disponibles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    const intervalId = window.setInterval(refreshWhenVisible, 10_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  const conversations = useMemo(() => {
    const grouped = groupMessages(messages, clients);
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return grouped.filter(conversation => !normalizedQuery || [
      conversation.clientName,
      conversation.facilityName,
      conversation.orderReference,
      conversation.subject,
      conversation.latest.content,
    ].some(value => value?.toLocaleLowerCase('fr').includes(normalizedQuery)));
  }, [clients, messages, query]);

  const activeConversation = conversations.find(conversation => conversation.id === selectedConversationId) || conversations[0] || null;
  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Relation client</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-slate-900">
              <Inbox className="h-5 w-5 text-emerald-700" /> Conversations clients
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">Les échanges sont réunis par client et par commande. Les nouveaux messages sont vérifiés automatiquement toutes les 10 secondes.</p>
          </div>
          <button type="button" onClick={() => void refresh(true)} disabled={refreshing || loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
            {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualiser
          </button>
        </header>

        <div className="border-b border-slate-100 p-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un client, une commande ou un message…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50" />
            </label>
            {canSend && <button type="button" onClick={() => setShowNewMessageSelector(value => !value)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-900"><MessageCircle className="h-4 w-4" />Nouveau message</button>}
          </div>
          {canSend && showNewMessageSelector && (
            <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 sm:flex-row sm:items-center">
              <label className="min-w-0 flex-1 text-[10px] font-bold text-emerald-950">
                Choisir un client avec un compte
                <select value={newMessageClientId} onChange={event => setNewMessageClientId(event.target.value)} className="mt-1 block w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
                  <option value="">Sélectionner un client…</option>
                  {clients.filter(client => client.hasAccount && client.linkedUserId).map(client => <option key={client.linkedUserId} value={client.linkedUserId}>{client.facilityName} · {client.contactName}</option>)}
                </select>
              </label>
              <button type="button" disabled={!newMessageClientId} onClick={() => {
                const client = clients.find(item => item.linkedUserId === newMessageClientId);
                if (!client) return;
                setNewMessageTarget({ id: client.linkedUserId, facilityName: client.facilityName, phone: client.phone || client.loginPhone });
                setShowNewMessageSelector(false);
              }} className="rounded-xl border border-emerald-800 bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">Écrire au client</button>
            </div>
          )}
        </div>

        {error && <p role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-800">{error}</p>}
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm font-semibold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Chargement des conversations…</div>
        ) : conversations.length === 0 ? (
          <div className="p-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">Aucune conversation à afficher</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">Les messages envoyés depuis l’espace client apparaîtront ici. Les discussions liées à une commande afficheront aussi sa référence.</p>
          </div>
        ) : (
          <div className="grid min-h-[32rem] grid-cols-1 lg:grid-cols-[19rem_minmax(0,1fr)]">
            <aside className={`${mobileConversationOpen ? 'hidden' : 'block'} border-b border-slate-100 bg-slate-50/70 lg:block lg:border-b-0 lg:border-r`} aria-label="Liste des conversations">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Discussions</span>
                <span className="text-[11px] font-semibold text-slate-500">{conversations.length}</span>
              </div>
              <div className="max-h-[68vh] space-y-1 overflow-y-auto p-2">
                {conversations.map(conversation => {
                  const isSelected = activeConversation?.id === conversation.id;
                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      onClick={() => { setSelectedConversationId(conversation.id); setMobileConversationOpen(true); }}
                      aria-pressed={isSelected}
                      className={`w-full rounded-xl border p-3 text-left transition ${isSelected ? 'border-emerald-200 bg-white shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-black text-slate-900">{conversation.facilityName}</span>
                        <time className="shrink-0 text-[9px] font-semibold text-slate-400" dateTime={conversation.latest.createdAt}>{formatMessageDate(conversation.latest.createdAt)}</time>
                      </div>
                      {conversation.clientName !== conversation.facilityName && <p className="mt-0.5 truncate text-[10px] text-slate-500">{conversation.clientName}</p>}
                      <p className="mt-2 truncate text-[10px] font-bold text-slate-700">{conversation.orderReference ? `Commande ${conversation.orderReference}` : conversation.subject}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{conversation.latest.content || 'Photo jointe'}</p>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className={`${mobileConversationOpen ? 'flex' : 'hidden'} min-h-[32rem] flex-col lg:flex`}>
              {activeConversation ? (
                <>
                  <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <button type="button" onClick={() => setMobileConversationOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Retour à la liste des conversations"><ArrowLeft className="h-4 w-4" /></button>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-900">{activeConversation.facilityName}</h3>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">
                          {activeConversation.orderReference ? `Commande ${activeConversation.orderReference}` : activeConversation.subject}
                          {activeConversation.clientName !== activeConversation.facilityName ? ` · ${activeConversation.clientName}` : ''}
                        </p>
                      </div>
                    </div>
                    {canSend && <button type="button" onClick={() => setReplyConversation(activeConversation)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-800 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-900"><MessageCircle className="h-3.5 w-3.5" />Répondre</button>}
                  </header>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-3 sm:p-5" aria-label="Historique des messages">
                    {activeConversation.messages.map(message => {
                      const isClientMessage = message.senderId === activeConversation.clientId;
                      return (
                        <article key={message.id} className={`flex ${isClientMessage ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[92%] rounded-2xl border p-3 shadow-xs sm:max-w-[82%] ${isClientMessage ? 'border-slate-200 bg-white text-slate-800' : 'border-emerald-800 bg-emerald-800 text-white'}`}>
                            <p className={`text-[10px] font-black ${isClientMessage ? 'text-emerald-800' : 'text-emerald-100'}`}>{isClientMessage ? activeConversation.clientName : message.senderName || 'Équipe Gloryday'}</p>
                            {message.content && <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed">{message.content}</p>}
                            {message.attachments?.length ? (
                              <div className="mt-2 grid max-w-sm grid-cols-2 gap-2">
                                {message.attachments.map(attachment => attachment.signedUrl ? (
                                  <a key={attachment.path} href={attachment.signedUrl} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-white/20 bg-white/10">
                                    <img src={attachment.signedUrl} alt={attachment.originalName || 'Photo jointe'} loading="lazy" className="aspect-square w-full object-cover" />
                                  </a>
                                ) : <span key={attachment.path} className="rounded-lg bg-slate-100 px-3 py-4 text-center text-[10px] text-slate-500">Photo indisponible</span>)}
                              </div>
                            ) : null}
                            <time className={`mt-2 block text-right text-[9px] ${isClientMessage ? 'text-slate-400' : 'text-emerald-100'}`} dateTime={message.createdAt}>{formatMessageDate(message.createdAt)}</time>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 sm:px-5">
                    {canSend ? 'La réponse restera dans cette discussion' : 'Votre compte peut consulter ces échanges, mais ne dispose pas du droit de réponse.'}
                  </div>
                </>
              ) : (
                <div className="grid flex-1 place-items-center p-8 text-center text-xs text-slate-500">Choisissez une discussion pour voir son historique.</div>
              )}
            </div>
          </div>
        )}
      </section>

      {replyConversation && (
        <DirectMessagingModal
          isOpen
          onClose={() => setReplyConversation(null)}
          targetClient={{ id: replyConversation.clientId, facilityName: replyConversation.facilityName, phone: replyConversation.phone || [...replyConversation.messages].reverse().find(message => message.senderId === replyConversation.clientId)?.senderPhone }}
          orderId={replyConversation.orderId}
          orderReference={replyConversation.orderReference}
          initialSubject={`Re : ${replyConversation.subject}`}
          onSuccess={() => { setReplyConversation(null); void refresh(true); }}
        />
      )}
      {newMessageTarget && (
        <DirectMessagingModal
          isOpen
          onClose={() => setNewMessageTarget(null)}
          targetClient={newMessageTarget}
          initialSubject="Message Gloryday Pharma"
          onSuccess={() => { setNewMessageTarget(null); void refresh(true); }}
        />
      )}
    </>
  );
};
