import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { checkOptIn } from "./opt-in-gate.ts";
import { getRiskState, recordSignal } from "./risk-monitor.ts";
import {
  isBusinessHour,
  checkDailyCap,
  incrementDailyCount,
  jitterMs,
  applyVariant,
} from "./throttle.ts";
import { createMessageRecord, updateMessageStatus, queueDeadLetter } from "./messages-client.ts";
import { sendViaOpenzca } from "./openzca-client.ts";

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

    const message_id = randomUUID();
    const seed = Date.now() % 1000;
    const variantContent = applyVariant(content, seed);

    const auditRowId = await createMessageRecord({
      message_id,
      pharmacy_id,
      customer_phone,
      content: variantContent,
    });

    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError = "";
    let sendOk = false;

    while (attempt < MAX_RETRIES && !sendOk) {
      const delay = jitterMs();
      await new Promise<void>((r) => setTimeout(r, delay));
      const result = await sendViaOpenzca(pharmacy_id, customer_phone, variantContent);
      if (result.ok) {
        sendOk = true;
      } else {
        lastError = result.error;
        recordSignal("send_error");
        attempt++;
        console.error(
          `[send] ATTEMPT_FAILED attempt=${attempt} pharmacy_id=${pharmacy_id} message_id=${message_id} error=${lastError}`
        );
      }
    }

    if (sendOk) {
      if (auditRowId !== null) {
        await updateMessageStatus(auditRowId, "sent").catch(console.error);
      }
      console.log(`[send] SENT pharmacy_id=${pharmacy_id} message_id=${message_id}`);
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ sent: true, message_id }));
      return;
    }

    await queueDeadLetter(auditRowId, {
      message_id,
      pharmacy_id,
      customer_phone,
      content: variantContent,
      error_text: lastError,
    }).catch(console.error);

    const alertUrl = process.env.ALERT_WEBHOOK_URL ?? "";
    if (alertUrl) {
      fetch(alertUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "session.lost",
          pharmacy_id,
          message_id,
          service: "zalo-bridge",
          timestamp_ms: Date.now(),
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(console.error);
    }

    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ queued: true, message_id }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[send] INTERNAL_ERROR ${msg}`);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal_error" }));
  }
}
