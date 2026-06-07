// Contract — Baserow schema nguồn sự thật (Story 1.2, AC1-AC5). Offline, no Baserow live.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { repoPath } from "../helpers/server.js";

const SCHEMA_DIR = repoPath("baserow/schema");
const SEED_DIR = repoPath("baserow/seed");

function loadJson(dir) {
  return fs.readdirSync(dir)
    .filter((f) => /^\d+.*\.json$/.test(f))
    .sort()
    .map((f) => ({ file: f, def: JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }));
}

const schemas = loadJson(SCHEMA_DIR);
const byTable = Object.fromEntries(schemas.map((s) => [s.def.table, s.def]));

// AR-3: 9 bảng lõi (Purchases = biến thể Medications/Purchases hợp lệ) + Story 3.2 CustomerGroupChanges.
const REQUIRED_TABLES = [
  "Pharmacies", "Customers", "Purchases", "CareSchedule", "Messages",
  "EscalationCases", "QuotaCounter", "MessageTemplates", "FaqEntries",
  "CustomerGroupChanges",
];

const fieldNames = (def) => def.fields.map((f) => f.name);

describe("AC1 — bộ 9 bảng lõi + naming", () => {
  test("đủ 10 bảng theo AR-3 + Story 3.2", () => {
    assert.equal(schemas.length, 10, `có ${schemas.length} file schema`);
    for (const t of REQUIRED_TABLES) {
      assert.ok(byTable[t], `thiếu bảng ${t}`);
    }
  });

  test("table PascalCase (số nhiều / danh từ tập hợp AR-3)", () => {
    // AR-3 cho phép danh từ tập hợp không hậu tố -s: CareSchedule, QuotaCounter.
    const COLLECTIVE = new Set(["CareSchedule", "QuotaCounter"]);
    for (const { def } of schemas) {
      assert.match(def.table, /^[A-Z][a-zA-Z]*$/, `table không PascalCase: ${def.table}`);
      if (!COLLECTIVE.has(def.table)) {
        assert.match(def.table, /s$/, `table không số nhiều: ${def.table}`);
      }
    }
  });

  test("field snake_case", () => {
    for (const { def } of schemas) {
      for (const f of fieldNames(def)) {
        assert.match(f, /^[a-z][a-z0-9_]*$/, `field không snake_case: ${def.table}.${f}`);
      }
    }
  });

  test("FK dạng <entity>_id và là link_row", () => {
    for (const { def } of schemas) {
      for (const f of def.fields) {
        if (f.type === "link_row") {
          assert.match(f.name, /_id$/, `FK không kết thúc _id: ${def.table}.${f.name}`);
          assert.ok(f.link_table, `link_row thiếu link_table: ${def.table}.${f.name}`);
          assert.ok(byTable[f.link_table], `link_table không tồn tại: ${f.link_table}`);
        }
      }
    }
  });

  test("primary hợp lệ + không phải link_row", () => {
    for (const { def } of schemas) {
      const p = def.fields.find((f) => f.name === def.primary);
      assert.ok(p, `primary không có trong fields: ${def.table}.${def.primary}`);
      assert.notEqual(p.type, "link_row", `primary không được là link_row: ${def.table}`);
    }
  });
});

describe("AC2 — bảng kịch bản đủ field duyệt", () => {
  const APPROVAL = ["status", "version", "updated_by", "approved_at", "approved_by"];

  test("MessageTemplates: scenario_id + care_group + body_template + field duyệt (Story 1.9)", () => {
    const f = fieldNames(byTable.MessageTemplates);
    for (const need of ["scenario_id", "care_group", "body_template", ...APPROVAL]) {
      assert.ok(f.includes(need), `MessageTemplates thiếu ${need}`);
    }
    const status = byTable.MessageTemplates.fields.find((x) => x.name === "status");
    assert.deepEqual(status.options, ["draft", "approved"], "status enum sai");
    // scenario_id phải là text field (dùng làm idempotency key)
    const sid = byTable.MessageTemplates.fields.find(x => x.name === "scenario_id");
    assert.equal(sid.type, "text", "scenario_id phải là text field");
  });

  test("FaqEntries: scope + question + answer + mandatory_suffix + field duyệt", () => {
    const f = fieldNames(byTable.FaqEntries);
    for (const need of ["scope", "question", "answer", "mandatory_suffix", ...APPROVAL]) {
      assert.ok(f.includes(need), `FaqEntries thiếu ${need}`);
    }
    const status = byTable.FaqEntries.fields.find((x) => x.name === "status");
    assert.deepEqual(status.options, ["draft", "approved"], "status enum sai");
  });
});

describe("AC3 — Customers 3 field nghiệp vụ", () => {
  test("care_group (number) + is_complaint_active (boolean) + friend_status", () => {
    const C = byTable.Customers;
    const get = (n) => C.fields.find((x) => x.name === n);
    assert.equal(get("care_group")?.type, "number", "care_group phải number");
    assert.equal(get("is_complaint_active")?.type, "boolean", "is_complaint_active phải boolean");
    assert.ok(get("friend_status"), "thiếu friend_status");
  });
});

describe("Story 3.2 — CustomerGroupChanges audit log schema", () => {
  test("CustomerGroupChanges có đủ fields: changed_at, customer_id, pharmacy_id, from_group, to_group", () => {
    const cgc = byTable.CustomerGroupChanges;
    assert.ok(cgc, "thiếu bảng CustomerGroupChanges");
    const names = cgc.fields.map((f) => f.name);
    for (const need of ["changed_at", "customer_id", "pharmacy_id", "from_group", "to_group"]) {
      assert.ok(names.includes(need), `CustomerGroupChanges thiếu field ${need}`);
    }
  });

  test("primary changed_at là type date (append-only event log)", () => {
    const cgc = byTable.CustomerGroupChanges;
    const primary = cgc.fields.find((f) => f.name === cgc.primary);
    assert.ok(primary, "primary field không tìm thấy");
    assert.equal(primary.type, "date", "primary changed_at phải type date");
    assert.equal(primary.include_time, true, "changed_at phải include_time: true");
  });

  test("from_group và to_group là number (1..6 validate ở app layer)", () => {
    const cgc = byTable.CustomerGroupChanges;
    const fg = cgc.fields.find((f) => f.name === "from_group");
    const tg = cgc.fields.find((f) => f.name === "to_group");
    assert.equal(fg.type, "number", "from_group phải number");
    assert.equal(tg.type, "number", "to_group phải number");
  });

  test("changed_by field tồn tại và là type text (AC3 — tên nhân viên, tùy chọn)", () => {
    const cgc = byTable.CustomerGroupChanges;
    const cb = cgc.fields.find((f) => f.name === "changed_by");
    assert.ok(cb, "CustomerGroupChanges thiếu field changed_by");
    assert.equal(cb.type, "text", "changed_by phải type text");
  });

  test("from_group và to_group có decimals: 0 (integer — không số thập phân)", () => {
    const cgc = byTable.CustomerGroupChanges;
    const fg = cgc.fields.find((f) => f.name === "from_group");
    const tg = cgc.fields.find((f) => f.name === "to_group");
    assert.equal(fg.decimals, 0, "from_group phải decimals: 0");
    assert.equal(tg.decimals, 0, "to_group phải decimals: 0");
  });

  test("schema description ghi rõ append-only contract (không xóa hàng cũ)", () => {
    const cgc = byTable.CustomerGroupChanges;
    assert.ok(cgc.description, "CustomerGroupChanges thiếu description");
    assert.match(cgc.description, /[Aa]ppend-only|Append-only/, "description phải nêu append-only");
  });
});

describe("AC4 — phân vùng tenant pharmacy_id", () => {
  test("mọi bảng nghiệp vụ (trừ Pharmacies) có pharmacy_id link_row -> Pharmacies", () => {
    // Messages.pharmacy_id is temporarily text (Story 2.4): zalo-bridge only has string ID,
    // not Baserow row ID; upgrade to link_row deferred to Story 3+ when Pharmacies is seeded.
    const TEMP_TEXT_TABLES = new Set(["Messages"]);
    for (const { def } of schemas) {
      if (def.table === "Pharmacies") {
        assert.ok(!fieldNames(def).includes("pharmacy_id"), "Pharmacies KHÔNG có pharmacy_id");
        continue;
      }
      const fk = def.fields.find((f) => f.name === "pharmacy_id");
      assert.ok(fk, `${def.table} thiếu pharmacy_id`);
      if (TEMP_TEXT_TABLES.has(def.table)) {
        assert.equal(fk.type, "text");
      } else {
        assert.equal(fk.type, "link_row");
        assert.equal(fk.link_table, "Pharmacies");
      }
    }
  });
});

describe("AC5 — không rò PII / không webhook-export", () => {
  test("Messages KHÔNG có phone/full_name — dùng customer_ref", () => {
    const f = fieldNames(byTable.Messages);
    assert.ok(f.includes("customer_ref"), "Messages thiếu customer_ref");
    assert.ok(!f.includes("phone") && !f.includes("full_name"), "Messages KHÔNG được chứa PII trực tiếp");
  });

  test("schema KHÔNG khai báo field encrypted giả / webhook / export", () => {
    const raw = schemas.map((s) => JSON.stringify(s.def).toLowerCase()).join(" ");
    assert.ok(!/webhook|export|"encrypted"/.test(raw), "schema không được khai báo webhook/export/encrypted");
  });
});

describe("Seed — draft khung, persona Dược Sĩ Hải (KHÔNG 'Ngọc')", () => {
  const seeds = loadJson(SEED_DIR);
  const seedByTable = Object.fromEntries(seeds.map((s) => [s.def.table, s.def]));

  test("tenant tructam, persona Dược Sĩ Hải", () => {
    const ph = seedByTable.Pharmacies.rows[0];
    assert.equal(ph.pharmacy_slug, "tructam");
    assert.equal(ph.persona_name, "Dược Sĩ Hải");
  });

  // Story 1.9 mở rộng: 38 rows per-scenario thay vì 6 rows per-group.
  // Xem kichban-content.test.js cho assertion nội dung chi tiết.
  test("38 scenarios MessageTemplates draft, body_template đã điền (Story 1.9)", () => {
    const rows = seedByTable.MessageTemplates.rows;
    assert.equal(rows.length, 38, "phải đủ 38 scenarios");
    assert.ok(rows.every((r) => r.care_group >= 1 && r.care_group <= 6), "care_group nằm trong range 1–6");
    for (const r of rows) {
      assert.equal(r.status, "draft");
      assert.ok(typeof r.body_template === "string" && r.body_template.trim().length > 0,
        "body_template phải đã điền (Story 1.9)");
    }
  });

  test("không ROW seed nào chứa persona cũ 'Ngọc'", () => {
    // Chỉ quét dữ liệu thật (rows), bỏ qua _note cảnh báo.
    const raw = seeds.map((s) => JSON.stringify(s.def.rows || [])).join(" ");
    assert.ok(!/Ngọc|Ngoc/i.test(raw), "TUYỆT ĐỐI không copy persona cũ 'Ngọc' vào seed");
  });

  // Story 1.4 đã ĐIỀN: question/answer không còn rỗng. Contract khung: draft + tenant tructam.
  test("FaqEntries seed: draft tructam, question/answer đã điền (Story 1.4)", () => {
    const faq = seedByTable.FaqEntries;
    assert.ok(faq, "thiếu seed FaqEntries");
    assert.equal(faq.tenant_slug, "tructam", "seed FAQ phải gắn tenant tructam");
    assert.ok(faq.rows.length >= 9, `FaqEntries seed phải có ít nhất 9 rows (hiện có ${faq.rows.length}) — Story 5.1 mở rộng seed thêm scope tpcn-lieu-dung + dung-cu`);
    for (const r of faq.rows) {
      assert.equal(r.status, "draft", "FAQ seed phải draft");
      assert.ok(r.question && r.question.length > 0, "question phải đã điền (Story 1.4)");
      assert.ok(r.answer && r.answer.length > 0, "answer phải đã điền (Story 1.4)");
    }
  });
});

// ── Gaps phát hiện qua qa-generate-e2e (Story 1.2): tương thích applier + contract sâu ──

describe("Applier-compat — schema áp được qua scripts/apply-baserow-schema.mjs", () => {
  // Kiểu field applier toBaserowField() hỗ trợ; kiểu lạ sẽ throw lúc chạy live.
  const SUPPORTED = new Set(["text", "long_text", "boolean", "number", "single_select", "date", "link_row"]);

  test("mọi field dùng kiểu applier hỗ trợ", () => {
    for (const { def } of schemas) {
      for (const f of def.fields) {
        assert.ok(SUPPORTED.has(f.type), `kiểu không hỗ trợ: ${def.table}.${f.name} = ${f.type}`);
      }
    }
  });

  test("single_select có options không rỗng (enum xác định)", () => {
    for (const { def } of schemas) {
      for (const f of def.fields) {
        if (f.type === "single_select") {
          assert.ok(Array.isArray(f.options) && f.options.length > 0, `enum rỗng: ${def.table}.${f.name}`);
        }
      }
    }
  });

  test("FK link_row trỏ tới bảng định nghĩa ở file SỐ NHỎ HƠN (applier 1-pass theo thứ tự)", () => {
    // applier sort file 01→09 và build tableIdByName dần; link_table phải có trước.
    const fileIndex = Object.fromEntries(
      schemas.map((s) => [s.def.table, parseInt(s.file.match(/^\d+/)[0], 10)]),
    );
    for (const { file, def } of schemas) {
      const idx = parseInt(file.match(/^\d+/)[0], 10);
      for (const f of def.fields) {
        if (f.type === "link_row") {
          assert.ok(
            fileIndex[f.link_table] <= idx,
            `${def.table}.${f.name} -> ${f.link_table} (file ${fileIndex[f.link_table]}) tạo SAU bảng nguồn (file ${idx})`,
          );
        }
      }
    }
  });
});

describe("Enum & key contracts (chống drift Epic sau)", () => {
  const enumOf = (table, field) =>
    byTable[table].fields.find((f) => f.name === field)?.options;

  test("Messages.type = proactive/reply/escalation/pharmacist_reply", () => {
    assert.deepEqual(enumOf("Messages", "type"), ["proactive", "reply", "escalation", "pharmacist_reply"]);
  });

  test("EscalationCases.state = open/waiting_pharmacist/resolved", () => {
    assert.deepEqual(enumOf("EscalationCases", "state"), ["open", "waiting_pharmacist", "resolved"]);
  });

  test("EscalationCases.case_id unique (idempotency key mã ca)", () => {
    const cid = byTable.EscalationCases.fields.find((f) => f.name === "case_id");
    assert.ok(cid, "thiếu case_id");
    assert.equal(cid.unique, true, "case_id phải unique");
  });

  test("version (nếu có) là number", () => {
    for (const { def } of schemas) {
      const v = def.fields.find((f) => f.name === "version");
      if (v) assert.equal(v.type, "number", `${def.table}.version phải number`);
    }
  });
});

describe("Task 4 — env + data-governance doc (AC4/AC5)", () => {
  const read = (p) => fs.readFileSync(repoPath(p), "utf8");

  test(".env.example có BASEROW_API_URL + BASEROW_API_TOKEN", () => {
    const env = read(".env.example");
    assert.match(env, /^BASEROW_API_URL=/m, "thiếu BASEROW_API_URL");
    assert.match(env, /^BASEROW_API_TOKEN=/m, "thiếu BASEROW_API_TOKEN");
  });

  test(".env.example có BASEROW_EMAIL + BASEROW_PASSWORD (AC5 Story 1.8)", () => {
    const env = read(".env.example");
    assert.match(env, /^BASEROW_EMAIL=/m, ".env.example thiếu BASEROW_EMAIL");
    assert.match(env, /^BASEROW_PASSWORD=/m, ".env.example thiếu BASEROW_PASSWORD");
  });

  test("tenants/_template.env có BASEROW_API_TOKEN per-tenant", () => {
    assert.match(read("tenants/_template.env"), /^BASEROW_API_TOKEN=/m, "thiếu BASEROW_API_TOKEN per-tenant");
  });

  test("docs/data-governance.md document mã hóa at-rest + PII-min customer_ref", () => {
    const doc = read("docs/data-governance.md");
    assert.match(doc, /at-rest/i, "thiếu mục mã hóa at-rest");
    assert.match(doc, /LUKS|dm-crypt/, "thiếu cơ chế mã hóa volume (LUKS/dm-crypt)");
    assert.match(doc, /customer_ref/, "thiếu ranh giới PII-min customer_ref");
  });
});

describe("Story 1.8 — README Quick Start onboarding (AC5)", () => {
  const read = (p) => fs.readFileSync(repoPath(p), "utf8");

  test("README có hướng dẫn set BASEROW_EMAIL + BASEROW_PASSWORD", () => {
    const readme = read("README.md");
    assert.match(readme, /BASEROW_EMAIL/, "README thiếu BASEROW_EMAIL trong hướng dẫn onboarding");
    assert.match(readme, /BASEROW_PASSWORD/, "README thiếu BASEROW_PASSWORD trong hướng dẫn onboarding");
  });

  test("README Quick Start có lệnh apply-baserow-schema.mjs", () => {
    const readme = read("README.md");
    assert.match(readme, /apply-baserow-schema\.mjs/, "README thiếu lệnh apply-baserow-schema.mjs trong Quick Start");
  });

  test("README ghi chú script idempotent (chạy lại safe)", () => {
    const readme = read("README.md");
    assert.match(readme, /idempotent/, "README thiếu ghi chú idempotent (AC4 Story 1.8)");
  });
});
