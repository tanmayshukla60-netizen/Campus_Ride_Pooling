import { query } from '../db';

let intervalTimer: NodeJS.Timeout | null = null;

export async function processHoldExpirations(): Promise<number> {
  try {
    const res = await query('SELECT expire_holds() AS result;');
    const count = res.rows[0]?.result?.expired_count || 0;
    if (count > 0) {
      console.log(`[HOLD_EXPIRY_JOB] Successfully released ${count} expired seat hold(s).`);
    }
    return count;
  } catch (err) {
    console.error('[HOLD_EXPIRY_JOB] Error running expire_holds():', err);
    return 0;
  }
}

export function startHoldExpiryJob(intervalSeconds: number = 30): void {
  if (intervalTimer) return;

  console.log(`[HOLD_EXPIRY_JOB] Started background hold-expiry runner (Interval: ${intervalSeconds}s)`);
  // Run immediately on boot
  processHoldExpirations();

  intervalTimer = setInterval(() => {
    processHoldExpirations();
  }, intervalSeconds * 1000);
}

export function stopHoldExpiryJob(): void {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
    console.log('[HOLD_EXPIRY_JOB] Stopped background hold-expiry runner');
  }
}
