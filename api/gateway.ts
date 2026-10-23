import type { Request, Response } from 'express';
import { getVercelApp } from '../server.js';

const appPromise = getVercelApp();

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const incomingUrl = new URL(req.url || '/', 'https://gloryday.invalid');
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

    const app = await appPromise;
    app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    res.status(503).json({ error: 'Le serveur Gloryday Pharma n’est pas encore configuré.' });
  }
}
