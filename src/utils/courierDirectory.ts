import { Courier } from '../types';

const COURIERS_STORAGE_KEY = 'gloryday_couriers_directory_v1';
const LEGACY_DEMO_COURIER_PHONES: Record<string, string> = {
  'cour-1': '24174123456',
  'cour-2': '24165987654',
  'cour-3': '24177889900',
  'cour-4': '24166112233',
};

export function normalizeCourierPhone(phone: string | undefined): string {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * Returns genuine records saved by an older browser-only version so they can
 * be copied once into the shared server directory. The old hard-coded demo
 * couriers are deliberately excluded.
 */
export function getLegacyCouriersForMigration(): Courier[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(COURIERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): Courier[] => {
      if (!value || typeof value !== 'object') return [];
      const entry = value as Partial<Courier>;
      const id = String(entry.id || '').trim();
      const name = String(entry.name || '').trim();
      const phone = String(entry.phone || '').trim();
      const phoneKey = normalizeCourierPhone(phone);
      if (!id || !name || !phoneKey || LEGACY_DEMO_COURIER_PHONES[id] === phoneKey) return [];
      return [{
        id,
        name: name.slice(0, 120),
        phone: phone.slice(0, 40),
        vehicle: String(entry.vehicle || '').trim().slice(0, 100),
        matricule: String(entry.matricule || '').trim().slice(0, 50),
        currentZone: String(entry.currentZone || '').trim().slice(0, 100) || undefined,
        estimatedTime: String(entry.estimatedTime || '').trim().slice(0, 100) || undefined,
        active: entry.active !== false,
      }];
    });
  } catch {
    return [];
  }
}

export function clearLegacyCourierDirectory(): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(COURIERS_STORAGE_KEY);
  } catch {
    // The shared server directory remains the source of truth.
  }
}
