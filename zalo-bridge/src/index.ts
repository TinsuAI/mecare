// MeCare zalo-bridge — stub bootstrap (Story 1.1)
//
// Trách nhiệm THẬT (Epic 2+, FR-11..13): wrap openzca, anti-ban, và là
// điểm DUY NHẤT de-anonymize PII khi gửi tin Zalo. Phiên Zalo cô lập
// per-tenant (mount zalo-bridge/tenants/<slug>) — 1 phiên hỏng không kéo
// tenant khác (NFR-6).
//
// Story 1.1 chỉ cần: khởi động được + expose healthcheck cho compose.

import http from "node:http";

const PORT = Number(process.env.ZALO_BRIDGE_PORT ?? 3000);

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    // snake_case JSON inter-component (khớp Baserow convention)
    res.end(JSON.stringify({ status: "ok", service: "zalo-bridge" }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, () => {
  console.log(`[zalo-bridge] stub listening on :${PORT} (healthcheck /healthz)`);
});
