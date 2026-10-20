import {createRoot} from 'react-dom/client';
import App from './App.tsx';
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

createRoot(document.getElementById('root')!).render(<App />);

