/* This file is imported by the Workbox-generated service worker. */
self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = String(payload.title || 'Gloryday Pharma').slice(0, 120);
  const options = {
    body: String(payload.body || 'Vous avez une nouvelle information.').slice(0, 800),
    icon: '/pwa-192x192.png?v=2',
    badge: '/icon.svg?v=2',
    data: { url: typeof payload.url === 'string' ? payload.url : '/' },
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 64) : 'gloryday-notification',
    renotify: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  let targetUrl = '/';
  try {
    const parsed = new URL(event.notification.data?.url || '/', self.location.origin);
    if (parsed.origin === self.location.origin) targetUrl = parsed.href;
  } catch {
    targetUrl = self.location.origin + '/';
  }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.navigate(targetUrl);
      return existing.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});
