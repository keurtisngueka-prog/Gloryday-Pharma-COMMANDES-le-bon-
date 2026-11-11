import React, { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, MessageCircle, RefreshCw, Send, X } from 'lucide-react';
import { api } from '../api';
import type { DirectMessage, Order, User } from '../types';

interface OrderConversationModalProps {
  order: Order;
  currentUser: User;
  onClose: () => void;
}

export const OrderConversationModal: React.FC<OrderConversationModalProps> = ({ order, currentUser, onClose }) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const allMessages = await api.getDirectMessages();
      setMessages(allMessages.filter((message) => message.orderId === order.id)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les échanges de cette commande.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [order.id]);

  useEffect(() => {
    void refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    const intervalId = window.setInterval(refreshWhenVisible, 15_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const messageText = content.trim();
    if (!messageText || sending) return;
    setSending(true);
    setError('');
    try {
      await api.sendDirectMessage({
        orderId: order.id,
        orderReference: order.reference,
        subject: `Commande ${order.reference}`,
        content: messageText,
        channel: 'in_app',
      });
      setContent('');
      await refresh(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le message n’a pas pu être envoyé. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="order-conversation-title" className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Échange lié à la commande</p>
            <h2 id="order-conversation-title" className="mt-1 text-base font-black text-slate-900">{order.reference}</h2>
            <p className="mt-0.5 text-xs text-slate-600">Votre message et la réponse de Gloryday resteront réunis ici.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => void refresh(true)} disabled={refreshing || loading} aria-label="Actualiser les messages" className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50">
              {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onClose} disabled={sending} aria-label="Fermer les messages" className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto bg-white p-4 sm:p-5">
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Chargement des messages…</div>
          ) : messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
              <MessageCircle className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">Aucun échange pour le moment</p>
              <p className="mt-1 text-xs text-slate-500">Écrivez à l’équipe au sujet de cette commande.</p>
            </div>
          ) : messages.map((message) => {
            const ownMessage = message.senderId === currentUser.id;
            const timestamp = new Date(message.createdAt);
            return (
              <article key={message.id} className={`max-w-[92%] rounded-2xl px-3.5 py-3 ${ownMessage ? 'ml-auto bg-blue-700 text-white' : 'mr-auto border border-slate-200 bg-slate-50 text-slate-900'}`}>
                <div className="flex items-center justify-between gap-4 text-[10px] opacity-75">
                  <strong>{ownMessage ? 'Vous' : message.senderRole === 'client' ? message.senderName : 'Équipe Gloryday'}</strong>
                  <time dateTime={message.createdAt}>{Number.isNaN(timestamp.getTime()) ? '' : timestamp.toLocaleString('fr-FR', { timeZone: 'Africa/Libreville', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
              </article>
            );
          })}
        </div>

        <form onSubmit={send} className="border-t border-slate-100 bg-white p-3 sm:p-4">
          <label htmlFor="order-conversation-message" className="sr-only">Votre message</label>
          <textarea id="order-conversation-message" rows={3} maxLength={5000} value={content} onChange={(event) => setContent(event.target.value)} disabled={sending} placeholder="Écrivez votre question ou précision…" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[10px] text-slate-500">Message privé à l’équipe Gloryday</span>
            <button type="submit" disabled={sending || !content.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
