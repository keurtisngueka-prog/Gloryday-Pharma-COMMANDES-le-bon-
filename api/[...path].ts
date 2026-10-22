import type { Request, Response } from 'express';
import { getVercelApp } from '../server.js';

const appPromise = getVercelApp();

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const app = await appPromise;
    app(req, res);
  } catch (error) {
    console.error('Vercel API initialization failed:', error);
    res.status(503).json({ error: 'Le serveur Gloryday Pharma n’est pas encore configuré.' });
  }
}
