// API tests — makeBaserowStore REST layer (Story 1.3, Task 2 / AC2+AC3).
// QA-generated gap coverage: makeBaserowStore was previously untested. Mocks global
// fetch (no Baserow live) to assert env validation, request shape, tenant/prefix
// filtering, link_row wrapping, unique-conflict detection, and error propagation.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  makeBaserowStore,
  CaseIdConflictError,
} from "../../openclaw/lib/case-allocator.mjs";

// ── Fake fetch: scripted responses + call recorder ────────────────────────────
let calls;
let realFetch;
function installFetch(responses) {
  calls = [];
  let i = 0;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    const spec = responses[i++] ?? responses[responses.length - 1];
    const bodyText = spec.body === undefined ? "" : JSON.stringify(spec.body);
    return {
      ok: spec.status >= 200 && spec.status < 300,
      status: spec.status,
      async text() {
        return bodyText;
      },
    };
  };
}

beforeEach(() => {
  realFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const ENV = {
  BASEROW_API_URL: "http://baserow.test:8080/",
  BASEROW_API_TOKEN: "tok_123",
  ESCALATION_TABLE_ID: "42",
};

describe("makeBaserowStore — env validation", () => {
  test("ném khi thiếu ESCALATION_TABLE_ID", () => {
    assert.throws(
      () => makeBaserowStore({ BASEROW_API_TOKEN: "t" }),
      /ESCALATION_TABLE_ID/,
    );
  });

  test("ném khi thiếu auth (không Token, không JWT)", () => {
    assert.throws(
      () => makeBaserowStore({ ESCALATION_TABLE_ID: "42" }),
      /auth/,
    );
  });

  test("JWT ưu tiên hơn Token khi cả hai có", async () => {
    installFetch([{ status: 200, body: { results: [] } }]);
    const store = makeBaserowStore({
      ESCALATION_TABLE_ID: "42",
      BASEROW_JWT: "jwt_abc",
      BASEROW_API_TOKEN: "tok_xyz",
    });
    await store.getByCaseId("ESC-tructam-20260606-0001");
    assert.equal(calls[0].opts.headers.Authorization, "JWT jwt_abc");
  });

  test("dùng Token khi chỉ có BASEROW_API_TOKEN", async () => {
    installFetch([{ status: 200, body: { results: [] } }]);
    const store = makeBaserowStore(ENV);
    await store.getByCaseId("ESC-tructam-20260606-0001");
    assert.equal(calls[0].opts.headers.Authorization, "Token tok_123");
  });

  test("strip dấu '/' đuôi của BASEROW_API_URL (không double-slash)", async () => {
    installFetch([{ status: 200, body: { results: [] } }]);
    const store = makeBaserowStore(ENV);
    await store.getByCaseId("ESC-tructam-20260606-0001");
    assert.ok(
      calls[0].url.startsWith("http://baserow.test:8080/api/"),
      `URL không được double-slash: ${calls[0].url}`,
    );
  });
});

describe("makeBaserowStore — listByPrefix", () => {
  test("lọc tenant (pharmacy_id) + prefix trong query string", async () => {
    installFetch([{ status: 200, body: { results: [] } }]);
    const store = makeBaserowStore(ENV);
    await store.listByPrefix({ pharmacyId: 7, prefix: "ESC-tructam-20260606-" });
    const url = calls[0].url;
    assert.match(url, /filter__pharmacy_id__link_row_has=7/);
    assert.match(url, /filter__case_id__contains=ESC-tructam-20260606-/);
    assert.match(url, /\/api\/database\/rows\/table\/42\//);
  });

  test("lọc client-side: bỏ record không khớp prefix (defensive)", async () => {
    installFetch([
      {
        status: 200,
        body: {
          results: [
            { case_id: "ESC-tructam-20260606-0001" },
            { case_id: "ESC-tructam-20260607-0009" }, // ngày khác — phải loại
            { case_id: "rác" },
            { foo: "no case_id" },
          ],
        },
      },
    ]);
    const store = makeBaserowStore(ENV);
    const rows = await store.listByPrefix({ pharmacyId: 1, prefix: "ESC-tructam-20260606-" });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].case_id, "ESC-tructam-20260606-0001");
  });

  test("ném khi HTTP không-ok", async () => {
    installFetch([{ status: 500, body: { error: "boom" } }]);
    const store = makeBaserowStore(ENV);
    await assert.rejects(
      () => store.listByPrefix({ pharmacyId: 1, prefix: "ESC-tructam-20260606-" }),
      /listByPrefix -> 500/,
    );
  });

  // Review fix: phân trang toàn bộ — trang đầy (200) phải kéo tiếp trang sau.
  test("phân trang: trang đầy 200 → fetch tiếp trang 2 cho tới khi cạn", async () => {
    const prefix = "ESC-tructam-20260606-";
    const page1 = Array.from({ length: 200 }, (_, i) => ({
      case_id: `${prefix}${String(i + 1).padStart(4, "0")}`,
    }));
    const page2 = [{ case_id: `${prefix}0201` }]; // <200 → trang cuối
    installFetch([
      { status: 200, body: { results: page1 } },
      { status: 200, body: { results: page2 } },
    ]);
    const store = makeBaserowStore(ENV);
    const rows = await store.listByPrefix({ pharmacyId: 1, prefix });
    assert.equal(calls.length, 2, "phải fetch 2 trang (trang 1 đầy → kéo tiếp)");
    assert.match(calls[0].url, /page=1/);
    assert.match(calls[1].url, /page=2/);
    assert.equal(rows.length, 201, "gộp đủ 201 record từ 2 trang");
  });

  test("phân trang: trang đầu chưa đầy → chỉ 1 fetch", async () => {
    installFetch([{ status: 200, body: { results: [{ case_id: "ESC-tructam-20260606-0001" }] } }]);
    const store = makeBaserowStore(ENV);
    await store.listByPrefix({ pharmacyId: 1, prefix: "ESC-tructam-20260606-" });
    assert.equal(calls.length, 1, "trang đầu <200 → dừng, không fetch thừa");
  });
});

describe("makeBaserowStore — getByCaseId", () => {
  test("trả record khớp chính xác case_id", async () => {
    const id = "ESC-tructam-20260606-0001";
    installFetch([{ status: 200, body: { results: [{ id: 9, case_id: id }] } }]);
    const store = makeBaserowStore(ENV);
    const row = await store.getByCaseId(id);
    assert.equal(row.id, 9);
  });

  test("trả null khi không có kết quả", async () => {
    installFetch([{ status: 200, body: { results: [] } }]);
    const store = makeBaserowStore(ENV);
    assert.equal(await store.getByCaseId("ESC-tructam-20260606-9999"), null);
  });

  test("ném khi HTTP không-ok", async () => {
    installFetch([{ status: 401, body: { error: "unauth" } }]);
    const store = makeBaserowStore(ENV);
    await assert.rejects(() => store.getByCaseId("ESC-tructam-20260606-0001"), /getByCaseId -> 401/);
  });
});

describe("makeBaserowStore — create", () => {
  test("wrap pharmacy_id (link_row) thành mảng id", async () => {
    installFetch([{ status: 200, body: { id: 1, case_id: "ESC-tructam-20260606-0001" } }]);
    const store = makeBaserowStore(ENV);
    await store.create({ case_id: "ESC-tructam-20260606-0001", pharmacy_id: 5 });
    const sent = JSON.parse(calls[0].opts.body);
    assert.deepEqual(sent.pharmacy_id, [5], "pharmacy_id phải là mảng cho link_row");
  });

  test("giữ nguyên pharmacy_id nếu đã là mảng", async () => {
    installFetch([{ status: 200, body: { id: 1 } }]);
    const store = makeBaserowStore(ENV);
    await store.create({ case_id: "ESC-tructam-20260606-0001", pharmacy_id: [5] });
    assert.deepEqual(JSON.parse(calls[0].opts.body).pharmacy_id, [5]);
  });

  test("unique-conflict (400 + error code UNIQUE) → CaseIdConflictError", async () => {
    installFetch([
      { status: 400, body: { error: "ERROR_ROW_VALUE_NOT_UNIQUE", detail: "case_id" } },
    ]);
    const store = makeBaserowStore(ENV);
    await assert.rejects(
      () => store.create({ case_id: "ESC-tructam-20260606-0001", pharmacy_id: 1 }),
      (e) => e instanceof CaseIdConflictError && e.caseId === "ESC-tructam-20260606-0001",
    );
  });

  test("400 không phải UNIQUE → lỗi generic (KHÔNG nuốt, KHÔNG nhầm conflict)", async () => {
    installFetch([{ status: 400, body: { error: "ERROR_REQUEST_BODY_VALIDATION" } }]);
    const store = makeBaserowStore(ENV);
    await assert.rejects(
      () => store.create({ case_id: "ESC-tructam-20260606-0001", pharmacy_id: 1 }),
      (e) => !(e instanceof CaseIdConflictError) && /create -> 400/.test(e.message),
    );
  });

  test("trả record JSON khi tạo thành công", async () => {
    installFetch([{ status: 200, body: { id: 77, case_id: "ESC-tructam-20260606-0001" } }]);
    const store = makeBaserowStore(ENV);
    const row = await store.create({ case_id: "ESC-tructam-20260606-0001", pharmacy_id: 1 });
    assert.equal(row.id, 77);
  });
});
