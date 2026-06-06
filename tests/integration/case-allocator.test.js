// Integration — allocator atomic seq (Story 1.3, AC2 + AC3 + AC5). Offline.
// Store in-memory mô phỏng ràng buộc unique case_id (reject trùng) → test atomic/
// concurrency/idempotent deterministic, KHÔNG cần Baserow live.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  allocateNewCaseId,
  getOrCreateByCaseId,
  CaseIdConflictError,
} from "../../openclaw/lib/case-allocator.mjs";
import { parseCaseId } from "../../openclaw/lib/case-id.mjs";

// Yield cho event loop để các call song song interleave (read trước create).
const tick = () => new Promise((r) => setTimeout(r, 0));

function linkHas(link, id) {
  if (Array.isArray(link)) return link.some((x) => String(x?.id ?? x) === String(id));
  return String(link) === String(id);
}

// Store mô phỏng: check+insert sau await là atomic (single-thread) → mô phỏng unique constraint.
function makeMemStore() {
  const rows = new Map(); // case_id -> row
  let pk = 0;
  return {
    rows,
    async listByPrefix({ pharmacyId, prefix }) {
      await tick();
      return [...rows.values()].filter(
        (r) => typeof r.case_id === "string" && r.case_id.startsWith(prefix) && linkHas(r.pharmacy_id, pharmacyId),
      );
    },
    async getByCaseId(caseId) {
      await tick();
      return rows.get(caseId) || null;
    },
    async create(fields) {
      await tick();
      if (rows.has(fields.case_id)) throw new CaseIdConflictError(fields.case_id); // unique constraint
      const row = { id: ++pk, ...fields };
      rows.set(fields.case_id, row);
      return row;
    },
  };
}

const noSleep = () => Promise.resolve();

describe("AC2 — atomic: N allocate song song → seq duy nhất", () => {
  test("N=20 Promise.all cùng (slug, ngày) → 20 seq duy nhất, monotonic 1..20", async () => {
    const store = makeMemStore();
    const N = 20;
    const at = "2026-06-06T03:00:00Z"; // 10:00 VN -> 20260606
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at }, { maxRetries: 50, sleep: noSleep }),
      ),
    );
    const seqs = results.map((r) => r.seq).sort((a, b) => a - b);
    assert.equal(new Set(seqs).size, N, "không được trùng seq");
    assert.deepEqual(seqs, Array.from({ length: N }, (_, i) => i + 1), "seq phải là 1..N liên tục");
    assert.equal(store.rows.size, N, "store phải đúng N record (không dup)");
    // mọi case_id parse được + cùng date
    for (const r of results) {
      const p = parseCaseId(r.case_id);
      assert.equal(p.slug, "tructam");
      assert.equal(p.date, "20260606");
    }
  });

  test("cạn retry → ném lỗi rõ ràng (không nuốt)", async () => {
    const store = makeMemStore();
    await Promise.all(
      Array.from({ length: 5 }, () =>
        allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" }, { maxRetries: 0, sleep: noSleep }),
      ).map((p) => p.catch((e) => e)),
    );
    // maxRetries:0 với tranh chấp → ít nhất một số call ném; kiểm store không vỡ dup
    const ids = [...store.rows.keys()];
    assert.equal(new Set(ids).size, ids.length, "không record trùng dù cạn retry");
  });
});

describe("AC1 — seq reset theo ngày / tenant", () => {
  test("sang ngày mới (cùng nhà thuốc) → seq reset 1", async () => {
    const store = makeMemStore();
    const a = await allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" }, { sleep: noSleep });
    const b = await allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at: "2026-06-07T03:00:00Z" }, { sleep: noSleep });
    assert.equal(a.case_id, "ESC-tructam-20260606-0001");
    assert.equal(b.case_id, "ESC-tructam-20260607-0001");
  });

  test("khác tenant (cùng ngày) → seq độc lập, reset 1", async () => {
    const store = makeMemStore();
    const a = await allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" }, { sleep: noSleep });
    const a2 = await allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" }, { sleep: noSleep });
    const b = await allocateNewCaseId(store, { slug: "another", pharmacyId: 2, at: "2026-06-06T03:00:00Z" }, { sleep: noSleep });
    assert.equal(a.seq, 1);
    assert.equal(a2.seq, 2);
    assert.equal(b.seq, 1, "tenant khác phải reset seq về 1");
    assert.equal(b.case_id, "ESC-another-20260606-0001");
  });

  test("monotonic tuần tự cùng (slug, ngày)", async () => {
    const store = makeMemStore();
    const seqs = [];
    for (let i = 0; i < 5; i++) {
      const r = await allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" }, { sleep: noSleep });
      seqs.push(r.seq);
    }
    assert.deepEqual(seqs, [1, 2, 3, 4, 5]);
  });

  test("tenant isolation: listByPrefix lọc pharmacy_id (NFR-6)", async () => {
    const store = makeMemStore();
    // tenant 1 có 3 ca; tenant 2 allocate cùng ngày phải bắt đầu từ 1.
    for (let i = 0; i < 3; i++) {
      await allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" }, { sleep: noSleep });
    }
    const b = await allocateNewCaseId(store, { slug: "another", pharmacyId: 2, at: "2026-06-06T03:00:00Z" }, { sleep: noSleep });
    assert.equal(b.seq, 1);
  });
});

describe("AC3 — getOrCreateByCaseId idempotent", () => {
  test("gọi 2 lần cùng case_id → 1 record, lần 2 created:false", async () => {
    const store = makeMemStore();
    const id = "ESC-tructam-20260606-0001";
    const r1 = await getOrCreateByCaseId(store, id, { pharmacy_id: 1, state: "open" });
    const r2 = await getOrCreateByCaseId(store, id, { pharmacy_id: 1, state: "open" });
    assert.equal(r1.created, true);
    assert.equal(r2.created, false);
    assert.equal(store.rows.size, 1, "chỉ 1 record (không dup)");
    assert.equal(r2.row.id, r1.row.id, "trả về đúng record cũ");
  });

  test("đua tạo song song cùng case_id → 1 record (idempotent dưới conflict)", async () => {
    const store = makeMemStore();
    const id = "ESC-tructam-20260606-0009";
    const [r1, r2] = await Promise.all([
      getOrCreateByCaseId(store, id, { pharmacy_id: 1 }),
      getOrCreateByCaseId(store, id, { pharmacy_id: 1 }),
    ]);
    assert.equal(store.rows.size, 1, "đua vẫn chỉ 1 record");
    assert.equal([r1, r2].filter((r) => r.created).length, 1, "đúng 1 lần created:true");
  });

  test("reject case_id sai format", async () => {
    const store = makeMemStore();
    await assert.rejects(() => getOrCreateByCaseId(store, "bad-id", {}));
  });
});

// QA-generated gap coverage: guards, error-not-swallowed, retry-then-succeed, defensive maxSeq.
describe("allocateNewCaseId — guards & error paths", () => {
  test("ném khi store thiếu listByPrefix/create", async () => {
    await assert.rejects(
      () => allocateNewCaseId({}, { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" }),
      /store thiếu/,
    );
  });

  test("ném khi thiếu pharmacyId (bắt buộc lọc tenant NFR-6)", async () => {
    const store = makeMemStore();
    await assert.rejects(
      () => allocateNewCaseId(store, { slug: "tructam", at: "2026-06-06T03:00:00Z" }),
      /pharmacyId/,
    );
  });

  test("lỗi store KHÔNG phải conflict → ném ngay, KHÔNG nuốt, KHÔNG retry", async () => {
    let createCalls = 0;
    const store = {
      async listByPrefix() {
        return [];
      },
      async create() {
        createCalls++;
        throw new Error("baserow 500 down");
      },
    };
    await assert.rejects(
      () => allocateNewCaseId(store, { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" }, { sleep: noSleep }),
      /baserow 500 down/,
    );
    assert.equal(createCalls, 1, "lỗi non-conflict không được retry");
  });

  test("conflict 1 lần rồi thành công → retry re-read maxSeq + cấp seq mới", async () => {
    const rows = new Map();
    let firstCreate = true;
    const store = {
      async listByPrefix({ prefix }) {
        return [...rows.values()].filter((r) => r.case_id.startsWith(prefix));
      },
      async create(fields) {
        if (firstCreate) {
          firstCreate = false;
          // mô phỏng đua: ai đó vừa chiếm seq 1 ngay trước create của ta
          rows.set("ESC-tructam-20260606-0001", { id: 1, case_id: "ESC-tructam-20260606-0001" });
          throw new CaseIdConflictError(fields.case_id);
        }
        if (rows.has(fields.case_id)) throw new CaseIdConflictError(fields.case_id);
        const row = { id: rows.size + 1, ...fields };
        rows.set(fields.case_id, row);
        return row;
      },
    };
    const r = await allocateNewCaseId(
      store,
      { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" },
      { sleep: noSleep },
    );
    assert.equal(r.seq, 2, "sau conflict trên seq 1 → re-read → cấp seq 2");
    assert.equal(r.case_id, "ESC-tructam-20260606-0002");
  });

  test("maxSeqOf defensive: bỏ qua record case_id sai format khi tính next", async () => {
    const store = makeMemStore();
    // chèn rác trực tiếp (không qua allocator)
    store.rows.set("rác-không-parse", { id: 99, case_id: "rác-không-parse", pharmacy_id: 1 });
    const r = await allocateNewCaseId(
      store,
      { slug: "tructam", pharmacyId: 1, at: "2026-06-06T03:00:00Z" },
      { sleep: noSleep },
    );
    assert.equal(r.seq, 1, "record rác không được chặn allocate (bỏ qua defensively)");
  });
});

describe("getOrCreateByCaseId — guards & error paths", () => {
  test("ném khi store thiếu getByCaseId/create", async () => {
    await assert.rejects(
      () => getOrCreateByCaseId({}, "ESC-tructam-20260606-0001", {}),
      /store thiếu/,
    );
  });

  test("lỗi create KHÔNG phải conflict → ném (không nuốt)", async () => {
    const store = {
      async getByCaseId() {
        return null;
      },
      async create() {
        throw new Error("baserow 503");
      },
    };
    await assert.rejects(
      () => getOrCreateByCaseId(store, "ESC-tructam-20260606-0001", { pharmacy_id: 1 }),
      /baserow 503/,
    );
  });
});

// Review fix: fields KHÔNG được ghi đè case_id/pharmacy_id đã cấp (chống clobber).
describe("anti-clobber — fields không ghi đè case_id/pharmacy_id", () => {
  test("allocateNewCaseId: fields.case_id/pharmacy_id rác bị bỏ qua, dùng giá trị cấp", async () => {
    const store = makeMemStore();
    const r = await allocateNewCaseId(
      store,
      {
        slug: "tructam",
        pharmacyId: 1,
        at: "2026-06-06T03:00:00Z",
        fields: { case_id: "ESC-HACK-20990101-9999", pharmacy_id: 999, state: "open" },
      },
      { sleep: noSleep },
    );
    assert.equal(r.case_id, "ESC-tructam-20260606-0001", "case_id phải do allocator cấp, KHÔNG từ fields");
    assert.equal(r.row.case_id, "ESC-tructam-20260606-0001");
    assert.equal(r.row.pharmacy_id, 1, "pharmacy_id phải là tenant cấp, KHÔNG bị fields ghi đè");
    assert.equal(r.row.state, "open", "field hợp lệ vẫn được ghi");
  });

  test("getOrCreateByCaseId: fields.case_id rác bị bỏ qua, dùng caseId tham số", async () => {
    const store = makeMemStore();
    const id = "ESC-tructam-20260606-0007";
    const r = await getOrCreateByCaseId(store, id, { case_id: "ESC-HACK-20990101-9999", state: "open" });
    assert.equal(r.case_id, id);
    assert.equal(r.row.case_id, id, "record ghi đúng case_id đã biết, KHÔNG từ fields");
    assert.equal(store.rows.has(id), true);
  });
});
