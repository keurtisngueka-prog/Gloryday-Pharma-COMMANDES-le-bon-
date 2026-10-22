import { useEffect, useRef } from 'react';
import { api } from '../api';

interface LiveLocationPublisherProps {
  trackingToken: string | null;
  onError: (message: string) => void;
  onStopped: () => void;
}

const REPORT_INTERVAL_MS = 15_000;

export function LiveLocationPublisher({ trackingToken, onError, onStopped }: LiveLocationPublisherProps) {
  const onErrorRef = useRef(onError);
  const onStoppedRef = useRef(onStopped);

  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onStoppedRef.current = onStopped; }, [onStopped]);

  useEffect(() => {
    if (!trackingToken) return;
    if (!window.isSecureContext) {
      onErrorRef.current('Le GPS nécessite une connexion sécurisée (HTTPS).');
      onStoppedRef.current();
      return;
    }
    if (!navigator.geolocation) {
      onErrorRef.current('La géolocalisation n’est pas disponible sur cet appareil.');
      onStoppedRef.current();
      return;
    }

    let watchId: number | null = null;
    let timerId: number | null = null;
    let latestPosition: GeolocationPosition | null = null;
    let lastSentAt = 0;
    let sending = false;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timerId !== null) window.clearInterval(timerId);
      onStoppedRef.current();
    };

    const sendLatestPosition = async () => {
      if (!latestPosition || sending || Date.now() - lastSentAt < REPORT_INTERVAL_MS) return;
      sending = true;
      const position = latestPosition;
      try {
        await api.postCourierTrackingLocation(trackingToken, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        lastSentAt = Date.now();
        onErrorRef.current('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Envoi de la position impossible. Vérifiez le réseau.';
        onErrorRef.current(message);
        if (/suivi GPS indisponible|ce lien de suivi|livraison est terminée|connexion requise|rôle ne permet|commande ne peut pas partager|partage de position est réservé/i.test(message)) stop();
      } finally {
        sending = false;
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        latestPosition = position;
        void sendLatestPosition();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          onErrorRef.current('Autorisez la géolocalisation dans les réglages du navigateur pour démarrer le suivi.');
          stop();
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          onErrorRef.current('Le GPS ne reçoit pas de position. Le suivi reprendra dès que le signal reviendra.');
        } else {
          onErrorRef.current('Le GPS met trop de temps à répondre. Gardez l’application ouverte et vérifiez le signal.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    timerId = window.setInterval(() => void sendLatestPosition(), REPORT_INTERVAL_MS);

    return () => {
      stopped = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timerId !== null) window.clearInterval(timerId);
    };
  }, [trackingToken]);

  return null;
}
