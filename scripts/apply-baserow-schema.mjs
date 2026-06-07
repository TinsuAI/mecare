#!/usr/bin/env node
// Apply MeCare Baserow schema + seed + views via REST API. Idempotent.
// Zero deps (Node built-in fetch, Node >=18). Pattern kế thừa Story 1.1 tests/ ESM.
//
// Env:
//   BASEROW_API_URL        vd http://localhost:8080  (mặc định)
//   BASEROW_DATABASE_NAME  tên database trong Baserow (mặc định "MeCare")
//   BASEROW_WORKSPACE      tên/ID workspace (mặc định: workspace đầu tiên)
//   Auth — schema ops (tạo bảng/field/view) CẦN JWT user:
//     BASEROW_EMAIL + BASEROW_PASSWORD   -> lấy JWT (token-auth)
//   Hoặc dùng JWT có sẵn:
//     BASEROW_JWT
//   BASEROW_API_TOKEN  (database token) — chỉ đủ quyền row CRUD (seed), KHÔNG tạo schema.
//
// Usage:
//   node scripts/apply-baserow-schema.mjs              # schema + seed + views
//   node scripts/apply-baserow-schema.mjs --schema     # chỉ schema
//   node scripts/apply-baserow-schema.mjs --seed       # chỉ seed (insert-only, skip key trùng)
//   node scripts/apply-baserow-schema.mjs --seed --update-seed  # upsert: insert mới + UPDATE hàng đã tồn tại theo key
//   node scripts/apply-baserow-schema.mjs --views      # chỉ views (form/grid)
//   node scripts/apply-baserow-schema.mjs --dry-run    # parse + validate, KHÔNG gọi API

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { upsertSeed } from "../openclaw/lib/kichban-ops.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "baserow", "schema");
const SEED_DIR = path.join(ROOT, "baserow", "seed");
const VIEWS_DIR = path.join(ROOT, "baserow", "views");

const API_URL = (process.env.BASEROW_API_URL || "http://localhost:8080").replace(/\/$/, "");
const DB_NAME = process.env.BASEROW_DATABASE_NAME || "MeCare";
const WORKSPACE = process.env.BASEROW_WORKSPACE || "";

const SELECT_COLORS = ["blue", "green", "orange", "red", "cyan", "purple", "yellow", "pink"];

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const ONLY_SCHEMA = args.has("--schema");
const ONLY_SEED = args.has("--seed");
const ONLY_VIEWS = args.has("--views");
const UPDATE_SEED = args.has("--update-seed"); // upsert: cập nhật nội dung hàng đã tồn tại theo key
// Logic upsert (insert + PATCH giữ trạng thái duyệt) dùng chung từ openclaw/lib/kichban-ops.mjs
// để cùng được test offline — KHÔNG reimplement inline (tránh divergence).

function log(...m) { console.log(...m); }
function die(msg) { console.error("✗", msg); process.exit(1); }

// ── Load + validate schema files (works offline, no API) ──────────────────
function loadSchemas() {
  const files = fs.readdirSync(SCHEMA_DIR)
    .filter((f) => /^\d+.*\.json$/.test(f))
    .sort();
  return files.map((f) => {
    const def = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, f), "utf8"));
    if (!def.table) die(`${f}: thiếu "table"`);
    if (!def.primary) die(`${f}: thiếu "primary"`);
    if (!Array.isArray(def.fields) || !def.fields.length) die(`${f}: "fields" rỗng`);
    if (!def.fields.some((x) => x.name === def.primary)) die(`${f}: primary "${def.primary}" không có trong fields`);
    def._file = f;
    return def;
  });
}

function loadSeeds() {
  if (!fs.existsSync(SEED_DIR)) return [];
  return fs.readdirSync(SEED_DIR)
    .filter((f) => /^\d+.*\.json$/.test(f))
    .sort()
    .map((f) => {
      const def = JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), "utf8"));
      def._file = f;
      return def;
    });
}

// ── HTTP ──────────────────────────────────────────────────────────────────
let AUTH = null; // { scheme: "JWT"|"Token", value }

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
    log("⚠ Dùng database Token — chỉ đủ quyền seed (row), KHÔNG tạo schema. Đặt BASEROW_EMAIL/PASSWORD để tạo bảng/field.");
    return;
  }
  die("Thiếu auth: đặt BASEROW_EMAIL+BASEROW_PASSWORD (schema) hoặc BASEROW_JWT, hoặc BASEROW_API_TOKEN (seed-only).");
}

// ── Baserow field type mapping ──────────────────────────────────────────────
function toBaserowField(def, tableIdByName) {
  const base = { name: def.name };
  switch (def.type) {
    case "text": return { ...base, type: "text" };
    case "long_text": return { ...base, type: "long_text" };
    case "boolean": return { ...base, type: "boolean" };
    case "number":
      return { ...base, type: "number", number_decimal_places: def.decimals ?? 0, number_negative: false };
    case "single_select":
      return {
        ...base, type: "single_select",
        select_options: (def.options || []).map((value, i) => ({ value, color: SELECT_COLORS[i % SELECT_COLORS.length] })),
      };
    case "date":
      return { ...base, type: "date", date_format: "ISO", date_include_time: !!def.include_time, date_time_format: "24" };
    case "link_row": {
      const tid = tableIdByName[def.link_table];
      if (!tid) throw new Error(`link_row "${def.name}" trỏ tới bảng chưa tồn tại: ${def.link_table}`);
      return { ...base, type: "link_row", link_row_table_id: tid };
    }
    default:
      throw new Error(`Kiểu field không hỗ trợ: ${def.type} (${def.name})`);
  }
}

// ── Ensure database ─────────────────────────────────────────────────────────
async function ensureDatabase() {
  let workspaces = await api("GET", "/api/workspaces/");
  let ws = WORKSPACE
    ? workspaces.find((w) => String(w.id) === WORKSPACE || w.name === WORKSPACE)
    : workspaces[0];
  if (!ws) {
    // Auto-tạo workspace nếu chưa có (tài khoản mới hoặc tên chỉ định chưa tồn tại).
    const name = WORKSPACE || "MeCare";
    ws = await api("POST", "/api/workspaces/", { name });
    log(`✓ Tạo workspace: ${name} (#${ws.id})`);
  }
  log(`• Workspace: ${ws.name} (#${ws.id})`);

  const apps = await api("GET", `/api/applications/workspace/${ws.id}/`);
  let db = apps.find((a) => a.type === "database" && a.name === DB_NAME);
  if (db) {
    log(`• Database tồn tại: ${DB_NAME} (#${db.id}) — tái sử dụng`);
  } else {
    db = await api("POST", `/api/applications/workspace/${ws.id}/`, { name: DB_NAME, type: "database" });
    log(`✓ Tạo database: ${DB_NAME} (#${db.id})`);
  }
  return db;
}

// ── Ensure table + fields (idempotent) ──────────────────────────────────────
async function ensureTable(dbId, def, tableIdByName) {
  const tables = await api("GET", `/api/database/tables/database/${dbId}/`);
  let table = tables.find((t) => t.name === def.table);
  let created = false;
  if (!table) {
    table = await api("POST", `/api/database/tables/database/${dbId}/`, { name: def.table });
    created = true;
    log(`✓ Tạo bảng: ${def.table} (#${table.id})`);
  } else {
    log(`• Bảng tồn tại: ${def.table} (#${table.id})`);
  }
  tableIdByName[def.table] = table.id;

  let fields = await api("GET", `/api/database/fields/table/${table.id}/`);
  const byName = (n) => fields.find((f) => f.name === n);

  // Primary: rename/retype Baserow's auto primary field -> schema primary.
  const primaryDef = def.fields.find((f) => f.name === def.primary);
  const currentPrimary = fields.find((f) => f.primary);
  if (currentPrimary && currentPrimary.name !== def.primary) {
    // Primary field can't be link_row; schemas never set a link_row primary.
    const patch = toBaserowField(primaryDef, tableIdByName);
    await api("PATCH", `/api/database/fields/${currentPrimary.id}/`, patch);
    log(`  ↳ primary -> ${def.primary}`);
    fields = await api("GET", `/api/database/fields/table/${table.id}/`);
  }

  // Delete Baserow default non-primary sample fields not in schema (only on fresh create).
  if (created) {
    const wanted = new Set(def.fields.map((f) => f.name));
    for (const f of fields) {
      if (!f.primary && !wanted.has(f.name)) {
        await api("DELETE", `/api/database/fields/${f.id}/`);
      }
    }
    fields = await api("GET", `/api/database/fields/table/${table.id}/`);
  }

  // Create missing non-primary fields.
  for (const fd of def.fields) {
    if (fd.name === def.primary) continue;
    if (byName(fd.name)) { continue; } // idempotent: skip existing
    const payload = toBaserowField(fd, tableIdByName);
    await api("POST", `/api/database/fields/table/${table.id}/`, payload);
    log(`  + field ${fd.name} (${fd.type})`);
    fields = await api("GET", `/api/database/fields/table/${table.id}/`);
  }
  return table;
}

// ── Seed (idempotent by key fields) ─────────────────────────────────────────
async function applySeed(dbId, seed, tableIdByName) {
  const tables = await api("GET", `/api/database/tables/database/${dbId}/`);
  const table = tables.find((t) => t.name === seed.table);
  if (!table) die(`Seed ${seed._file}: bảng ${seed.table} chưa tồn tại (chạy --schema trước).`);

  // Resolve tenant link.
  let tenantRowId = null;
  if (seed.tenant_slug) {
    const phTables = tables.find((t) => t.name === "Pharmacies");
    const rows = await api("GET", `/api/database/rows/table/${phTables.id}/?user_field_names=true&size=200`);
    const ph = rows.results.find((r) => r.pharmacy_slug === seed.tenant_slug);
    if (!ph) die(`Seed ${seed._file}: tenant slug "${seed.tenant_slug}" chưa seed (chạy seed Pharmacies trước).`);
    tenantRowId = ph.id;
  }

  const existing = await api("GET", `/api/database/rows/table/${table.id}/?user_field_names=true&size=200`);
  const keys = seed.key || [];
  // Idempotency scoped to tenant (NFR-6): dedup only against rows of THIS pharmacy,
  // else a 2nd tenant's key (vd care_group 1..6) collides with tenant #1 và bị bỏ qua.
  const sameTenant = (r) => {
    if (tenantRowId === null) return true;
    const link = r.pharmacy_id;
    const ids = Array.isArray(link) ? link.map((x) => x.id) : [];
    return ids.includes(tenantRowId);
  };
  // Store adapter khớp interface kichban-ops (list/create/update). list() chỉ trả hàng CỦA
  // tenant này (NFR-6): dedup theo key không đụng tenant khác (vd care_group 1..6 trùng số).
  const store = {
    list: async () => existing.results.filter(sameTenant),
    create: (payload) => api("POST", `/api/database/rows/table/${table.id}/?user_field_names=true`, payload),
    update: (id, patch) => api("PATCH", `/api/database/rows/table/${table.id}/${id}/?user_field_names=true`, patch),
  };
  // decorate: gắn link tenant khi INSERT hàng mới (update không đụng pharmacy_id).
  const decorate = tenantRowId !== null ? (row) => ({ ...row, pharmacy_id: [tenantRowId] }) : null;

  const res = await upsertSeed({ store, seedRows: seed.rows, keyFields: keys, update: UPDATE_SEED, decorate });
  log(`• Seed ${seed.table}: +${res.inserted} mới, ${res.updated} cập nhật, ${res.skipped} bỏ qua (idempotent${UPDATE_SEED ? ", upsert" : ""})`);
}

// ── Load + validate view files (works offline, no API) ────────────────────────
function loadViews() {
  if (!fs.existsSync(VIEWS_DIR)) return [];
  const files = fs.readdirSync(VIEWS_DIR)
    .filter((f) => /^\d+.*\.json$/.test(f))
    .sort();
  return files.map((f) => {
    const def = JSON.parse(fs.readFileSync(path.join(VIEWS_DIR, f), "utf8"));
    if (!def.type) die(`views/${f}: thiếu "type" (form|grid)`);
    if (!def.table) die(`views/${f}: thiếu "table"`);
    if (!def.name) die(`views/${f}: thiếu "name"`);
    def._file = f;
    return def;
  });
}

// ── Apply single view (idempotent) ────────────────────────────────────────────
async function applyView(dbId, viewDef, tableIdByName) {
  const tableId = tableIdByName[viewDef.table];
  if (!tableId) die(`View ${viewDef._file}: bảng "${viewDef.table}" chưa tồn tại (chạy --schema trước).`);

  // Fetch existing fields for this table (need field IDs for sortings/options).
  const allFields = await api("GET", `/api/database/fields/table/${tableId}/`);
  const fieldIdByName = {};
  for (const f of allFields) fieldIdByName[f.name] = f.id;

  // Idempotent: skip if view with same name already exists.
  const existingViews = await api("GET", `/api/database/views/table/${tableId}/`);
  let view = existingViews.find((v) => v.name === viewDef.name);
  if (view) {
    log(`• View tồn tại: ${viewDef.table}/${viewDef.name} (#${view.id}) — tái sử dụng`);
  } else {
    view = await api("POST", `/api/database/views/table/${tableId}/`, {
      type: viewDef.type,
      name: viewDef.name,
    });
    log(`✓ Tạo view: ${viewDef.table}/${viewDef.name} (#${view.id})`);
  }

  if (viewDef.type === "form") {
    // Patch form-level meta (title, submit label, description).
    await api("PATCH", `/api/database/views/form/${view.id}/`, {
      ...(viewDef.title              && { title: viewDef.title }),
      ...(viewDef.submit_button_label && { submit_button_label: viewDef.submit_button_label }),
      ...(viewDef.description        && { description: viewDef.description }),
    });

    // Patch field options (visibility, order, required, label, description).
    if (viewDef.fields && viewDef.fields.length) {
      const fieldOptions = {};
      for (const fd of viewDef.fields) {
        const fid = fieldIdByName[fd.name];
        if (!fid) { log(`  ⚠ field "${fd.name}" không tìm thấy trong bảng — bỏ qua`); continue; }
        const opt = { enabled: !fd.hidden };
        if (fd.order       !== undefined) opt.order       = fd.order;
        if (fd.required    !== undefined) opt.required    = fd.required;
        if (fd.label       !== undefined) opt.name        = fd.label;
        if (fd.description !== undefined) opt.description = fd.description;
        if (fd.default_value !== undefined) log(`  ⚠ field "${fd.name}": default_value trong view JSON không áp qua field-options API — set tại schema field definition thay thế.`);
        fieldOptions[fid] = opt;
      }
      await api("PATCH", `/api/database/views/${view.id}/field-options/`, { field_options: fieldOptions });
      log(`  ↳ field options áp xong (${Object.keys(fieldOptions).length} fields)`);
    }
  }

  if (viewDef.type === "grid") {
    // Apply field visibility options.
    if (viewDef.fields && viewDef.fields.length) {
      const fieldOptions = {};
      for (const fd of viewDef.fields) {
        const fid = fieldIdByName[fd.name];
        if (!fid) { log(`  ⚠ field "${fd.name}" không tìm thấy trong bảng — bỏ qua`); continue; }
        fieldOptions[fid] = { hidden: !!fd.hidden };
      }
      await api("PATCH", `/api/database/views/${view.id}/field-options/`, { field_options: fieldOptions });
      log(`  ↳ field visibility áp xong`);
    }

    // Apply sortings (POST each; idempotent: skip if same field+order combo exists).
    if (viewDef.sortings && viewDef.sortings.length) {
      const existingSorts = await api("GET", `/api/database/views/${view.id}/sortings/`);
      const existingSet = new Set(
        (existingSorts.results || existingSorts).map((s) => `${s.field}:${s.order}`)
      );
      for (const sort of viewDef.sortings) {
        const fid = fieldIdByName[sort.field];
        if (!fid) { log(`  ⚠ sort field "${sort.field}" không tìm thấy — bỏ qua`); continue; }
        const key = `${fid}:${sort.order}`;
        if (!existingSet.has(key)) {
          await api("POST", `/api/database/views/${view.id}/sortings/`, { field: fid, order: sort.order });
          log(`  ↳ sort thêm: ${sort.field} ${sort.order}`);
        }
      }
    }
  }
}

async function applyViews(dbId, tableIdByName) {
  const views = loadViews();
  if (!views.length) { log("• Views: không có file trong baserow/views/"); return; }
  log(`Views: ${views.length} file — ${views.map((v) => `${v.table}/${v.name}`).join(", ")}`);
  for (const v of views) {
    await applyView(dbId, v, tableIdByName);
  }
  log("✓ Views áp xong.");
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const schemas = loadSchemas();
  log(`Schema: ${schemas.length} bảng — ${schemas.map((s) => s.table).join(", ")}`);

  if (DRY_RUN) {
    const seeds = loadSeeds();
    log(`Seed: ${seeds.length} file — ${seeds.map((s) => s.table).join(", ")}`);
    const views = loadViews();
    log(`Views: ${views.length} file — ${views.map((v) => `${v.table}/${v.name} (${v.type})`).join(", ") || "(none)"}`);
    log("✓ Dry-run OK — JSON hợp lệ, naming/primary/views kiểm tra xong. Không gọi API.");
    return;
  }

  await authenticate();
  const db = await ensureDatabase();
  const tableIdByName = {};

  if (!ONLY_SEED && !ONLY_VIEWS) {
    for (const def of schemas) {
      await ensureTable(db.id, def, tableIdByName);
    }
    log("✓ Schema áp xong.");
  }

  if (!ONLY_SCHEMA && !ONLY_VIEWS) {
    const seeds = loadSeeds();
    for (const seed of seeds) {
      await applySeed(db.id, seed, tableIdByName);
    }
    log("✓ Seed áp xong.");
  }

  if (!ONLY_SCHEMA && !ONLY_SEED) {
    // Ensure tableIdByName populated even when ONLY_VIEWS (schema loop skipped).
    if (ONLY_VIEWS) {
      const tables = await api("GET", `/api/database/tables/database/${db.id}/`);
      for (const t of tables) tableIdByName[t.name] = t.id;
    }
    await applyViews(db.id, tableIdByName);
  }
}

main().catch((e) => die(e.message));
