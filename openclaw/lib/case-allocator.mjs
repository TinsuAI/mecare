// Allocator atomic seq mã ca theo (pharmacy, ngày) — ESM zero-dep (Story 1.3, Task 2).
// Điểm serialize = ràng buộc unique của EscalationCases.case_id (Baserow, Story 1.2).
// KHÔNG lock ngoài DB. Optimistic concurrency: re-read maxSeq + retry khi đụng conflict.
// [Source: architecture.md#API-Communication-Patterns ; architecture.md#Enforcement ; story 1.3 Dev Notes]
//
// Store được tiêm (dependency injection) để test deterministic không cần Baserow live.
// Interface store:
//   listByPrefix({ pharmacyId, prefix }) -> Promise<Array<{ case_id }>>   (đã lọc tenant)
//   getByCaseId(caseId)                  -> Promise<row | null>
//   create(fields)                       -> Promise<row>  (ném CaseIdConflictError nếu trùng case_id)

import { buildCaseId, parseCaseId, vnDateStamp, caseIdPrefix } from "./case-id.mjs";

const DEFAULT_MAX_RETRIES = 5;

// Backoff jitter mặc định khi caller KHÔNG tiêm opts.sleep (tránh busy-loop khi đua conflict).
// Test deterministic tiêm sleep riêng (vd noSleep) để bỏ qua delay.
function defaultBackoff(attempt) {
  const base = Math.min(25 * 2 ** attempt, 400); // 25,50,100,200,400ms…
  const jitter = Math.random() * base; // tản đua, KHÔNG dùng trong core pure (case-id.mjs)
  return new Promise((r) => setTimeout(r, base + jitter));
}

// Lỗi sentinel: store ném khi vi phạm unique case_id (đua allocate).
export class CaseIdConflictError extends Error {
  constructor(caseId) {
    super(`case_id đã tồn tại (unique conflict): ${caseId}`);
    this.name = "CaseIdConflictError";
    this.caseId = caseId;
  }
}

// Tính maxSeq từ các record cùng prefix (parse seq, bỏ qua record sai format defensively).
function maxSeqOf(rows) {
  let max = 0;
  for (const r of rows) {
    const id = r && r.case_id;
    if (typeof id !== "string") continue;
    try {
      const { seq } = parseCaseId(id);
      if (seq > max) max = seq;
    } catch {
      // record không đúng format → bỏ qua (không để rác chặn allocate).
    }
  }
  return max;
}

// allocateNewCaseId — cấp seq mới (đường cấp phát). Optimistic concurrency.
//   slug       : pharmacy_slug (^[a-z0-9]+$)
//   pharmacyId : id row Pharmacies (lọc tenant, NFR-6)
//   at         : thời điểm (ISO/Date/epoch) → date component giờ VN
//   fields     : field bổ sung ghi cùng record (snake_case, vd trigger/state/created_at)
export async function allocateNewCaseId(store, { slug, pharmacyId, at, fields = {} }, opts = {}) {
  if (!store || typeof store.listByPrefix !== "function" || typeof store.create !== "function") {
    throw new Error("allocateNewCaseId: store thiếu listByPrefix/create");
  }
  if (pharmacyId === undefined || pharmacyId === null) {
    throw new Error("allocateNewCaseId: thiếu pharmacyId (bắt buộc lọc tenant — NFR-6)");
  }
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const sleep = opts.sleep ?? defaultBackoff;
  const date = vnDateStamp(at);
  const prefix = caseIdPrefix(slug, date);

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const rows = await store.listByPrefix({ pharmacyId, prefix });
    const next = maxSeqOf(rows) + 1;
    const caseId = buildCaseId({ slug, date, seq: next });
    try {
      // fields spread TRƯỚC để KHÔNG ghi đè case_id/pharmacy_id đã cấp (chống clobber).
      const row = await store.create({ ...fields, case_id: caseId, pharmacy_id: pharmacyId });
      return { case_id: caseId, seq: next, row, created: true };
    } catch (e) {
      if (e instanceof CaseIdConflictError) {
        lastErr = e;
        // đua: re-read maxSeq + retry với backoff jitter (mặc định defaultBackoff; tiêm được để test).
        if (attempt < maxRetries) await sleep(attempt);
        continue;
      }
      throw e; // lỗi khác → KHÔNG nuốt (architecture.md#Process-Patterns)
    }
  }
  // Cạn retry → ném rõ ràng, không nuốt lỗi.
  throw new Error(
    `allocateNewCaseId: cạn ${maxRetries} retry do tranh chấp seq (${prefix}). Lỗi cuối: ${lastErr?.message}`,
  );
}

// getOrCreateByCaseId — ghi idempotent theo mã ca đã biết (đường retry duplicate-delivery, AC3).
//   Tồn tại → trả record cũ (created:false). Chưa có → tạo (created:true).
export async function getOrCreateByCaseId(store, caseId, fields = {}) {
  if (!store || typeof store.getByCaseId !== "function" || typeof store.create !== "function") {
    throw new Error("getOrCreateByCaseId: store thiếu getByCaseId/create");
  }
  // Validate mã ca trước (parse ném nếu sai format).
  parseCaseId(caseId);

  const existing = await store.getByCaseId(caseId);
  if (existing) return { case_id: caseId, row: existing, created: false };

  try {
    // fields spread TRƯỚC để KHÔNG ghi đè case_id (mã ca đã biết là nguồn sự thật).
    const row = await store.create({ ...fields, case_id: caseId });
    return { case_id: caseId, row, created: true };
  } catch (e) {
    if (e instanceof CaseIdConflictError) {
      // Đua: ai đó vừa tạo giữa get và create → đọc lại, trả bản ghi đang tồn tại (idempotent).
      const row = await store.getByCaseId(caseId);
      if (row) return { case_id: caseId, row, created: false };
    }
    throw e;
  }
}

// ── Baserow REST store ─────────────────────────────────────────────────────────
// Row ops (CRUD record EscalationCases) — đủ với database Token hoặc JWT user.
// Đọc env theo pattern scripts/apply-baserow-schema.mjs. KHÔNG hardcode/commit token.
//   BASEROW_API_URL    (mặc định http://localhost:8080)
//   BASEROW_API_TOKEN  (database token, row ops) — hoặc BASEROW_JWT
//   ESCALATION_TABLE_ID (id bảng EscalationCases) — bắt buộc cho row ops
export function makeBaserowStore(env = process.env) {
  const apiUrl = (env.BASEROW_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const tableId = env.ESCALATION_TABLE_ID;
  if (!tableId) {
    throw new Error("makeBaserowStore: thiếu ESCALATION_TABLE_ID (id bảng EscalationCases)");
  }
  let auth = null;
  if (env.BASEROW_JWT) auth = { scheme: "JWT", value: env.BASEROW_JWT };
  else if (env.BASEROW_API_TOKEN) auth = { scheme: "Token", value: env.BASEROW_API_TOKEN };
  else throw new Error("makeBaserowStore: thiếu auth — đặt BASEROW_API_TOKEN hoặc BASEROW_JWT");

  async function api(method, p, body) {
    const headers = { "Content-Type": "application/json", Authorization: `${auth.scheme} ${auth.value}` };
    const res = await fetch(`${apiUrl}${p}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    return { res, json };
  }

  // Baserow báo trùng giá trị field unique qua error code ERROR_ROW_VALUE_NOT_UNIQUE (HTTP 400).
  function isUniqueConflict(res, json) {
    if (res.status !== 400) return false;
    const code = json && typeof json === "object" ? json.error : "";
    return typeof code === "string" && /UNIQUE/i.test(code);
  }

  // Lọc tenant: pharmacy_id (link_row) chứa pharmacyId. Lọc prefix case_id qua filter contains.
  // Phân trang TOÀN BỘ: Baserow trả tăng dần theo id → record seq cao nhất nằm trang cuối.
  // Nếu chỉ lấy 1 trang, >PAGE_SIZE ca/ngày sẽ tính sót maxSeq → allocate đụng conflict liên tục.
  const PAGE_SIZE = 200;
  async function listByPrefix({ pharmacyId, prefix }) {
    const out = [];
    for (let page = 1; ; page++) {
      const qs =
        `?user_field_names=true&size=${PAGE_SIZE}&page=${page}` +
        `&filter__case_id__contains=${encodeURIComponent(prefix)}` +
        `&filter__pharmacy_id__link_row_has=${encodeURIComponent(pharmacyId)}`;
      const { res, json } = await api("GET", `/api/database/rows/table/${tableId}/${qs}`);
      if (!res.ok) throw new Error(`Baserow listByPrefix -> ${res.status}: ${JSON.stringify(json)}`);
      const results = (json && json.results) || [];
      out.push(...results);
      if (results.length < PAGE_SIZE) break; // trang cuối
    }
    return out.filter((r) => typeof r.case_id === "string" && r.case_id.startsWith(prefix));
  }

  async function getByCaseId(caseId) {
    const qs = `?user_field_names=true&size=1&filter__case_id__equal=${encodeURIComponent(caseId)}`;
    const { res, json } = await api("GET", `/api/database/rows/table/${tableId}/${qs}`);
    if (!res.ok) throw new Error(`Baserow getByCaseId -> ${res.status}: ${JSON.stringify(json)}`);
    const hit = (json.results || []).find((r) => r.case_id === caseId);
    return hit || null;
  }

  async function create(fields) {
    const payload = { ...fields };
    // pharmacy_id là link_row → API cần mảng id.
    if (payload.pharmacy_id !== undefined && !Array.isArray(payload.pharmacy_id)) {
      payload.pharmacy_id = [payload.pharmacy_id];
    }
    const { res, json } = await api("POST", `/api/database/rows/table/${tableId}/?user_field_names=true`, payload);
    if (isUniqueConflict(res, json)) throw new CaseIdConflictError(fields.case_id);
    if (!res.ok) throw new Error(`Baserow create -> ${res.status}: ${JSON.stringify(json)}`);
    return json;
  }

  return { listByPrefix, getByCaseId, create };
}
