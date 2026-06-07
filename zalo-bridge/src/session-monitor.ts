// Story 2.5: Cross-message session health tracking and proactive alerting (FR-13, AR-8).

import { emitAlert } from "./risk-monitor.ts";
import { checkOpenzcaHealth } from "./openzca-client.ts";

export type SessionState = "healthy" | "degraded" | "lost";
export type SessionEvent = "send_success" | "send_failure" | "health_fail";

let state: SessionState = "healthy";
let consecutiveErrors = 0;
let lostReason = "";
let lostSince: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

export function _resetForTesting(): void {
  state = "healthy";
  consecutiveErrors = 0;
  lostReason = "";
  lostSince = null;
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

export function recordSessionEvent(event: SessionEvent, detail?: string): void {
  if (event === "send_success") {
    consecutiveErrors = 0;
    // Handles degraded→healthy; lost→healthy cannot happen here because send.ts short-circuits lost sends.
    if (state !== "healthy") {
      state = "healthy";
      lostReason = "";
      lostSince = null;
    }
    return;
  }
  if (event === "send_failure") {
    consecutiveErrors++;
    if (consecutiveErrors >= 3 && state !== "lost") {
      state = "lost";
      lostReason = detail ?? "consecutive_send_failures";
      lostSince = Date.now();
      void emitAlert("session.lost", lostReason);
    }
    return;
  }
  if (event === "health_fail") {
    if (state !== "lost") {
      state = "lost";
      lostReason = detail ?? "health_check_failed";
      lostSince = Date.now();
      void emitAlert("session.lost", lostReason);
    }
    return;
  }
}

export function getSessionState(): {
  state: SessionState;
  consecutive_errors: number;
  reason: string;
  lost_since_ms: number | null;
} {
  return { state, consecutive_errors: consecutiveErrors, reason: lostReason, lost_since_ms: lostSince };
}

export function resetSession(): void {
  consecutiveErrors = 0;
  state = "healthy";
  lostReason = "";
  lostSince = null;
}

export function startSessionMonitor(intervalMs?: number): void {
  if (timer !== null) { console.warn("[session-monitor] already running, ignoring duplicate startSessionMonitor() call"); return; }
  const ms = intervalMs ?? Number(process.env.SESSION_HEALTH_INTERVAL_MS ?? 60_000);
  timer = setInterval(async () => {
    const result = await checkOpenzcaHealth();
    if (!result.ok) recordSessionEvent("health_fail", result.error);
  }, ms);
}

export function stopSessionMonitor(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}
