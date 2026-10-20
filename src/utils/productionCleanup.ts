import { Order, AppNotification } from '../types';
import { AuditLogEntry, clearAuditLogs } from './auditLogger';

export const PRODUCTION_CLEANUP_FLAG_KEY = 'gloryday_production_clean_state_v2';

export const DEMO_ORDER_IDS = new Set([
  'ord-demo-01',
  'ord-demo-02',
  'ord-1792474689944',
  'ord-1792473572477',
  'ord-1792473563555',
  'ord-1792473303182'
]);

export const DEMO_ORDER_REFERENCES = new Set([
  'GP-2026-0042',
  'GP-2025-0089',
  'GP-2025-0088'
]);

export const DEMO_ACCOUNT_IDS = new Set([
  'usr-ste-marie',
  'usr-pharma-mer',
  'usr-rapha',
  'client-1',
  'client-2'
]);

export const DEMO_STRUCTURE_IDS = new Set([
  'struct-chambrier',
  'struct-el-rapha',
  'struct-chul',
  'struct-bio-sante',
  'struct-pharm-forestiers',
  'struct-ebori'
]);

export function isDemoOrder(order: Partial<Order> | null | undefined): boolean {
  if (!order) return false;
  if (order.id && (DEMO_ORDER_IDS.has(order.id) || order.id.startsWith('ord-demo-'))) {
    return true;
  }
  if (order.reference && (DEMO_ORDER_REFERENCES.has(order.reference) || order.reference.includes('DEMO'))) {
    return true;
  }
  const notes = (order.customer?.notes || '').trim().toLowerCase();
  const address = (order.customer?.deliveryAddress || '').trim().toLowerCase();
  if (notes === 'hjjj' || address.includes('fgfghhjj') || address.includes('repère : 202020')) {
    return true;
  }
  return false;
}

export function isDemoAuditLog(log: Partial<AuditLogEntry> | null | undefined): boolean {
  if (!log) return false;
  if (log.id && (log.id.startsWith('aud-seed-') || log.id.startsWith('aud-demo-') || log.id.startsWith('wa-ord-wlog-demo'))) {
    return true;
  }
  if (log.targetReference && DEMO_ORDER_REFERENCES.has(log.targetReference)) {
    return true;
  }
  return false;
}

export function isDemoNotification(notif: Partial<AppNotification> | null | undefined): boolean {
  if (!notif) return false;
  if (notif.id && (notif.id.includes('demo') || notif.id.startsWith('notif-promo-'))) {
    return true;
  }
  if (notif.orderId && DEMO_ORDER_IDS.has(notif.orderId)) {
    return true;
  }
  if (notif.orderReference && DEMO_ORDER_REFERENCES.has(notif.orderReference)) {
    return true;
  }
  return false;
}

export interface CleanupReport {
  removedOrdersCount: number;
  removedLogsCount: number;
  removedAccountsCount: number;
  removedNotificationsCount: number;
  serverCleaned: boolean;
  timestamp: string;
}

/**
 * Purges demo/fictional orders, audit logs, notifications, and test accounts
 * from localStorage and synchronizes with the backend server store.
 * When `fullReset` is true, it wipes all orders, logs, quotes, messages, and notifications
 * to guarantee a 100% virgin state for production launch.
 */
export async function executeProductionCleanup(options: { fullReset?: boolean } = {}): Promise<CleanupReport> {
  const { fullReset = true } = options;
  let removedOrdersCount = 0;
  let removedLogsCount = 0;
  let removedAccountsCount = 0;
  let removedNotificationsCount = 0;

  try {
    // 1. Clean Guest / Local Orders
    const rawOrders = localStorage.getItem('gloryday_guest_orders');
    if (rawOrders) {
      const parsed: Order[] = JSON.parse(rawOrders);
      if (Array.isArray(parsed)) {
        if (fullReset) {
          removedOrdersCount += parsed.length;
          localStorage.setItem('gloryday_guest_orders', JSON.stringify([]));
        } else {
          const kept = parsed.filter(o => !isDemoOrder(o));
          removedOrdersCount += parsed.length - kept.length;
          localStorage.setItem('gloryday_guest_orders', JSON.stringify(kept));
        }
      }
    }

    // 2. Clean System Audit Logs
    const rawLogs = localStorage.getItem('gloryday_system_audit_logs');
    if (rawLogs) {
      const parsedLogs: AuditLogEntry[] = JSON.parse(rawLogs);
      if (Array.isArray(parsedLogs)) {
        if (fullReset) {
          removedLogsCount += parsedLogs.length;
          clearAuditLogs();
        } else {
          const keptLogs = parsedLogs.filter(l => !isDemoAuditLog(l));
          removedLogsCount += parsedLogs.length - keptLogs.length;
          localStorage.setItem('gloryday_system_audit_logs', JSON.stringify(keptLogs));
        }
      }
    } else if (fullReset) {
      clearAuditLogs();
    }

    // 3. Clean Registered Accounts (v1 and v2)
    for (const key of ['gloryday_registered_users', 'gloryday_registered_users_v2']) {
      const rawAcc = localStorage.getItem(key);
      if (rawAcc) {
        const parsedAcc: any[] = JSON.parse(rawAcc);
        if (Array.isArray(parsedAcc)) {
          if (fullReset) {
            removedAccountsCount += parsedAcc.length;
            localStorage.setItem(key, JSON.stringify([]));
          } else {
            const keptAcc = parsedAcc.filter(a => {
              const id = a?.user?.id || a?.id;
              return id && !DEMO_ACCOUNT_IDS.has(id);
            });
            removedAccountsCount += parsedAcc.length - keptAcc.length;
            localStorage.setItem(key, JSON.stringify(keptAcc));
          }
        }
      }
    }

    // 4. Clean Demo Healthcare Structures
    const rawStructs = localStorage.getItem('gloryday_healthcare_structures_v1');
    if (rawStructs) {
      const parsedStructs: any[] = JSON.parse(rawStructs);
      if (Array.isArray(parsedStructs)) {
        const keptStructs = fullReset
          ? []
          : parsedStructs.filter(s => s?.id && !DEMO_STRUCTURE_IDS.has(s.id));
        localStorage.setItem('gloryday_healthcare_structures_v1', JSON.stringify(keptStructs));
      }
    }

    // 5. Clean Drafts & Auto-drafts on full reset
    if (fullReset) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('gloryday_drafts_') || k.startsWith('gloryday_autodraft_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    localStorage.setItem(PRODUCTION_CLEANUP_FLAG_KEY, new Date().toISOString());
  } catch (err) {
    console.error('Error cleaning local storage for production:', err);
  }

  // 6. Trigger Backend Server Store Cleanup
  let serverCleaned = false;
  try {
    const response = await fetch('/api/admin/production-cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullReset })
    });
    if (response.ok) {
      const data = await response.json();
      removedOrdersCount += Number(data.removedOrdersCount || 0);
      removedNotificationsCount += Number(data.removedNotificationsCount || 0);
      removedAccountsCount += Number(data.removedAccountsCount || 0);
      serverCleaned = true;
    }
  } catch {
    // Offline or static environment fallback
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gloryday_audit_updated'));
    window.dispatchEvent(new CustomEvent('gloryday_drafts_updated'));
    window.dispatchEvent(new CustomEvent('gloryday_production_cleaned'));
  }

  return {
    removedOrdersCount,
    removedLogsCount,
    removedAccountsCount,
    removedNotificationsCount,
    serverCleaned,
    timestamp: new Date().toISOString()
  };
}

/**
 * Automatically runs once when transitioning to the production environment
 * to guarantee that no demo orders, fictional logs, or test notifications remain.
 */
export async function ensureProductionCleanSlateOnBoot(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const alreadyCleaned = localStorage.getItem(PRODUCTION_CLEANUP_FLAG_KEY);
    if (!alreadyCleaned) {
      await executeProductionCleanup({ fullReset: true });
    } else {
      // Always strip any residual demo items even after initial boot
      await executeProductionCleanup({ fullReset: false });
    }
  } catch (e) {
    console.error('Failed to run boot production cleanup:', e);
  }
}
