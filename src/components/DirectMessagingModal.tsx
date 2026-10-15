import React, { useState } from 'react';
import { X, Send, Bell, MessageCircle, AlertCircle } from 'lucide-react';
import { api } from '../api';

interface DirectMessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClient?: any | null;
  onSuccess: () => void;
}

export const DirectMessagingModal: React.FC<DirectMessagingModalProps> = ({
  isOpen,
  onClose,
  targetClient,
  onSuccess
}) => {
  const [subject, setSubject] = useState(targetClient ? `Information - ${targetClient.facilityName}` : 'Communication Gloryday Pharma');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<'in_app' | 'whatsapp' | 'both'>('in_app');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      setError('Veuillez renseigner un objet et un message');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await api.sendDirectMessage({
        recipientId: targetClient ? targetClient.id : undefined,
        recipientFacilityName: targetClient ? targetClient.facilityName : undefined,
        recipientPhone: targetClient ? targetClient.phone : undefined,
        subject: subject.trim(),
        content: content.trim(),
        channel
      });
      if (channel === 'whatsapp' || channel === 'both') {
        const phone = targetClient ? targetClient.phone.replace(/[^0-9]/g, '') : '24177003004';
        const waMsg = `*${subject.trim()}*\n\n${content.trim()}\n\n— Gloryday Pharma`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l envoi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 px-6 border-b border-slate-100 bg-[#0f0f12] text-white flex items-center justify-between">
          <h3 className="font-bold text-sm">
            {targetClient ? `Message à ${targetClient.facilityName}` : 'Communication Générale'}
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Canal de diffusion
            </label>
            <div className="grid grid-cols-3 gap-1.5 font-semibold">
              <button
                type="button"
                onClick={() => setChannel('in_app')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-1 ${
                  channel === 'in_app' ? 'bg-[#eef3ff] border-[#0d44e8] text-[#0d44e8] font-bold' : 'border-slate-200 text-slate-600'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                In-App
              </button>
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-1 ${
                  channel === 'whatsapp' ? 'bg-[#eef3ff] border-[#0d44e8] text-[#0d44e8] font-bold' : 'border-slate-200 text-slate-600'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel('both')}
                className={`p-2 rounded-xl border flex items-center justify-center gap-1 ${
                  channel === 'both' ? 'bg-[#eef3ff] border-[#0d44e8] text-[#0d44e8] font-bold' : 'border-slate-200 text-slate-600'
                }`}
              >
                Les deux
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Objet du message
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Message
            </label>
            <textarea
              required
              rows={4}
              placeholder="Ex: Arrivage récent de seringues et cathéters avec remise exceptionnelle..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2 px-5 rounded-xl bg-[#0d44e8] hover:bg-[#0b3ac7] text-white font-bold flex items-center gap-1.5 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Envoi...' : 'Envoyer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
