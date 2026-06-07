// multi-tenant-spike.mjs — Spike multi-tenant session isolation pattern (Story 1.6, G6).
//
// Mục tiêu: chứng minh pattern ZaloChannelImpl multi-tenant isolation CÓ THỂ xây dựng
// trên nền openzca/openzalo. Spike này test IN-MEMORY isolation (JS process level),
// KHÔNG test per-process openzca isolation thật (Epic 2+).
//
// GIỚI HẠN SPIKE: openzca CLI = 1 process = 1 session (zca-js mỗi instance = 1 session).
// Pattern đề xuất: 1 openzca process per tenant (supervisor per-tenant spawn, Epic 2+).
//
// Pattern DI: createSessionManager(adapter) — adapter = StubAdapter | LiveAdapter.
// [Source: architecture.md#Multi-tenancy ; AR-3 pharmacy_id partitioning ; AR-8 events]

import { EventEmitter } from "node:events";

// ── State machine states ───────────────────────────────────────────────────────────
// starting → active → crashed | stopped
export const SESSION_STATES = ["starting", "active", "crashed", "stopped"];

// ── StubAdapter — in-memory simulation, zero-dep, CI/offline ──────────────────────
export class StubAdapter {
  #sessions = new Map(); // Map<pharmacy_id, { status, inbox: Message[] }>

  async startSession(pharmacyId) {
    if (!pharmacyId) throw new Error("pharmacyId required");
    this.#sessions.set(pharmacyId, { status: "active", inbox: [] });
    return { pharmacy_id: pharmacyId, session_id: pharmacyId, status: "active" };
  }

  async sendMessage(pharmacyId, msg) {
    const sess = this.#sessions.get(pharmacyId);
    if (!sess) throw new Error(`session not found: ${pharmacyId}`);
    if (sess.status !== "active") throw new Error(`session not active: ${pharmacyId} (${sess.status})`);
    sess.inbox.push({ ...msg, pharmacy_id: pharmacyId });
  }

  async receiveMessages(pharmacyId) {
    const sess = this.#sessions.get(pharmacyId);
    if (!sess) return [];
    return [...sess.inbox];
  }

  async crashSession(pharmacyId) {
    const sess = this.#sessions.get(pharmacyId);
    if (!sess) throw new Error(`session not found: ${pharmacyId}`);
    sess.status = "crashed";
  }

  async getStatus(pharmacyId) {
    const sess = this.#sessions.get(pharmacyId);
    return sess ? sess.status : null;
  }
}

// ── LiveAdapter — shell stubs: TODO chờ Epic 2+ real openzca integration ───────────
export class LiveAdapter {
  async startSession(_pharmacyId) {
    // TODO (Epic 2+): spawn openzca process per tenant
    // openzca --session-dir zalo-bridge/tenants/<pharmacyId>/ --port <port>
    throw new Error("LiveAdapter: chưa implement (Epic 2+). Dùng StubAdapter trong test.");
  }

  async sendMessage(_pharmacyId, _msg) {
    // TODO (Epic 2+): POST to openzca HTTP endpoint /send for pharmacyId tenant
    throw new Error("LiveAdapter: chưa implement (Epic 2+).");
  }

  async receiveMessages(_pharmacyId) {
    // TODO (Epic 2+): GET /messages from openzca endpoint for pharmacyId tenant
    throw new Error("LiveAdapter: chưa implement (Epic 2+).");
  }

  async crashSession(_pharmacyId) {
    // TODO (Epic 2+): send SIGTERM to openzca process for pharmacyId tenant
    throw new Error("LiveAdapter: chưa implement (Epic 2+).");
  }

  async getStatus(_pharmacyId) {
    // TODO (Epic 2+): GET /status from openzca endpoint for pharmacyId tenant
    throw new Error("LiveAdapter: chưa implement (Epic 2+).");
  }
}

// ── createSessionManager — factory DI: swap stub ↔ live ──────────────────────────
// Trả về { startTenant, send, receive, crash, statusAll, on }
// Events (AR-8 domain.action): session.started, session.lost, session.stopped
// Payload: { pharmacy_id, session_id, ts_iso } — KHÔNG chứa PII
export function createSessionManager(adapter) {
  if (!adapter) throw new Error("createSessionManager: adapter required");

  const emitter = new EventEmitter();
  const sessions = new Map(); // Map<pharmacy_id, TenantSession>

  async function startTenant(pharmacyId) {
    const raw = await adapter.startSession(pharmacyId);
    const session = {
      pharmacy_id: pharmacyId,
      session_id: raw.session_id ?? pharmacyId,
      status: "active",
    };
    sessions.set(pharmacyId, session);
    emitter.emit("session.started", {
      pharmacy_id: pharmacyId,
      session_id: session.session_id,
      ts_iso: new Date().toISOString(),
    });
    return session;
  }

  async function send(pharmacyId, msg) {
    return adapter.sendMessage(pharmacyId, msg);
  }

  async function receive(pharmacyId) {
    return adapter.receiveMessages(pharmacyId);
  }

  async function crash(pharmacyId) {
    await adapter.crashSession(pharmacyId);
    const session = sessions.get(pharmacyId);
    if (session) session.status = "crashed";
    emitter.emit("session.lost", {
      pharmacy_id: pharmacyId,
      session_id: session?.session_id ?? pharmacyId,
      ts_iso: new Date().toISOString(),
    });
  }

  function statusAll() {
    return Array.from(sessions.entries()).map(([id, s]) => ({ pharmacy_id: id, ...s }));
  }

  function on(event, handler) {
    emitter.on(event, handler);
  }

  return { startTenant, send, receive, crash, statusAll, on };
}
