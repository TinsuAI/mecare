// Story 2.2: /send handler — validates payload, runs opt-in gate, throttle, stubs openzca.
import type { IncomingMessage, ServerResponse } from "node:http";
import { checkOptIn } from "./opt-in-gate.ts";
import { getRiskState } from "./risk-monitor.ts";
import {
  isBusinessHour,
  checkDailyCap,
  incrementDailyCount,
  jitterMs,
  applyVariant,
} from "./throttle.ts";

const REQUIRED_FIELDS = ["pharmacy_id", "customer_phone", "content"] as const;

export async function handleSend(
  _req: IncomingMessage,
  res: ServerResponse,
  body: unknown
): Promise<void> {
  try {
    const payload = (body ?? {}) as Record<string, unknown>;
    const missing = REQUIRED_FIELDS.filter((k) => !payload[k]);
    if (missing.length > 0) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          error: "missing_fields",
          required: ["pharmacy_id", "customer_phone", "content"],
        })
      );
      return;
    }

    const pharmacy_id = String(payload.pharmacy_id);
    const customer_phone = String(payload.customer_phone);
    const content = String(payload.content);

    const risk = getRiskState();
    if (risk.state === "paused") {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "risk_throttled", state: "paused" }));
      return;
    }

    const gate = await checkOptIn(pharmacy_id, customer_phone);
    if (gate.blocked) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ blocked: true, ...gate }));
      return;
    }

    if (!isBusinessHour()) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "outside_business_hours" }));
      return;
    }

    const capCheck = checkDailyCap(pharmacy_id);
    if (!capCheck.allowed) {
      res.writeHead(429, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "daily_cap_exceeded", pharmacy_id }));
      return;
    }

    // Increment before await to prevent race: two concurrent requests both passing cap check.
    incrementDailyCount(pharmacy_id);

    const seed = Date.now() % 1000;
    // variantContent replaces content for openzca call in Story 2.4.
    const variantContent = applyVariant(content, seed);
    const delay = jitterMs();
    await new Promise<void>((r) => setTimeout(r, delay));

    console.log(
      `[send] QUEUED pharmacy_id=${pharmacy_id} customer_phone=${customer_phone} variant=${seed % 3} jitter=${delay}ms content_len=${variantContent.length}`
    );
    // Story 2.4: import { recordSignal } from "./risk-monitor.ts"; call recordSignal("send_error") khi openzca trả lỗi thật
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ queued: true }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[send] INTERNAL_ERROR ${msg}`);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal_error" }));
  }
}
