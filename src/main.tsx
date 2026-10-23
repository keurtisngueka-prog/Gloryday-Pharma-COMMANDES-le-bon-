import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CourierTrackingPage } from './components/CourierTrackingPage';
import './index.css';

// Recover a tab opened before a deployment replaced its hashed lazy-loaded chunks.
if (typeof window !== 'undefined') {
  const preloadReloadKey = 'gloryday-preload-reload-at';
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const now = Date.now();
    let lastReloadAt = 0;
    try { lastReloadAt = Number(sessionStorage.getItem(preloadReloadKey)) || 0; } catch {}

    if (!lastReloadAt || now - lastReloadAt > 60_000) {
      try { sessionStorage.setItem(preloadReloadKey, String(now)); } catch {}
      const reload = () => window.location.reload();
      if ('serviceWorker' in navigator) {
        const timeout = window.setTimeout(reload, 2500);
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) void registration.update().finally(() => {
            window.clearTimeout(timeout);
            reload();
          });
        }).catch(() => {
          window.clearTimeout(timeout);
          reload();
        });
      } else {
        reload();
      }
      return;
    }

    const bannerId = 'gloryday-preload-error';
    if (!document.getElementById(bannerId)) {
      const banner = document.createElement('div');
      banner.id = bannerId;
      banner.setAttribute('role', 'alert');
      banner.style.cssText = 'position:fixed;z-index:99999;inset:auto 16px 16px;padding:16px;border-radius:14px;background:#172033;color:#fff;font:14px system-ui;box-shadow:0 12px 40px #0005';
      const text = document.createElement('span');
      text.textContent = 'Une mise à jour du site est en cours. Rechargez la page pour continuer.';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Recharger';
      button.style.cssText = 'margin-left:12px;padding:8px 12px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer';
      button.addEventListener('click', () => {
        try { sessionStorage.removeItem(preloadReloadKey); } catch {}
        window.location.reload();
      });
      banner.append(text, button);
      document.body.appendChild(banner);
    }
  });
}

// Safely handle service worker registration without triggering Vite HMR send in dev mode
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if ((import.meta as ImportMeta & { env: { PROD: boolean } }).env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  } else {
    // Clean up any stale dev-sw.js registered previously
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
}

const courierTrackingMatch = window.location.pathname.match(/^\/courier-track\/([A-Za-z0-9_-]{32,64})\/?$/);

createRoot(document.getElementById('root')!).render(
  courierTrackingMatch ? <CourierTrackingPage token={courierTrackingMatch[1]} /> : <App />
);
