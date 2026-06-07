// nextDueAt: returns next ISO-8601 UTC due date or null for "once".
// Uses plain Date arithmetic — no external deps (mirrors compose-message.js pattern).
export function nextDueAt(dueAtIso, cadenceType) {
  const offsets = { weekly: 7, monthly: 30, quarterly: 90 };
  const days = offsets[cadenceType];
  if (!days) return null;
  return new Date(Date.parse(dueAtIso) + days * 86400000).toISOString();
}

// isBusinessHourGmt7: true if nowMs falls in [startHour, endHour) GMT+7.
// Mirrors zalo-bridge/src/throttle.ts toGmt7Hour logic — standalone for n8n Code node.
export function isBusinessHourGmt7(nowMs, startHour, endHour) {
  const gmt7Hour = ((nowMs + 7 * 3600000) / 3600000) % 24;
  return gmt7Hour >= startHour && gmt7Hour < endHour;
}

// addMinutes: add `minutes` to ISO string, return new ISO string.
export function addMinutes(isoStr, minutes) {
  return new Date(Date.parse(isoStr) + minutes * 60000).toISOString();
}
