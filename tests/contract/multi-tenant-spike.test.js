// Contract tests — Story 1.6 (Spike Multi-Tenant G6).
// Xác minh: (1) TenantSession interface; (2) StubAdapter isolation logic;
// (3) session.lost event format; (4) createSessionManager factory exports đúng hàm.
// Zero-dep, offline tuyệt đối.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  StubAdapter,
  LiveAdapter,
  createSessionManager,
  SESSION_STATES,
} from "../../zalo-bridge/src/lib/multi-tenant-spike.mjs";

describe("createSessionManager — factory exports", () => {
  test("trả về đúng 6 hàm (startTenant, send, receive, crash, statusAll, on)", () => {
    const mgr = createSessionManager(new StubAdapter());
    for (const fn of ["startTenant", "send", "receive", "crash", "statusAll", "on"]) {
      assert.equal(typeof mgr[fn], "function", `thiếu hàm ${fn}`);
    }
  });

  test("throw nếu không truyền adapter", () => {
    assert.throws(() => createSessionManager(null), /adapter required/);
    assert.throws(() => createSessionManager(), /adapter required/);
  });
});

describe("SESSION_STATES — state machine contract", () => {
  test("bao gồm tất cả trạng thái: starting, active, crashed, stopped", () => {
    for (const s of ["starting", "active", "crashed", "stopped"]) {
      assert.ok(SESSION_STATES.includes(s), `thiếu trạng thái '${s}'`);
    }
  });
});

describe("StubAdapter — message routing isolation (AC1)", () => {
  test("inbox riêng biệt: pharmacy_001 KHÔNG nhận message của pharmacy_002", async () => {
    const adapter = new StubAdapter();
    await adapter.startSession("pharmacy_001");
    await adapter.startSession("pharmacy_002");

    await adapter.sendMessage("pharmacy_001", { text: "msg_A", id: "a1" });
    await adapter.sendMessage("pharmacy_002", { text: "msg_B", id: "b1" });

    const inbox001 = await adapter.receiveMessages("pharmacy_001");
    const inbox002 = await adapter.receiveMessages("pharmacy_002");

    assert.ok(inbox001.some(m => m.id === "a1"), "pharmacy_001 phải có msg_A");
    assert.ok(!inbox001.some(m => m.id === "b1"), "pharmacy_001 KHÔNG được có msg_B (cross-tenant bleed)");
    assert.ok(inbox002.some(m => m.id === "b1"), "pharmacy_002 phải có msg_B");
    assert.ok(!inbox002.some(m => m.id === "a1"), "pharmacy_002 KHÔNG được có msg_A (cross-tenant bleed)");
  });

  test("session_id khớp pharmacy_id — định danh riêng (tructam, moclan)", async () => {
    const adapter = new StubAdapter();
    const s1 = await adapter.startSession("tructam");
    const s2 = await adapter.startSession("moclan");
    assert.equal(s1.session_id, "tructam");
    assert.equal(s2.session_id, "moclan");
    assert.notEqual(s1.session_id, s2.session_id);
  });

  test("receiveMessages trả về [] nếu session không tồn tại", async () => {
    const adapter = new StubAdapter();
    const msgs = await adapter.receiveMessages("unknown_tenant");
    assert.deepEqual(msgs, []);
  });

  test("sendMessage throw 'session not found' nếu chưa start", async () => {
    const adapter = new StubAdapter();
    await assert.rejects(
      () => adapter.sendMessage("ghost_tenant", { text: "hi" }),
      /session not found/
    );
  });

  test("message giữ nguyên pharmacy_id sau khi send (AR-3 routing key)", async () => {
    const adapter = new StubAdapter();
    await adapter.startSession("pharmacy_001");
    await adapter.sendMessage("pharmacy_001", { text: "hello", id: "x1" });
    const msgs = await adapter.receiveMessages("pharmacy_001");
    assert.equal(msgs[0].pharmacy_id, "pharmacy_001");
  });

  test("3 tenants độc lập — không cross-contamination (N > 2)", async () => {
    const adapter = new StubAdapter();
    await adapter.startSession("t1");
    await adapter.startSession("t2");
    await adapter.startSession("t3");
    await adapter.sendMessage("t1", { id: "t1m1" });
    await adapter.sendMessage("t2", { id: "t2m1" });
    await adapter.sendMessage("t3", { id: "t3m1" });

    const i1 = await adapter.receiveMessages("t1");
    const i2 = await adapter.receiveMessages("t2");
    const i3 = await adapter.receiveMessages("t3");

    assert.ok(i1.every(m => m.pharmacy_id === "t1"), "t1 inbox chỉ chứa t1 messages");
    assert.ok(i2.every(m => m.pharmacy_id === "t2"), "t2 inbox chỉ chứa t2 messages");
    assert.ok(i3.every(m => m.pharmacy_id === "t3"), "t3 inbox chỉ chứa t3 messages");
  });
});

describe("StubAdapter — fault isolation (AC2)", () => {
  test("crashSession → getStatus = 'crashed'", async () => {
    const adapter = new StubAdapter();
    await adapter.startSession("pharmacy_001");
    await adapter.crashSession("pharmacy_001");
    assert.equal(await adapter.getStatus("pharmacy_001"), "crashed");
  });

  test("crash pharmacy_001 KHÔNG ảnh hưởng status pharmacy_002", async () => {
    const adapter = new StubAdapter();
    await adapter.startSession("pharmacy_001");
    await adapter.startSession("pharmacy_002");
    await adapter.crashSession("pharmacy_001");
    assert.equal(await adapter.getStatus("pharmacy_002"), "active");
  });

  test("sendMessage throw 'not active' sau crashSession", async () => {
    const adapter = new StubAdapter();
    await adapter.startSession("pharmacy_001");
    await adapter.crashSession("pharmacy_001");
    await assert.rejects(
      () => adapter.sendMessage("pharmacy_001", { text: "test" }),
      /not active/
    );
  });

  test("getStatus trả về null nếu session không tồn tại", async () => {
    const adapter = new StubAdapter();
    const status = await adapter.getStatus("no_such_tenant");
    assert.equal(status, null);
  });
});

describe("createSessionManager — routing isolation qua manager (AC1)", () => {
  test("send/receive cô lập theo pharmacy_id", async () => {
    const mgr = createSessionManager(new StubAdapter());
    await mgr.startTenant("pharmacy_001");
    await mgr.startTenant("pharmacy_002");

    await mgr.send("pharmacy_001", { text: "M1", id: "m1" });
    await mgr.send("pharmacy_002", { text: "M2", id: "m2" });

    const r1 = await mgr.receive("pharmacy_001");
    const r2 = await mgr.receive("pharmacy_002");

    assert.ok(r1.some(m => m.id === "m1"), "pharmacy_001 phải nhận M1");
    assert.ok(!r1.some(m => m.id === "m2"), "pharmacy_001 KHÔNG được nhận M2");
    assert.ok(r2.some(m => m.id === "m2"), "pharmacy_002 phải nhận M2");
    assert.ok(!r2.some(m => m.id === "m1"), "pharmacy_002 KHÔNG được nhận M1");
  });

  test("statusAll liệt kê cả 2 tenant sau startTenant", async () => {
    const mgr = createSessionManager(new StubAdapter());
    await mgr.startTenant("tructam");
    await mgr.startTenant("moclan");
    const all = mgr.statusAll();
    const ids = all.map(s => s.pharmacy_id);
    assert.ok(ids.includes("tructam"), "tructam phải có trong statusAll");
    assert.ok(ids.includes("moclan"), "moclan phải có trong statusAll");
  });

  test("TenantSession có pharmacy_id + session_id + status", async () => {
    const mgr = createSessionManager(new StubAdapter());
    const session = await mgr.startTenant("tructam");
    assert.equal(session.pharmacy_id, "tructam");
    assert.ok(session.session_id, "session_id phải có");
    assert.equal(session.status, "active");
  });
});

describe("createSessionManager — fault isolation + events (AC2, AR-8)", () => {
  test("crash(pharmacy_001) → status = 'crashed'; pharmacy_002 vẫn active", async () => {
    const mgr = createSessionManager(new StubAdapter());
    await mgr.startTenant("pharmacy_001");
    await mgr.startTenant("pharmacy_002");

    await mgr.crash("pharmacy_001");

    const all = mgr.statusAll();
    assert.equal(all.find(s => s.pharmacy_id === "pharmacy_001")?.status, "crashed");
    assert.equal(all.find(s => s.pharmacy_id === "pharmacy_002")?.status, "active");
  });

  test("session.lost emit với pharmacy_id + session_id + ts_iso (AR-8)", async () => {
    const mgr = createSessionManager(new StubAdapter());
    const lost = [];
    mgr.on("session.lost", e => lost.push(e));

    await mgr.startTenant("pharmacy_001");
    await mgr.crash("pharmacy_001");

    assert.equal(lost.length, 1, "session.lost phải emit đúng 1 lần");
    assert.equal(lost[0].pharmacy_id, "pharmacy_001");
    assert.ok(lost[0].session_id, "session_id phải có");
    assert.ok(lost[0].ts_iso, "ts_iso phải có");
    assert.match(lost[0].ts_iso, /^\d{4}-\d{2}-\d{2}T/, "ts_iso phải là ISO date");
  });

  test("session.started emit khi startTenant với payload đúng (AR-8)", async () => {
    const mgr = createSessionManager(new StubAdapter());
    const started = [];
    mgr.on("session.started", e => started.push(e));

    await mgr.startTenant("pharmacy_001");
    assert.equal(started.length, 1);
    assert.equal(started[0].pharmacy_id, "pharmacy_001");
    assert.ok(started[0].session_id);
    assert.ok(started[0].ts_iso);
  });

  test("pharmacy_002 nhận/gửi tin bình thường sau crash pharmacy_001", async () => {
    const mgr = createSessionManager(new StubAdapter());
    await mgr.startTenant("pharmacy_001");
    await mgr.startTenant("pharmacy_002");

    await mgr.crash("pharmacy_001");

    await mgr.send("pharmacy_002", { text: "still works", id: "sw1" });
    const r2 = await mgr.receive("pharmacy_002");
    assert.ok(r2.some(m => m.id === "sw1"), "pharmacy_002 phải vẫn nhận tin sau crash pharmacy_001");
  });
});

describe("LiveAdapter — shell stubs (không gọi trong test tự động)", () => {
  test("LiveAdapter tồn tại như class export", () => {
    assert.equal(typeof LiveAdapter, "function");
    assert.ok(new LiveAdapter());
  });

  test("startSession throw với message 'Epic 2+' (guard không gọi ngầm)", async () => {
    await assert.rejects(() => new LiveAdapter().startSession("test"), /Epic 2\+/);
  });

  test("sendMessage throw Epic 2+ (chưa implement)", async () => {
    await assert.rejects(() => new LiveAdapter().sendMessage("p", { text: "x" }), /Epic 2\+/);
  });

  test("receiveMessages throw Epic 2+ (chưa implement)", async () => {
    await assert.rejects(() => new LiveAdapter().receiveMessages("p"), /Epic 2\+/);
  });

  test("crashSession throw Epic 2+ (chưa implement)", async () => {
    await assert.rejects(() => new LiveAdapter().crashSession("p"), /Epic 2\+/);
  });

  test("getStatus throw Epic 2+ (chưa implement)", async () => {
    await assert.rejects(() => new LiveAdapter().getStatus("p"), /Epic 2\+/);
  });
});

describe("StubAdapter — biên và edge cases", () => {
  test("statusAll() trả về [] khi chưa có tenant nào được start", () => {
    const mgr = createSessionManager(new StubAdapter());
    assert.deepEqual(mgr.statusAll(), []);
  });

  test("receiveMessages sau crash vẫn đọc được inbox (crash ≠ xóa dữ liệu)", async () => {
    const adapter = new StubAdapter();
    await adapter.startSession("tructam");
    await adapter.sendMessage("tructam", { text: "tin cũ", id: "old1" });
    await adapter.crashSession("tructam");
    const inbox = await adapter.receiveMessages("tructam");
    assert.ok(inbox.some(m => m.id === "old1"), "inbox vẫn giữ tin nhắn sau crash");
  });

  test("startSession cùng pharmacyId hai lần — session được reset (idempotent-safe)", async () => {
    const adapter = new StubAdapter();
    await adapter.startSession("moclan");
    await adapter.sendMessage("moclan", { text: "trước reset", id: "pre" });
    await adapter.startSession("moclan");
    const inbox = await adapter.receiveMessages("moclan");
    assert.equal(inbox.length, 0, "startSession lần 2 reset inbox (session mới)");
    assert.equal(await adapter.getStatus("moclan"), "active");
  });
});

describe("Concurrent operations — race safety (AC1 multi-tenant)", () => {
  test("Promise.all startTenant 2 tenants song song — không race condition", async () => {
    const mgr = createSessionManager(new StubAdapter());
    await Promise.all([
      mgr.startTenant("pharmacy_001"),
      mgr.startTenant("pharmacy_002"),
    ]);
    const statuses = mgr.statusAll();
    assert.equal(statuses.length, 2, "cả 2 tenant phải được start");
    assert.ok(statuses.every(s => s.status === "active"), "cả 2 phải active");
  });

  test("send song song tới 2 tenants khác nhau — vẫn cô lập", async () => {
    const mgr = createSessionManager(new StubAdapter());
    await mgr.startTenant("pharmacy_001");
    await mgr.startTenant("pharmacy_002");
    await Promise.all([
      mgr.send("pharmacy_001", { text: "A parallel", id: "pa1" }),
      mgr.send("pharmacy_002", { text: "B parallel", id: "pb2" }),
    ]);
    const [r1, r2] = await Promise.all([
      mgr.receive("pharmacy_001"),
      mgr.receive("pharmacy_002"),
    ]);
    assert.ok(r1.some(m => m.id === "pa1"), "pharmacy_001 nhận tin của mình");
    assert.ok(!r1.some(m => m.id === "pb2"), "pharmacy_001 KHÔNG nhận tin của pharmacy_002");
    assert.ok(r2.some(m => m.id === "pb2"), "pharmacy_002 nhận tin của mình");
    assert.ok(!r2.some(m => m.id === "pa1"), "pharmacy_002 KHÔNG nhận tin của pharmacy_001");
  });

  test("send đến pharmacy không tồn tại throw 'session not found' (passthrough adapter)", async () => {
    const mgr = createSessionManager(new StubAdapter());
    await assert.rejects(
      () => mgr.send("ghost_tenant", { text: "hi", id: "x" }),
      /session not found/
    );
  });
});
