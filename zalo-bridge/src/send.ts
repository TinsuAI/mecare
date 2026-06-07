// Story 2.1: /send handler — validates payload, runs opt-in gate, stubs openzca.
import type { IncomingMessage, ServerResponse } from "node:http";
import { checkOptIn } from "./opt-in-gate.ts";

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

    const gate = await checkOptIn(pharmacy_id, customer_phone);
    if (gate.blocked) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ blocked: true, ...gate }));
      return;
    }

    console.log(
      `[send] ALLOWED pharmacy_id=${pharmacy_id} customer_phone=${customer_phone} — openzca stub (Story 2.2+)`
    );
    res.writeHead(202, { "content-type": "application/json" });
    res.end(JSON.stringify({ queued: true }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[send] INTERNAL_ERROR ${msg}`);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal_error" }));
  }
}
