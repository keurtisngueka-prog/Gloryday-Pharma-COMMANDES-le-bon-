import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Navigation, ShieldCheck, Smartphone, Truck } from 'lucide-react';
import type { CourierTrackingInfo } from '../types';
import { api } from '../api';
import { LiveLocationPublisher } from './LiveLocationPublisher';

interface CourierTrackingPageProps {
  token: string;
}

export function CourierTrackingPage({ token }: CourierTrackingPageProps) {
  const [info, setInfo] = useState<CourierTrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [sentFirstPoint, setSentFirstPoint] = useState(false);

  useEffect(() => {
    let active = true;
    api.getCourierTrackingInfo(token)
      .then((result) => { if (active) setInfo(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Ce lien de suivi est invalide ou expiré.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const handleError = useCallback((message: string) => {
    setError(message);
    if (!message) setSentFirstPoint(true);
  }, []);
  const handleStopped = useCallback(() => setSharing(false), []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="bg-slate-950 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600"><Truck className="h-6 w-6" /></div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-300">Gloryday Pharma</div>
              <h1 className="text-xl font-black">Suivi de livraison</h1>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-5 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">Vérification du lien de suivi…</div>
          ) : error && !info ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div>
          ) : info ? (
            <>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Commande</div>
                    <div className="font-mono text-lg font-black text-slate-950">{info.orderReference}</div>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 text-blue-700"><ShieldCheck className="h-5 w-5" /></div>
                </div>
                <div className="mt-3 border-t border-blue-100 pt-3">
                  <div className="text-xs font-extrabold text-slate-900">{info.facilityName}</div>
                  <div className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-slate-600">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span>{info.deliveryAddress}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">Réception : {info.contactName} · {info.contactPhone}</div>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${sharing ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-xl p-2 ${sharing ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600'}`}>
                    {sharing ? <CheckCircle2 className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold">{sharing ? 'Partage GPS activé' : 'Partager votre position GPS'}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Votre position sera visible par le client de cette commande et par la logistique pendant la livraison.
                    </p>
                  </div>
                </div>
                {!sharing ? (
                  <button
                    type="button"
                    onClick={() => { setError(''); setSharing(true); }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-extrabold text-white hover:bg-blue-800"
                  >
                    <Navigation className="h-4 w-4" /> Démarrer le partage GPS
                  </button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-600" />
                      {sentFirstPoint ? 'Position envoyée · mise à jour toutes les 15 secondes' : 'Recherche du signal GPS…'}
                    </div>
                    <button type="button" onClick={() => setSharing(false)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                      Arrêter le partage sur ce téléphone
                    </button>
                  </div>
                )}
              </div>

              {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-900">{error}</div>}
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <span>Autorisez la géolocalisation dans le navigateur et gardez cette page ouverte pendant le trajet. Le lien expire le {new Date(info.expiresAt).toLocaleString('fr-FR')}.</span>
              </div>
              {sharing && <LiveLocationPublisher trackingToken={token} onError={handleError} onStopped={handleStopped} />}
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
