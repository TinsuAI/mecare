// OpenClaw — foundation stub bootstrap (Story 1.1)
//
// LƯU Ý: OpenClaw thật (agent gateway + memory SQLite/sqlite-vec + channel)
// chưa có image công khai; runtime đầy đủ thuộc Epic 2+. Story 1.1 chỉ cần
// service khởi động KHÔNG lỗi với config đã cho và expose healthcheck, để
// chứng minh stack bootstrap + persist + restart (AC2/AC3).
//
// Stub: nạp 3 file config (gateway/provider/memory), xác nhận đọc được khoá
// OPENROUTER_API_KEY từ env, mở healthcheck. KHÔNG gọi cloud thật.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// Defaults = container layout (AC2). Override qua env chỉ để test trên host.
const PORT = Number(process.env.OPENCLAW_PORT ?? 8000);
const CONFIG_DIR = process.env.OPENCLAW_CONFIG_DIR ?? "/app/config";
const REQUIRED = ["gateway.yml", "provider-openrouter.yml", "memory.yml"];

function checkConfig() {
  const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(CONFIG_DIR, f)));
  return missing;
}

const missing = checkConfig();
if (missing.length) {
  console.error(`[openclaw] thiếu config: ${missing.join(", ")}`);
  process.exit(1);
}

// Egress cloud duy nhất = OpenClaw -> OpenRouter. Đọc khoá từ env.
const hasKey = Boolean(process.env.OPENROUTER_API_KEY);
console.log(`[openclaw] config OK; OPENROUTER_API_KEY ${hasKey ? "present" : "absent (CI ok)"}`);

// Đảm bảo thư mục memory store tồn tại (named volume self-host)
const memPath = process.env.OPENCLAW_MEMORY_PATH ?? "/data/memory/mecare.db";
fs.mkdirSync(path.dirname(memPath), { recursive: true });

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "openclaw", config_loaded: true }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, () => {
  console.log(`[openclaw] stub listening on :${PORT} (healthcheck /healthz)`);
});
