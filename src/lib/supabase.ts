import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_REF = 'kqvfoltosjrjvghaizpd';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

function isTestOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.local') ||
    lower.endsWith('.test') ||
    lower.includes('example.com') ||
    lower.includes('your-project') ||
    lower.includes('staging') ||
    lower.includes('test-project')
  );
}

export function normalizeSupabaseUrl(raw?: string): string {
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_SUPABASE_URL;
  }
  const cleaned = raw.trim().replace(/^['"]|['"]$/g, '').trim();
  if (
    !cleaned ||
    cleaned === 'undefined' ||
    cleaned === 'null' ||
    cleaned.includes('your-project') ||
    cleaned.includes('your_supabase_url') ||
    cleaned.includes('localhost') ||
    cleaned.includes('127.0.0.1')
  ) {
    return DEFAULT_SUPABASE_URL;
  }

  // If only the project ref (e.g., kqvfoltosjrjvghaizpd) was provided
  if (/^[a-z0-9]{15,30}$/i.test(cleaned)) {
    return `https://${cleaned.toLowerCase()}.supabase.co`;
  }

  // If domain without protocol (e.g., kqvfoltosjrjvghaizpd.supabase.co) was provided
  const candidate = /^[a-z0-9-]+\.supabase\.co(\/.*)?$/i.test(cleaned)
    ? `https://${cleaned}`
    : cleaned;

  try {
    const parsed = new URL(candidate);
    if (isTestOrLocalHost(parsed.hostname)) {
      return DEFAULT_SUPABASE_URL;
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return `https://${parsed.host}`;
    }
  } catch {
    // Fallback to production URL if invalid format (e.g. CLI command or postgres:// URI)
  }

  return DEFAULT_SUPABASE_URL;
}

export function normalizeSupabaseKey(raw?: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }
  const cleaned = raw.trim().replace(/^['"]|['"]$/g, '').trim();
  const lower = cleaned.toLowerCase();
  if (
    !cleaned ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower === 'your_supabase_anon_key' ||
    lower.startsWith('your_') ||
    lower.startsWith('test_') ||
    lower === 'placeholder'
  ) {
    return '';
  }
  return cleaned;
}

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const procEnv = (typeof process !== 'undefined' && process.env) || {};

const rawEnvUrl =
  metaEnv.VITE_SUPABASE_URL ||
  metaEnv.SUPABASE_URL ||
  procEnv.VITE_SUPABASE_URL ||
  procEnv.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

const rawEnvKey =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.SUPABASE_ANON_KEY ||
  procEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.SUPABASE_ANON_KEY ||
  '';

export const supabaseUrl = normalizeSupabaseUrl(rawEnvUrl);
export const supabaseAnonKey = normalizeSupabaseKey(rawEnvKey);
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function initSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Supabase client initialization skipped:', err);
    return null;
  }
}

export const supabase: SupabaseClient | null = initSupabaseClient();
