// Shared wire types of the balance-status plugin (host + browser halves).
// The host half (lib/index.js) serves /balance-status/status with these
// shapes; the browser half (src/client.tsx) consumes them.

/** One usage window's totals, with per-model splits. */
export interface BalanceUsageWindow {
  input: number;
  output: number;
  /** Provider-reported cache-read tokens inside the window. */
  cacheRead: number;
  /** Provider-reported reasoning tokens inside the window. */
  reasoning: number;
  calls: number;
  models: Record<string, {
    input: number;
    output: number;
    cacheRead: number;
    reasoning: number;
    calls: number;
  }>;
}

/** Normalized DeepSeek account balance record. */
export interface BalanceInfo {
  available: boolean;
  currency: string;
  total: number;
  granted: number;
  toppedUp: number;
}

/** Display references the widget's energy bars shade against. */
export interface BalanceTargets {
  /** Reference amount (in the balance record's currency) for the remaining-balance bar. */
  balance: number;
  /** Reference daily token figure for the consumed-today bar. */
  dailyTokens: number;
}

/** One failed sub-operation carried by a status snapshot. */
export interface BalanceStatusError {
  code: string;
  message: string;
}

/** The /balance-status/status response payload. */
export interface BalanceStatus {
  ok: boolean;
  syncedAt: number;
  balance: BalanceInfo | null;
  balanceError: BalanceStatusError | null;
  targets: BalanceTargets;
  usage: {
    today: BalanceUsageWindow;
    week: BalanceUsageWindow;
    month: BalanceUsageWindow;
    all: BalanceUsageWindow;
  } | null;
  errors: BalanceStatusError[];
}

/** Query parameter of the status endpoint (force=1 bypasses the snapshot cache). */
export interface BalanceStatusQuery {
  force?: boolean;
}
