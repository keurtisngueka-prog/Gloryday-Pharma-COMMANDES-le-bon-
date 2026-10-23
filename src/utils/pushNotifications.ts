export type PushNotificationStatus =
  | 'signed-out'
  | 'unconfigured'
  | 'unsupported'
  | 'permission-denied'
  | 'available'
  | 'enabled'
  | 'loading'
  | 'error';

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

type PushEnvironment = { env: { PROD: boolean; APP_PUBLIC_VAPID_KEY?: string } };

export function getPushPublicKey(): string {
  return String((import.meta as ImportMeta & PushEnvironment).env.APP_PUBLIC_VAPID_KEY || '').trim();
}

export function getPushSupportStatus(): 'unconfigured' | 'unsupported' | 'permission-denied' | 'available' {
  if (!getPushPublicKey()) return 'unconfigured';
  if (!(import.meta as ImportMeta & PushEnvironment).env.PROD) return 'unsupported';
  if (typeof window === 'undefined' || !window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'permission-denied';
  return 'available';
}

function decodeVapidKey(key: string): ArrayBuffer {
  const padded = `${key}${'='.repeat((4 - (key.length % 4)) % 4)}`;
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = window.atob(base64);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

async function getReadyPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js');
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Le service de notifications ne répond pas encore. Rechargez le site puis réessayez.')), 15_000);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function createPushSubscription(): Promise<PushSubscriptionPayload> {
  const status = getPushSupportStatus();
  if (status !== 'available') {
    throw new Error(status === 'unconfigured'
      ? 'Les notifications push ne sont pas encore configurées sur le site.'
      : status === 'permission-denied'
        ? 'Les notifications sont bloquées dans les réglages de ce navigateur.'
        : 'Ce navigateur ou cet appareil ne prend pas en charge les notifications push ici.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Autorisation refusée. Vous pouvez la modifier dans les réglages du navigateur.'
      : 'Autorisation des notifications non accordée.');
  }

  const registration = await getReadyPushServiceWorker();
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeVapidKey(getPushPublicKey())
  });
  const payload = subscription.toJSON();
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth) {
    if (!existing) await subscription.unsubscribe();
    throw new Error('Le navigateur n’a pas fourni un abonnement de notification complet.');
  }
  return {
    endpoint: payload.endpoint,
    expirationTime: payload.expirationTime,
    keys: { p256dh: payload.keys.p256dh, auth: payload.keys.auth }
  };
}
