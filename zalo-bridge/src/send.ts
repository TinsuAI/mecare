import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { checkOptIn } from "./opt-in-gate.ts";
import { getRiskState, recordSignal, emitAlert } from "./risk-monitor.ts";
import { getSessionState, recordSessionEvent } from "./session-monitor.ts";
import {
  isBusinessHour,
  checkDailyCap,
  incrementDailyCount,
  jitterMs,
  applyVariant,
} from "./throttle.ts";
import { createMessageRecord, updateMessageStatus, queueDeadLetter } from "./messages-client.ts";
import { sendViaOpenzca } from "./openzca-client.ts";
import { getApi, sendZaloMessage } from "./zalo-session-manager.ts";

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
      res.end(JSON.stringify({ ...gate }));
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

    if (getSessionState().state === "lost") {
      await queueDeadLetter(auditRowId, {
        message_id,
        pharmacy_id,
        customer_phone,
        content: variantContent,
        error_text: "session_lost",
      }).catch(console.error);
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ queued: true, message_id }));
      return;
    }

    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError = "";
    let sendOk = false;

    while (attempt < MAX_RETRIES && !sendOk) {
      const delay = jitterMs();
      await new Promise<void>((r) => setTimeout(r, delay));
      const result = getApi(pharmacy_id)
        ? await sendZaloMessage(pharmacy_id, customer_phone, variantContent)
        : await sendViaOpenzca(pharmacy_id, customer_phone, variantContent);
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
      recordSessionEvent("send_success");
      if (auditRowId !== null) {
        await updateMessageStatus(auditRowId, "sent").catch(console.error);
      }
      console.log(`[send] SENT pharmacy_id=${pharmacy_id} message_id=${message_id}`);
      res.writeHead(202, { "content-type": "application/json" });
      res.end(JSON.stringify({ sent: true, message_id }));
      return;
    }

    recordSessionEvent("send_failure", lastError);

    await queueDeadLetter(auditRowId, {
      message_id,
      pharmacy_id,
      customer_phone,
      content: variantContent,
      error_text: lastError,
    }).catch(console.error);

    // Per-message dead-letter alert (Story 2.4 behavior preserved). session-monitor fires a
    // separate alert when 3 consecutive failures cause state to transition to lost.
    void emitAlert("session.lost", pharmacy_id + ":" + lastError);

    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ queued: true, message_id }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[send] INTERNAL_ERROR ${msg}`);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal_error" }));
  }
}
