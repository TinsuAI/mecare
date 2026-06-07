// Story 2.2: Anti-ban throttle module — business hours, daily caps, warm-up, jitter, content variant.

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

function toGmt7Hour(nowMs: number): number {
  return Math.floor(((nowMs + GMT7_OFFSET_MS) / 3_600_000) % 24);
}

function toGmt7DateStr(nowMs: number): string {
  const d = new Date(nowMs + GMT7_OFFSET_MS);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isBusinessHour(nowMs?: number): boolean {
  const now = nowMs ?? Date.now();
  const hour = toGmt7Hour(now);
  const start = Number(process.env.BUSINESS_HOUR_START ?? "7");
  const end = Number(process.env.BUSINESS_HOUR_END ?? "21");
  return hour >= start && hour < end;
}

export function isWarmupActive(nowMs?: number): boolean {
  const epochStr = process.env.WARMUP_UNTIL_EPOCH_MS;
  if (!epochStr) return false;
  const untilMs = Number(epochStr);
  if (Number.isNaN(untilMs)) return false;
  return (nowMs ?? Date.now()) < untilMs;
}

// In-memory per-pharmacy daily counters (ephemeral — resets on restart).
const dailyMap = new Map<string, { date: string; count: number }>();

export function checkDailyCap(
  pharmacyId: string,
  nowMs?: number
): { allowed: boolean; count: number; cap: number } {
  const now = nowMs ?? Date.now();
  const today = toGmt7DateStr(now);
  const cap = isWarmupActive(now)
    ? Number(process.env.WARMUP_DAILY_CAP ?? "5")
    : Number(process.env.DAILY_SEND_CAP ?? "50");

  const entry = dailyMap.get(pharmacyId);
  if (!entry || entry.date !== today) {
    dailyMap.set(pharmacyId, { date: today, count: 0 });
    return { allowed: 0 < cap, count: 0, cap };
  }
  return { allowed: entry.count < cap, count: entry.count, cap };
}

export function incrementDailyCount(pharmacyId: string, nowMs?: number): void {
  const now = nowMs ?? Date.now();
  const today = toGmt7DateStr(now);
  const entry = dailyMap.get(pharmacyId);
  if (!entry || entry.date !== today) {
    dailyMap.set(pharmacyId, { date: today, count: 1 });
  } else {
    entry.count += 1;
  }
}

export function jitterMs(_nowMs?: number): number {
  const min = Number(process.env.JITTER_MIN_MS ?? "800");
  const max = Number(process.env.JITTER_MAX_MS ?? "3000");
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function applyVariant(content: string, seed: number): string {
  switch (seed % 3) {
    case 0:
      return content;
    case 1:
      return content.replace(/  +/g, " ").trim();
    case 2:
      if (content.endsWith(".")) return content.slice(0, -1);
      return content + ".";
    default:
      return content;
  }
}
