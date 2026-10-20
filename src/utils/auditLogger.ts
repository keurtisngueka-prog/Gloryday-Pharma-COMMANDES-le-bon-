export type AuditCategory = 'order' | 'delivery' | 'whatsapp' | 'stock' | 'auth' | 'settings';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: AuditCategory;
  action: string;
  actorName: string;
  actorRole: string;
  targetReference?: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

const AUDIT_STORAGE_KEY = 'gloryday_system_audit_logs';

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: AuditLogEntry[] = JSON.parse(raw);
    // Automatically strip any legacy demo seed entries (aud-seed-*)
    const cleaned = Array.isArray(parsed) ? parsed.filter(l => !l.id.startsWith('aud-seed-')) : [];
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };

  try {
    const existing = getAuditLogs();
    const updated = [newEntry, ...existing].slice(0, 300);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gloryday_audit_updated'));
    }
  } catch (e) {
    console.error('Failed to record audit log', e);
  }

  return newEntry;
}

export function clearAuditLogs(): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gloryday_audit_updated'));
    }
  } catch (e) {
    console.error('Failed to clear audit logs', e);
  }
}

export function logAuditEvent(
  user: { contactName?: string; facilityName?: string; role?: string } | null | undefined,
  actionType: string,
  entityName: string,
  targetReference: string,
  details: string,
  _previousValue?: string,
  _newValue?: string
): AuditLogEntry {
  const categoryMap: Record<string, AuditCategory> = {
    mouvement_stock: 'stock',
    validation_paiement: 'order',
    export_donnees: 'order',
    statut_commande: 'delivery',
    statut_client: 'auth'
  };
  return recordAuditLog({
    category: categoryMap[actionType] || 'order',
    action: `${entityName}`,
    actorName: user?.contactName || user?.facilityName || 'Opérateur',
    actorRole: user?.role || 'Super-Admin',
    targetReference,
    details,
    status: 'success'
  });
}
