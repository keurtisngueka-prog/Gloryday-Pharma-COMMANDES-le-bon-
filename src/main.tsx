import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CourierTrackingPage } from './components/CourierTrackingPage';
import './index.css';

// Safely handle service worker registration without triggering Vite HMR send in dev mode
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
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
