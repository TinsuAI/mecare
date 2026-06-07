// MeCare zalo-bridge — stub bootstrap (Story 1.1)
//
// Trách nhiệm THẬT (Epic 2+, FR-11..13): wrap openzca, anti-ban, và là
// điểm DUY NHẤT de-anonymize PII khi gửi tin Zalo. Phiên Zalo cô lập
// per-tenant (mount zalo-bridge/tenants/<slug>) — 1 phiên hỏng không kéo
// tenant khác (NFR-6).
//
// Story 1.1 chỉ cần: khởi động được + expose healthcheck cho compose.

import http from "node:http";
import { handleSend } from "./send.ts";
import { getRiskState, recordSignal, resetToNormal } from "./risk-monitor.ts";
import { startSessionMonitor, stopSessionMonitor, getSessionState, resetSession } from "./session-monitor.ts";

const VALID_SIGNALS = new Set(["block", "spam_report", "send_error"]);

const PORT = Number(process.env.ZALO_BRIDGE_PORT ?? 3000);

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    // snake_case JSON inter-component (khớp Baserow convention)
    res.end(JSON.stringify({ status: "ok", service: "zalo-bridge" }));
    return;
  }

  if (req.url === "/session-state" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(getSessionState()));
    return;
  }

  if (req.url === "/session-reset" && req.method === "POST") {
    resetSession();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ reset: true, state: "healthy" }));
    return;
  }

  if (req.url === "/risk-state" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(getRiskState()));
    return;
  }

  if (req.url === "/risk-resume" && req.method === "POST") {
    resetToNormal("manual");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ resumed: true, state: "normal" }));
    return;
  }

  if (req.url === "/risk-report" && req.method === "POST") {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_json" }));
        return;
      }
      const payload = (body ?? {}) as Record<string, unknown>;
      const signal_type = payload.signal_type;
      if (typeof signal_type !== "string" || !VALID_SIGNALS.has(signal_type)) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_signal_type" }));
        return;
      }
      recordSignal(signal_type as "block" | "spam_report" | "send_error");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ recorded: true, state: getRiskState().state }));
    });
    return;
  }

  if (req.url === "/send" && req.method === "POST") {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_json" }));
        return;
      }
      handleSend(req, res, body);
    });
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

startSessionMonitor();

process.on("SIGTERM", () => {
  stopSessionMonitor();
  server.close();
});

server.listen(PORT, () => {
  console.log(`[zalo-bridge] stub listening on :${PORT} (healthcheck /healthz)`);
});
