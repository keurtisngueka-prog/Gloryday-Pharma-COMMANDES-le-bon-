export interface CleanupReport {
  removedOrdersCount: number;
  removedLogsCount: number;
  removedAccountsCount: number;
  removedNotificationsCount: number;
  serverCleaned: boolean;
  timestamp: string;
}

/**
 * Data cleanup is intentionally disabled here. The previous browser routine
 * could erase the demo account and its order history, and it did not clean the
 * Supabase stock ledger. A reviewed, server-side operation is required before
 * any operational data can be removed safely.
 */
export async function executeProductionCleanup(_options: { fullReset?: boolean } = {}): Promise<CleanupReport> {
  throw new Error(
    'La remise à zéro est désactivée : vérifiez le compte démo et les données à préserver avant toute suppression.'
  );
}

/** Do not run destructive cleanup during application startup. */
export async function ensureProductionCleanSlateOnBoot(): Promise<void> {
  return;
}
