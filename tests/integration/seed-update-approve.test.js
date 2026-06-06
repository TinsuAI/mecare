// Integration — upsert nội dung + duyệt draft→approved (Story 1.4 Task 3+4, AC4+AC5). Offline.
// Fake store in-memory mô phỏng unique key + link tenant → test idempotent deterministic,
// KHÔNG cần Baserow live. Logic thuần từ openclaw/lib/kichban-ops.mjs.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  upsertSeed,
  approveDrafts,
  buildApprovePatch,
  buildUpsertPatch,
  belongsToTenant,
  matchKey,
} from "../../openclaw/lib/kichban-ops.mjs";

// Store mô phỏng bảng Baserow: list/create/update; link_row pharmacy_id dạng [{id}].
function makeStore(initial = []) {
  let pk = 0;
  const rows = initial.map((r) => ({ id: ++pk, ...r }));
  return {
    rows,
    async list() { return rows.map((r) => ({ ...r })); },
    async create(row) { const r = { id: ++pk, ...row }; rows.push(r); return { ...r }; },
    async update(id, patch) {
      const r = rows.find((x) => x.id === id);
      if (!r) throw new Error(`no row ${id}`);
      Object.assign(r, patch);
      return { ...r };
    },
  };
}

const tenant = (id) => ({ pharmacy_id: [{ id }] });

describe("upsertSeed — update nội dung không nhân đôi (AC5)", () => {
  test("insert mới khi key chưa tồn tại", async () => {
    const store = makeStore();
    const res = await upsertSeed({
      store,
      seedRows: [{ care_group: 1, body_template: "A", status: "draft" }],
      keyFields: ["care_group"],
      update: true,
    });
    assert.deepEqual(res, { inserted: 1, updated: 0, skipped: 0 });
    assert.equal(store.rows.length, 1);
  });

  test("update=true sửa nội dung hàng đã tồn tại, KHÔNG nhân đôi", async () => {
    const store = makeStore([{ care_group: 1, body_template: "CŨ", status: "approved" }]);
    const res = await upsertSeed({
      store,
      seedRows: [{ care_group: 1, body_template: "MỚI", status: "draft" }],
      keyFields: ["care_group"],
      update: true,
    });
    assert.deepEqual(res, { inserted: 0, updated: 1, skipped: 0 });
    assert.equal(store.rows.length, 1, "không nhân đôi");
    assert.equal(store.rows[0].body_template, "MỚI", "nội dung cập nhật");
  });

  test("update KHÔNG hạ status approved→draft (giữ trạng thái duyệt)", async () => {
    const store = makeStore([{ care_group: 1, body_template: "CŨ", status: "approved", approved_at: "2026-01-01T00:00:00Z" }]);
    await upsertSeed({
      store,
      seedRows: [{ care_group: 1, body_template: "MỚI", status: "draft" }],
      keyFields: ["care_group"],
      update: true,
    });
    assert.equal(store.rows[0].status, "approved", "status approved bị hạ về draft");
    assert.equal(store.rows[0].approved_at, "2026-01-01T00:00:00Z", "approved_at bị reset");
    assert.equal(store.rows[0].body_template, "MỚI");
  });

  test("update=false (mặc định): insert-only, skip key trùng", async () => {
    const store = makeStore([{ care_group: 1, body_template: "CŨ", status: "draft" }]);
    const res = await upsertSeed({
      store,
      seedRows: [{ care_group: 1, body_template: "MỚI", status: "draft" }],
      keyFields: ["care_group"],
      update: false,
    });
    assert.deepEqual(res, { inserted: 0, updated: 0, skipped: 1 });
    assert.equal(store.rows[0].body_template, "CŨ", "không đụng nội dung khi update=false");
  });

  test("chạy lại upsert không nhân đôi (idempotent)", async () => {
    const store = makeStore();
    const seed = [{ care_group: 1, body_template: "A", status: "draft" }];
    await upsertSeed({ store, seedRows: seed, keyFields: ["care_group"], update: true });
    await upsertSeed({ store, seedRows: seed, keyFields: ["care_group"], update: true });
    assert.equal(store.rows.length, 1);
  });

  test("2 row CÙNG key trong CÙNG batch không nhân đôi (intra-batch dedup)", async () => {
    const store = makeStore();
    const res = await upsertSeed({
      store,
      seedRows: [
        { care_group: 1, body_template: "A", status: "draft" },
        { care_group: 1, body_template: "B", status: "draft" }, // cùng key → update, KHÔNG insert lần 2
      ],
      keyFields: ["care_group"],
      update: true,
    });
    assert.equal(store.rows.length, 1, "row cùng key trong batch bị nhân đôi");
    assert.deepEqual(res, { inserted: 1, updated: 1, skipped: 0 });
    assert.equal(store.rows[0].body_template, "B", "row sau ghi đè row trước");
  });

  test("2 row cùng key, update=false: row sau bị skip (không nhân đôi)", async () => {
    const store = makeStore();
    const res = await upsertSeed({
      store,
      seedRows: [
        { care_group: 1, body_template: "A", status: "draft" },
        { care_group: 1, body_template: "B", status: "draft" },
      ],
      keyFields: ["care_group"],
      update: false,
    });
    assert.equal(store.rows.length, 1);
    assert.deepEqual(res, { inserted: 1, updated: 0, skipped: 1 });
    assert.equal(store.rows[0].body_template, "A", "insert-only giữ row đầu");
  });

  test("buildUpsertPatch bỏ field trạng thái duyệt", () => {
    const patch = buildUpsertPatch({ care_group: 1, body_template: "X", status: "draft", approved_at: "z", approved_by: "y" });
    assert.deepEqual(patch, { care_group: 1, body_template: "X" });
  });
});

describe("approveDrafts — draft→approved có dấu vết, idempotent (AC4)", () => {
  test("set 3 field status/approved_at/approved_by", async () => {
    const store = makeStore([{ care_group: 1, status: "draft", ...tenant(7) }]);
    const res = await approveDrafts({ store, approvedBy: "Chủ NT", now: "2026-06-06T10:00:00Z", pharmacyId: 7 });
    assert.deepEqual(res, { approved: 1, alreadyApproved: 0, otherTenant: 0 });
    assert.equal(store.rows[0].status, "approved");
    assert.equal(store.rows[0].approved_at, "2026-06-06T10:00:00Z");
    assert.equal(store.rows[0].approved_by, "Chủ NT");
  });

  test("idempotent: chạy lại KHÔNG reset approved_at", async () => {
    const store = makeStore([{ care_group: 1, status: "draft", ...tenant(7) }]);
    await approveDrafts({ store, approvedBy: "A", now: "2026-06-06T10:00:00Z", pharmacyId: 7 });
    const res2 = await approveDrafts({ store, approvedBy: "B", now: "2026-06-07T11:00:00Z", pharmacyId: 7 });
    assert.deepEqual(res2, { approved: 0, alreadyApproved: 1, otherTenant: 0 });
    assert.equal(store.rows[0].approved_at, "2026-06-06T10:00:00Z", "approved_at bị reset");
    assert.equal(store.rows[0].approved_by, "A", "approved_by bị ghi đè");
  });

  test("chỉ duyệt đúng tenant (NFR-6 isolation)", async () => {
    const store = makeStore([
      { care_group: 1, status: "draft", ...tenant(7) },
      { care_group: 2, status: "draft", ...tenant(99) },
    ]);
    const res = await approveDrafts({ store, approvedBy: "A", now: "2026-06-06T10:00:00Z", pharmacyId: 7 });
    assert.deepEqual(res, { approved: 1, alreadyApproved: 0, otherTenant: 1 });
    assert.equal(store.rows[1].status, "draft", "tenant khác bị duyệt nhầm");
  });

  test("buildApprovePatch ném khi thiếu arg", () => {
    assert.throws(() => buildApprovePatch({ now: "z" }), /approvedBy/);
    assert.throws(() => buildApprovePatch({ approvedBy: "a" }), /now/);
  });

  test("belongsToTenant xử lý link [{id}], id thô, và null", () => {
    assert.equal(belongsToTenant({ pharmacy_id: [{ id: 7 }] }, 7), true);
    assert.equal(belongsToTenant({ pharmacy_id: 7 }, 7), true);
    assert.equal(belongsToTenant({ pharmacy_id: [{ id: 7 }] }, 99), false);
    assert.equal(belongsToTenant({ pharmacy_id: [] }, null), true, "pharmacyId null = mọi hàng");
  });
});

// ─── QA gap fills (Story 1.4) ────────────────────────────────────────────────

describe("upsertSeed — guard arg & batch hỗn hợp (AC5)", () => {
  test("ném khi store thiếu list()/create()", async () => {
    await assert.rejects(
      () => upsertSeed({ store: {}, seedRows: [], keyFields: ["care_group"] }),
      /store cần list\(\)\/create\(\)/,
    );
  });
  test("ném khi update=true mà store thiếu update()", async () => {
    const store = { list: async () => [], create: async (r) => r };
    await assert.rejects(
      () => upsertSeed({ store, seedRows: [], keyFields: ["care_group"], update: true }),
      /store cần update\(\) khi update=true/,
    );
  });
  test("ném khi seedRows không phải mảng", async () => {
    await assert.rejects(
      () => upsertSeed({ store: makeStore(), seedRows: null, keyFields: ["care_group"] }),
      /seedRows bắt buộc là mảng/,
    );
  });
  test("batch hỗn hợp: đếm đúng inserted/updated/skipped", async () => {
    const store = makeStore([
      { care_group: 1, body_template: "CŨ1", status: "draft" },   // sẽ update
      { care_group: 2, body_template: "CŨ2", status: "draft" },   // không có trong seed → giữ nguyên
    ]);
    const res = await upsertSeed({
      store,
      seedRows: [
        { care_group: 1, body_template: "MỚI1", status: "draft" }, // update
        { care_group: 3, body_template: "MỚI3", status: "draft" }, // insert
      ],
      keyFields: ["care_group"],
      update: true,
    });
    assert.deepEqual(res, { inserted: 1, updated: 1, skipped: 0 });
    assert.equal(store.rows.length, 3);
  });
  test("decorate áp dụng khi insert hàng mới", async () => {
    const store = makeStore();
    await upsertSeed({
      store,
      seedRows: [{ care_group: 1, body_template: "A", status: "draft" }],
      keyFields: ["care_group"],
      update: true,
      decorate: (row) => ({ ...row, pharmacy_id: [42] }),
    });
    assert.deepEqual(store.rows[0].pharmacy_id, [42], "decorate không áp dụng khi insert");
  });
  test("buildUpsertPatch tôn trọng statusFields tùy biến", () => {
    const patch = buildUpsertPatch(
      { care_group: 1, body_template: "X", custom: "keep-me", status: "draft" },
      { statusFields: ["custom"] },
    );
    assert.deepEqual(patch, { care_group: 1, body_template: "X", status: "draft" });
  });
});

describe("matchKey — bộ key (AC5)", () => {
  test("ném khi keyFields rỗng/không phải mảng", () => {
    assert.throws(() => matchKey({}, {}, []), /keyFields bắt buộc/);
    assert.throws(() => matchKey({}, {}, null), /keyFields bắt buộc/);
  });
  test("multi-field key: khớp khi mọi field bằng nhau", () => {
    assert.equal(matchKey({ scope: "tpcn", care_group: 4 }, { scope: "tpcn", care_group: 4 }, ["scope", "care_group"]), true);
    assert.equal(matchKey({ scope: "tpcn", care_group: 4 }, { scope: "tpcn", care_group: 5 }, ["scope", "care_group"]), false);
  });
  test("so khớp dạng chuỗi (số vs text ổn định)", () => {
    assert.equal(matchKey({ care_group: 1 }, { care_group: "1" }, ["care_group"]), true);
  });
});

describe("approveDrafts — guard & duyệt mọi tenant khi pharmacyId=null (AC4)", () => {
  test("ném khi store thiếu list()/update()", async () => {
    await assert.rejects(
      () => approveDrafts({ store: { list: async () => [] }, approvedBy: "A", now: "z" }),
      /store cần list\(\)\/update\(\)/,
    );
  });
  test("ném sớm khi thiếu approvedBy/now (qua buildApprovePatch)", async () => {
    await assert.rejects(() => approveDrafts({ store: makeStore(), now: "z" }), /approvedBy/);
    await assert.rejects(() => approveDrafts({ store: makeStore(), approvedBy: "A" }), /now/);
  });
  test("pharmacyId=null duyệt mọi tenant", async () => {
    const store = makeStore([
      { care_group: 1, status: "draft", ...tenant(7) },
      { care_group: 2, status: "draft", ...tenant(99) },
    ]);
    const res = await approveDrafts({ store, approvedBy: "A", now: "2026-06-06T10:00:00Z", pharmacyId: null });
    assert.deepEqual(res, { approved: 2, alreadyApproved: 0, otherTenant: 0 });
  });
  test("hỗn hợp draft/approved cùng tenant: chỉ duyệt draft", async () => {
    const store = makeStore([
      { care_group: 1, status: "approved", approved_at: "2026-01-01T00:00:00Z", ...tenant(7) },
      { care_group: 2, status: "draft", ...tenant(7) },
    ]);
    const res = await approveDrafts({ store, approvedBy: "A", now: "2026-06-06T10:00:00Z", pharmacyId: 7 });
    assert.deepEqual(res, { approved: 1, alreadyApproved: 1, otherTenant: 0 });
    assert.equal(store.rows[0].approved_at, "2026-01-01T00:00:00Z", "approved cũ bị reset");
  });
});

describe("belongsToTenant — biên (NFR-6)", () => {
  test("pharmacy_id undefined → false khi có pharmacyId", () => {
    assert.equal(belongsToTenant({}, 7), false);
  });
  test("mảng id thô (không bọc object)", () => {
    assert.equal(belongsToTenant({ pharmacy_id: [7, 8] }, 8), true);
    assert.equal(belongsToTenant({ pharmacy_id: [7, 8] }, 9), false);
  });
  test("pharmacyId undefined = mọi hàng (giống null)", () => {
    assert.equal(belongsToTenant({ pharmacy_id: [{ id: 7 }] }, undefined), true);
  });
});
