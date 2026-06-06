#!/usr/bin/env node
// Approve kịch bản MeCare (Story 1.4 Task 4): draft → approved có dấu vết.
// Set status=approved, approved_at=<now ISO>, approved_by=<arg> cho MessageTemplates + FaqEntries
// của đúng tenant (NFR-6 isolation). Idempotent: chạy lại KHÔNG reset approved_at, chỉ duyệt draft.
//
// Zero deps (Node built-in fetch, Node >=18). Logic thuần tách trong openclaw/lib/kichban-ops.mjs.
//
// Env:
//   BASEROW_API_URL        vd http://localhost:8080 (mặc định)
//   BASEROW_DATABASE_NAME  tên database (mặc định "MeCare")
//   BASEROW_WORKSPACE      tên/ID workspace (mặc định: workspace đầu tiên)
//   Auth — row ops đủ với database token:
//     BASEROW_API_TOKEN  (database token) — đủ quyền row CRUD (approve)
//     hoặc BASEROW_JWT / BASEROW_EMAIL+BASEROW_PASSWORD
//
// Usage:
//   node scripts/approve-kichban.mjs --by "Chủ NT Trúc Tâm"            # duyệt tenant mặc định (tructam)
//   node scripts/approve-kichban.mjs --by "..." --tenant tructam       # chỉ định tenant
//   node scripts/approve-kichban.mjs --by "..." --dry-run              # liệt kê record sẽ duyệt, KHÔNG ghi

import { approveDrafts, belongsToTenant } from "../openclaw/lib/kichban-ops.mjs";

const API_URL = (process.env.BASEROW_API_URL || "http://localhost:8080").replace(/\/$/, "");
const DB_NAME = process.env.BASEROW_DATABASE_NAME || "MeCare";
const WORKSPACE = process.env.BASEROW_WORKSPACE || "";

// Bảng kịch bản cần duyệt (key fields chỉ để log).
const SCRIPT_TABLES = ["MessageTemplates", "FaqEntries"];

// ── Parse args ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function argVal(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
}
const DRY_RUN = argv.includes("--dry-run");
const APPROVED_BY = argVal("--by", process.env.APPROVED_BY || "");
const TENANT = argVal("--tenant", "tructam");

function log(...m) { console.log(...m); }
function die(msg) { console.error("✗", msg); process.exit(1); }

if (!APPROVED_BY) die('Thiếu --by "<tên người duyệt>" (hoặc env APPROVED_BY).');

// ── HTTP ─────────────────────────────────────────────────────────────────────
let AUTH = null;
async function api(method, p, body) {
  const headers = { "Content-Type": "application/json" };
  if (AUTH) headers["Authorization"] = `${AUTH.scheme} ${AUTH.value}`;
  const res = await fetch(`${API_URL}${p}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) {
    throw new Error(`${method} ${p} -> ${res.status}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }
  return json;
}

async function authenticate() {
  if (process.env.BASEROW_JWT) {
    AUTH = { scheme: "JWT", value: process.env.BASEROW_JWT };
    return;
  }
  if (process.env.BASEROW_EMAIL && process.env.BASEROW_PASSWORD) {
    const r = await api("POST", "/api/user/token-auth/", {
      email: process.env.BASEROW_EMAIL,
      password: process.env.BASEROW_PASSWORD,
    });
    const jwt = r.access_token || r.token || r.access;
    if (!jwt) die("token-auth không trả JWT");
    AUTH = { scheme: "JWT", value: jwt };
    return;
  }
  if (process.env.BASEROW_API_TOKEN) {
    AUTH = { scheme: "Token", value: process.env.BASEROW_API_TOKEN };
    return;
  }
  die("Thiếu auth: đặt BASEROW_API_TOKEN (đủ cho approve), hoặc BASEROW_JWT, hoặc BASEROW_EMAIL+BASEROW_PASSWORD.");
}

// ── Resolve database + tables ──────────────────────────────────────────────────
async function resolveDatabase() {
  const workspaces = await api("GET", "/api/workspaces/");
  const ws = WORKSPACE
    ? workspaces.find((w) => String(w.id) === WORKSPACE || w.name === WORKSPACE)
    : workspaces[0];
  if (!ws) die("Không tìm thấy workspace.");
  const apps = await api("GET", `/api/applications/workspace/${ws.id}/`);
  const db = apps.find((a) => a.type === "database" && a.name === DB_NAME);
  if (!db) die(`Database "${DB_NAME}" chưa tồn tại (chạy apply-baserow-schema.mjs trước).`);
  return db;
}

async function tablesByName(dbId) {
  const tables = await api("GET", `/api/database/tables/database/${dbId}/`);
  const map = {};
  for (const t of tables) map[t.name] = t.id;
  return map;
}

// Lấy tất cả hàng của 1 bảng (phân trang).
async function listAllRows(tableId) {
  const out = [];
  let url = `/api/database/rows/table/${tableId}/?user_field_names=true&size=200`;
  while (url) {
    const page = await api("GET", url);
    out.push(...page.results);
    url = page.next ? page.next.replace(API_URL, "") : null;
  }
  return out;
}

// Resolve pharmacy_id (row id của tenant trong bảng Pharmacies).
async function resolveTenantId(tableMap, slug) {
  const phId = tableMap["Pharmacies"];
  if (!phId) die("Bảng Pharmacies chưa tồn tại — không thể lọc theo tenant.");
  const rows = await listAllRows(phId);
  const ph = rows.find((r) => r.pharmacy_slug === slug);
  if (!ph) die(`Tenant slug "${slug}" chưa seed trong Pharmacies.`);
  return ph.id;
}

// ── Store adapter cho 1 bảng (khớp interface kichban-ops: list/update) ──────────
function makeStore(tableId) {
  return {
    list: () => listAllRows(tableId),
    update: (id, patch) =>
      api("PATCH", `/api/database/rows/table/${tableId}/${id}/?user_field_names=true`, patch),
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  await authenticate();
  const db = await resolveDatabase();
  const tableMap = await tablesByName(db.id);
  const pharmacyId = await resolveTenantId(tableMap, TENANT);
  const now = new Date().toISOString();

  log(`Duyệt kịch bản tenant "${TENANT}" (pharmacy_id=${pharmacyId}) bởi "${APPROVED_BY}"${DRY_RUN ? " [DRY-RUN]" : ""}`);

  let totalApproved = 0;
  for (const name of SCRIPT_TABLES) {
    const tableId = tableMap[name];
    if (!tableId) { log(`• ${name}: bảng chưa tồn tại — bỏ qua.`); continue; }

    if (DRY_RUN) {
      // Liệt kê record draft thuộc tenant sẽ được duyệt, KHÔNG ghi.
      const rows = await listAllRows(tableId);
      const draft = rows.filter((r) => belongsToTenant(r, pharmacyId) && r.status !== "approved");
      log(`• ${name}: ${draft.length} record draft sẽ duyệt (dry-run, không ghi).`);
      continue;
    }

    const store = makeStore(tableId);
    const res = await approveDrafts({ store, approvedBy: APPROVED_BY, now, pharmacyId });
    totalApproved += res.approved;
    log(`• ${name}: +${res.approved} duyệt, ${res.alreadyApproved} đã approved (bỏ qua), ${res.otherTenant} khác tenant.`);
  }

  if (!DRY_RUN) log(`✓ Hoàn tất — ${totalApproved} record chuyển sang approved (idempotent).`);
}

main().catch((e) => die(e.message));
