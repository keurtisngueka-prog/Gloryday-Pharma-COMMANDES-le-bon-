import type { Request, Response } from 'express';
import { getVercelApp } from '../server.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const incomingUrl = new URL(req.url || '/', 'https://gloryday.invalid');
    // Vercel can pass an absolute-form URL; Express expects an origin-form path.
    req.url = `${incomingUrl.pathname}${incomingUrl.search}`;
    if (incomingUrl.searchParams.get('__gloryday_gateway') === '1') {
      const forwardedPath = incomingUrl.searchParams.get('__gloryday_path');
      const segments = forwardedPath?.split('/').filter(Boolean) ?? [];
      if (!segments.length || segments.some((segment) => segment === '.' || segment === '..' || segment.includes('\\'))) {
        res.status(400).json({ error: 'Chemin API invalide.' });
        return;
      }

      const query = new URLSearchParams(incomingUrl.searchParams);
      query.delete('__gloryday_gateway');
      query.delete('__gloryday_path');
      const forwardedQuery = query.toString();
      req.url = `/api/${segments.map(encodeURIComponent).join('/')}${forwardedQuery ? `?${forwardedQuery}` : ''}`;
    }

    // Vercel exposes req.query through a legacy getter that calls url.parse() on Node 24.
    // Parse the query with URLSearchParams and shadow that getter before Express reads it.
    const queryStart = req.url.indexOf('?');
    const queryString = queryStart >= 0 ? req.url.slice(queryStart + 1) : '';
    const queryParams: Record<string, string | string[]> = Object.create(null);
    for (const [key, value] of new URLSearchParams(queryString)) {
      const existing = queryParams[key];
      queryParams[key] = existing === undefined ? value : Array.isArray(existing) ? [...existing, value] : [existing, value];
    }
    Object.defineProperty(req, 'query', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: queryParams
    });

    // Do not cache a rejected initialization promise at module scope. A transient
    // Supabase/network failure must be allowed to recover on the next request.
    const app = await getVercelApp();
    app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    res.status(503).json({ error: 'Le serveur Gloryday Pharma n’est pas encore configuré.' });
  }
}
