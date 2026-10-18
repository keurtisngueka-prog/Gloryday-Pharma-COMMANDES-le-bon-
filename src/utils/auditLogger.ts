import { AuditEntry, AuditActionType, AppRole, User } from '../types';

const AUDIT_STORAGE_KEY = 'gloryday_audit_log_v1';

function getClientDeviceInfo(): string {
  if (typeof window === 'undefined' || !window.navigator) {
    return 'Serveur / Environnement API';
  }
  const ua = window.navigator.userAgent;
  let os = 'Inconnu';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = 'Navigateur';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  const screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
  return `${os} · ${browser} (${screenResolution})`;
}

export function getAuditLogs(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Erreur lecture audit log:', err);
    return [];
  }
}

export function logAuditEvent(
  user: { id?: string; contactName?: string; facilityName?: string; role?: AppRole } | null,
  actionType: AuditActionType,
  targetEntity: string,
  targetId: string,
  details: string,
  previousState?: string,
  newState?: string
): AuditEntry {
  const currentLogs = getAuditLogs();
  
  const entry: AuditEntry = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    userId: user?.id || 'ANONYMOUS',
    userName: user?.contactName || user?.facilityName || 'Utilisateur Système',
    userRole: user?.role || 'client',
    actionType,
    targetEntity,
    targetId,
    deviceInfo: getClientDeviceInfo(),
    details,
    previousState,
    newState
  };

  // Add in front (most recent first) and persist.
  // Note: Entries are immutable and cannot be edited or deleted through UI.
  const updated = [entry, ...currentLogs].slice(0, 1000); // preserve up to 1000 actions
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erreur écriture audit log:', e);
  }

  return entry;
}
