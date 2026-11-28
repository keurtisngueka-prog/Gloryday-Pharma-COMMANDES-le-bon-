import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, MessageCircle, RefreshCw, Send, X } from 'lucide-react';
import { api } from '../api';
import type { DirectMessage, DirectMessageAttachment, Order, User } from '../types';

interface OrderConversationModalProps {
  order: Order;
  currentUser: User;
  intent?: 'message' | 'modification';
  onClose: () => void;
}

export const OrderConversationModal: React.FC<OrderConversationModalProps> = ({ order, currentUser, intent = 'message', onClose }) => {
  type PendingImage = { id: string; file: File; preview: string; uploaded?: DirectMessageAttachment };
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [content, setContent] = useState(() => intent === 'modification'
    ? `Bonjour, je souhaite demander une modification pour la commande ${order.reference}.\n\nChangements souhaités :\n• `
    : '');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [modificationSent, setModificationSent] = useState(false);
  const previewUrls = useRef(new Set<string>());

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

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
    const intervalId = window.setInterval(refreshWhenVisible, 10_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  const addImages = (files: FileList | null) => {
    if (!files?.length) return;
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const accepted: PendingImage[] = [];
    let nextError = '';
    for (const file of Array.from(files)) {
      if (!allowedTypes.has(file.type)) {
        nextError = 'Utilisez une image JPEG, PNG ou WebP.';
        continue;
      }
      if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
        nextError = 'Chaque image doit peser au maximum 5 Mo.';
        continue;
      }
      if (pendingImages.length + accepted.length >= 3) {
        nextError = 'Trois images maximum peuvent être jointes à un message.';
        continue;
      }
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      accepted.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, preview });
    }
    if (accepted.length) setPendingImages((current) => [...current, ...accepted]);
    setAttachmentError(nextError);
  };

  const removeImage = (id: string) => {
    const removed = pendingImages.find((image) => image.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.preview);
      previewUrls.current.delete(removed.preview);
    }
    setPendingImages((current) => current.filter((image) => image.id !== id));
    setAttachmentError('');
  };

  const clearImages = () => {
    pendingImages.forEach((image) => {
      URL.revokeObjectURL(image.preview);
      previewUrls.current.delete(image.preview);
    });
    setPendingImages([]);
    setAttachmentError('');
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const messageText = content.trim();
    if ((!messageText && pendingImages.length === 0) || sending) return;
    setSending(true);
    setError('');
    try {
      const attachments: DirectMessageAttachment[] = [];
      for (const image of pendingImages) {
        const uploaded = image.uploaded || await api.uploadOrderMessageAttachment(image.file, order.id);
        attachments.push(uploaded);
        if (!image.uploaded) {
          setPendingImages((current) => current.map((item) => item.id === image.id ? { ...item, uploaded } : item));
        }
      }
      await api.sendDirectMessage({
        orderId: order.id,
        orderReference: order.reference,
        subject: intent === 'modification'
          ? `Demande de modification · ${order.reference}`
          : `Commande ${order.reference}`,
        content: messageText,
        attachments,
        channel: 'in_app',
      });
      setContent('');
      clearImages();
      if (intent === 'modification') setModificationSent(true);
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
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">{intent === 'modification' ? 'Demande de modification' : 'Échange lié à la commande'}</p>
            <h2 id="order-conversation-title" className="mt-1 text-base font-black text-slate-900">{order.reference}</h2>
            <p className="mt-0.5 text-xs text-slate-600">{intent === 'modification' ? 'Votre demande et la réponse de Gloryday resteront réunies ici.' : 'Votre message et la réponse de Gloryday resteront réunis ici.'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => void refresh(true)} disabled={refreshing || loading} aria-label="Actualiser les messages" className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50">
              {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onClose} disabled={sending} aria-label="Fermer les messages" className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50"><X className="h-5 w-5" /></button>
          </div>
        </header>

        {intent === 'modification' && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-950 sm:px-5">
            <p className="font-bold">Décrivez ce que vous souhaitez changer.</p>
            <p className="mt-0.5">L’équipe vérifiera les articles, le stock et le nouveau montant éventuel, puis vous répondra ici. La commande ne change pas tant que la modification n’a pas été confirmée.</p>
          </div>
        )}

        <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto bg-white p-4 sm:p-5">
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{error}</p>}
          {modificationSent && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">Votre demande est envoyée et reste liée à cette commande. La réponse apparaîtra dans cette conversation.</p>}
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
                {message.content && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>}
                {message.attachments?.length ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {message.attachments.map((attachment) => attachment.signedUrl ? (
                      <a key={attachment.path} href={attachment.signedUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/20 bg-black/5">
                        <img src={attachment.signedUrl} alt={attachment.originalName || 'Photo jointe'} loading="lazy" className="aspect-square w-full object-cover" />
                      </a>
                    ) : (
                      <p key={attachment.path} className="rounded-xl bg-black/5 px-2 py-3 text-center text-[10px]">Photo indisponible</p>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <form onSubmit={send} className="border-t border-slate-100 bg-white p-3 sm:p-4">
          <label htmlFor="order-conversation-message" className="sr-only">Votre message</label>
          <textarea id="order-conversation-message" rows={3} maxLength={5000} value={content} onChange={(event) => { setContent(event.target.value); setModificationSent(false); }} disabled={sending} placeholder={intent === 'modification' ? 'Indiquez le produit, la quantité ou l’information à modifier…' : 'Écrivez votre question ou précision…'} className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50" />
          {pendingImages.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {pendingImages.map((image) => (
                <div key={image.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={image.preview} alt={image.file.name} className="aspect-square w-full object-cover" />
                  <button type="button" onClick={() => removeImage(image.id)} disabled={sending} aria-label={`Retirer ${image.file.name}`} className="absolute right-1 top-1 rounded-full bg-slate-950/75 p-1 text-white disabled:opacity-50"><X className="h-3 w-3" /></button>
                  {image.uploaded && <span className="absolute bottom-1 left-1 rounded bg-emerald-700/90 px-1.5 py-0.5 text-[9px] font-bold text-white">Prête</span>}
                </div>
              ))}
            </div>
          )}
          {attachmentError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{attachmentError}</p>}
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                <ImagePlus className="h-4 w-4 text-blue-700" /> Joindre une photo
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={sending || pendingImages.length >= 3} onChange={(event) => { addImages(event.target.files); event.currentTarget.value = ''; }} className="sr-only" />
              </label>
              <span className="text-[10px] text-slate-500">Privé · JPEG, PNG ou WebP · 5 Mo max. par image</span>
            </div>
            <button type="submit" disabled={sending || (!content.trim() && pendingImages.length === 0)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
