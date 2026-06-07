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

const PORT = Number(process.env.ZALO_BRIDGE_PORT ?? 3000);

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    // snake_case JSON inter-component (khớp Baserow convention)
    res.end(JSON.stringify({ status: "ok", service: "zalo-bridge" }));
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

server.listen(PORT, () => {
  console.log(`[zalo-bridge] stub listening on :${PORT} (healthcheck /healthz)`);
});
