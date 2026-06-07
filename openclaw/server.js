// OpenClaw — foundation stub bootstrap (Story 1.1) + FAQ tool stub (Story 5.1) + escalation tool (Story 5.2)
//
// Story 1.1: healthcheck stub; sqlite-vec runtime thuộc Epic 2+.
// Story 5.1: thêm /tools/faq_lookup và /tools/reindex_faq stubs để n8n
//   MC-Handle-InboundReply và MC-Sync-FaqEntries có thể gọi trong dev/test.
//   RAG thật (sqlite-vec cosine) triển khai khi OpenClaw runtime sẵn sàng (Epic 2+);
//   stub dùng keyword-overlap (guardrail-spike.mjs retrieve) như fallback.
// Story 5.2: thêm /tools/create_escalation_case — tạo EscalationCase trong Baserow khi trigger phát hiện.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { loadApprovedScripts, retrieve, detectDiagnosis, detectDoseChange } from "./lib/guardrail-spike.mjs";
import { allocateNewCaseId, getOrCreateByCaseId, makeBaserowStore } from "./lib/case-allocator.mjs";

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

// In-memory RAG index: loaded on boot + refreshed via /tools/reindex_faq.
// Key = pharmacy_id → approved FaqEntries rows.
const ragIndex = new Map();

// Similarity score from keyword overlap (stub for sqlite-vec, range 0..1).
// Returns 1.0 on perfect token overlap, scales down. Threshold = 0.75 means
// at least ~75% of question tokens must match FAQ entry tokens.
function keywordSimilarity(question, entry) {
  const haystack = `${entry.scope || ""} ${entry.question || ""} ${entry.answer || ""}`;
  const qTokens = tokenize(question);
  const hTokens = new Set(tokenize(haystack));
  if (!qTokens.length) return 0;
  const matches = qTokens.filter((t) => hTokens.has(t)).length;
  return matches / qTokens.length;
}

function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((t) => t.length > 1) ?? [];
}

// Read body from incoming request as string.
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => resolve(buf));
    req.on("error", reject);
  });
}

function jsonResp(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

// Approved seed path for dev/test fallback (Story 5.1 — not available in container production).
// Uses the approved seed (not the draft seed) so the RAG returns real results in dev.
const SEED_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), "../baserow/seed/09-faq-entries-approved.json");

async function loadSeedFallback() {
  try {
    const raw = fs.readFileSync(SEED_PATH, "utf8");
    const seed = JSON.parse(raw);
    // Pass pharmacyId=null: seed rows have no per-row pharmacy_id field (they use
    // tenant_slug at root level). Tenant isolation is enforced by Baserow in production.
    const { scripts } = await loadApprovedScripts({ seed, pharmacyId: null, allowDraft: false });
    return scripts;
  } catch {
    return [];
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "openclaw", config_loaded: true }));
    return;
  }

  // POST /tools/faq_lookup — Story 5.1 AC2-AC5
  if (req.method === "POST" && req.url === "/tools/faq_lookup") {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return jsonResp(res, 400, { error: "invalid_json" });
    }

    const { pharmacy_id, message_content } = body ?? {};
    if (!pharmacy_id || !message_content) {
      return jsonResp(res, 400, { error: "pharmacy_id and message_content required" });
    }

    // Use in-memory index or fallback to seed file in dev.
    let entries = ragIndex.get(String(pharmacy_id)) ?? await loadSeedFallback();

    // Keyword similarity matching (stub for sqlite-vec).
    const THRESHOLD = 0.75;
    const scored = entries
      .map((e) => ({ entry: e, score: keywordSimilarity(message_content, e) }))
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    if (!top || top.score < THRESHOLD) {
      // catch_all_rule: confidence < threshold → can_answer=false.
      return jsonResp(res, 200, { can_answer: false, answer: "", is_tpcn: false, mandatory_suffix: null, scope: "out_of_scope" });
    }

    const entry = top.entry;

    // Guardrail no_diagnosis_rule (NFR-2): reject if the retrieved ANSWER contains
    // diagnosis assertions or dose-change instructions — check output, not input.
    if (detectDiagnosis(entry.answer ?? "") || detectDoseChange(entry.answer ?? "")) {
      return jsonResp(res, 200, { can_answer: false, answer: "", is_tpcn: false, mandatory_suffix: null, scope: "out_of_scope" });
    }
    const isTpcn = String(entry.scope ?? "").toLowerCase().includes("tpcn");
    const mandatorySuffix = (isTpcn && entry.mandatory_suffix) ? entry.mandatory_suffix : null;

    return jsonResp(res, 200, {
      can_answer: true,
      answer: entry.answer ?? "",
      is_tpcn: isTpcn,
      mandatory_suffix: mandatorySuffix,
      scope: entry.scope ?? ""
    });
  }

  // POST /tools/reindex_faq — Story 5.1 AC8 (MC-Sync-FaqEntries calls this)
  if (req.method === "POST" && req.url === "/tools/reindex_faq") {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return jsonResp(res, 400, { error: "invalid_json" });
    }

    const { pharmacy_id, entries } = body ?? {};
    if (!pharmacy_id || !Array.isArray(entries)) {
      return jsonResp(res, 400, { error: "pharmacy_id (string) and entries (array) required" });
    }

    const approved = entries.filter((e) => e.status === "approved");
    ragIndex.set(String(pharmacy_id), approved);
    console.log(`[openclaw] reindex_faq pharmacy=${pharmacy_id} entries=${approved.length}`);

    return jsonResp(res, 200, { indexed: approved.length, pharmacy_id });
  }

  // POST /tools/create_escalation_case — Story 5.2 AC2, AC4
  if (req.method === "POST" && req.url === "/tools/create_escalation_case") {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return jsonResp(res, 400, { error: "invalid_json" });
    }

    const { pharmacy_id, customer_id, trigger_type, trigger, customer_content, case_id } = body ?? {};
    if (!pharmacy_id || !customer_id || !trigger_type || !trigger || !customer_content) {
      return jsonResp(res, 400, { error: "pharmacy_id, customer_id, trigger_type, trigger, customer_content required" });
    }

    let store;
    try {
      store = makeBaserowStore({
        ...process.env,
        ESCALATION_TABLE_ID: process.env.ESCALATION_CASES_TABLE_ID ?? process.env.ESCALATION_TABLE_ID,
      });
    } catch (err) {
      console.error("[openclaw] create_escalation_case: store init failed —", err.message);
      return jsonResp(res, 503, { error: "escalation_store_unavailable", detail: err.message });
    }

    const createdAt = new Date().toISOString();
    const fields = { customer_id, trigger_type, trigger, customer_content, state: "open", created_at: createdAt };

    try {
      let result;
      if (case_id) {
        result = await getOrCreateByCaseId(store, case_id, { pharmacy_id, ...fields });
      } else {
        result = await allocateNewCaseId(store, {
          slug: String(pharmacy_id),
          pharmacyId: pharmacy_id,
          at: new Date(),
          fields: { pharmacy_id, ...fields },
        });
      }
      // TODO Story 5.3: sau khi tạo case, relay sang Zalo dược sĩ thật
      const status = result.created ? 201 : 200;
      return jsonResp(res, status, { case_id: result.case_id, state: "open", created: result.created });
    } catch (err) {
      console.error("[openclaw] create_escalation_case error:", err.message);
      return jsonResp(res, 500, { error: "escalation_case_failed", detail: err.message });
    }
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, () => {
  console.log(`[openclaw] stub listening on :${PORT} (healthcheck /healthz)`);
});
