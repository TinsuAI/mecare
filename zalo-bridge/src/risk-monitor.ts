// Story 2.3: Sliding-window risk monitor — auto-throttle on block/spam/error signals.

export type RiskSignal = "block" | "spam_report" | "send_error";
export type RiskState = "normal" | "paused";

let currentState: RiskState = "normal";
const signals: Array<{ timestamp_ms: number; signal: RiskSignal }> = [];

export function _resetForTesting(): void {
  currentState = "normal";
  signals.length = 0;
}

function windowMs(): number {
  return Number(process.env.RISK_WINDOW_MINUTES ?? 60) * 60_000;
}

function pruneWindow(nowMs: number): void {
  const cutoff = nowMs - windowMs();
  let i = 0;
  while (i < signals.length && signals[i].timestamp_ms < cutoff) i++;
  signals.splice(0, i);
}

export async function emitAlert(event: string, reason: string): Promise<void> {
  console.error("[ALERT]", event, "reason=" + reason);
  const url = process.env.ALERT_WEBHOOK_URL ?? "";
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, reason, timestamp_ms: Date.now(), service: "zalo-bridge" }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error("[ALERT] webhook delivery failed:", err instanceof Error ? err.message : String(err));
  }
}

function evaluateAndAct(): void {
  const blockThreshold = Number(process.env.RISK_BLOCK_COUNT_THRESHOLD ?? 3);
  const errorThreshold = Number(process.env.RISK_ERROR_COUNT_THRESHOLD ?? 5);

  let blockSpam = 0;
  let errorCount = 0;
  for (const s of signals) {
    if (s.signal === "block" || s.signal === "spam_report") blockSpam++;
    else if (s.signal === "send_error") errorCount++;
  }

  if (blockSpam >= blockThreshold || errorCount >= errorThreshold) {
    if (currentState !== "paused") {
      currentState = "paused";
      const reason = blockSpam >= blockThreshold ? "block_spam_threshold" : "error_threshold";
      void emitAlert("risk.paused", reason);
    }
    return;
  }
}

export function recordSignal(signal: RiskSignal, nowMs?: number): void {
  const now = nowMs ?? Date.now();
  signals.push({ timestamp_ms: now, signal });
  pruneWindow(now);
  evaluateAndAct();
}

export function getRiskState(nowMs?: number): {
  state: RiskState;
  signal_counts: { block: number; spam_report: number; send_error: number };
  window_minutes: number;
  since_epoch_ms: number;
} {
  const now = nowMs ?? Date.now();
  pruneWindow(now);

  // Auto-resume only: if paused, auto-resume enabled, and window is empty → resume passively.
  // Threshold re-evaluation is NOT done here — thresholds only trigger on new signals via recordSignal.
  if (currentState === "paused" && process.env.RISK_AUTO_RESUME === "true" && signals.length === 0) {
    currentState = "normal";
    void emitAlert("risk.resumed", "auto");
  }

  let block = 0;
  let spam_report = 0;
  let send_error = 0;
  for (const s of signals) {
    if (s.signal === "block") block++;
    else if (s.signal === "spam_report") spam_report++;
    else if (s.signal === "send_error") send_error++;
  }

  const wMinutes = Number(process.env.RISK_WINDOW_MINUTES ?? 60);
  return {
    state: currentState,
    signal_counts: { block, spam_report, send_error },
    window_minutes: wMinutes,
    since_epoch_ms: now - wMinutes * 60_000,
  };
}

export function resetToNormal(reason = "manual"): void {
  if (currentState === "normal") return;
  currentState = "normal";
  void emitAlert("risk.resumed", reason);
}
