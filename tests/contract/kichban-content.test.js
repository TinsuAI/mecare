// Contract — nội dung seed kịch bản Story 1.4 (AC2, AC3). Offline, đọc JSON trực tiếp.
// Bảo vệ: persona cũ "Ngọc" đã loại bỏ; câu an toàn bắt buộc còn nguyên văn;
// đủ 6 nhóm MessageTemplates body_template không rỗng; FAQ scope cốt lõi có mặt.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const SEED_DIR = path.join(ROOT, "baserow", "seed");

const MT = JSON.parse(fs.readFileSync(path.join(SEED_DIR, "08-message-templates-draft.json"), "utf8"));
const FAQ = JSON.parse(fs.readFileSync(path.join(SEED_DIR, "09-faq-entries-draft.json"), "utf8"));

const allText = (obj) => JSON.stringify(obj);

describe("seed kịch bản — persona cũ loại bỏ (AC1)", () => {
  test('MessageTemplates không còn "Ngọc"', () => {
    assert.ok(!/Ngọc/.test(allText(MT)), 'tìm thấy "Ngọc" trong MessageTemplates');
  });
  test('FaqEntries không còn "Ngọc"', () => {
    assert.ok(!/Ngọc/.test(allText(FAQ)), 'tìm thấy "Ngọc" trong FaqEntries');
  });
  test('persona "Dược Sĩ Hải" hiện diện', () => {
    assert.match(allText(FAQ), /Dược Sĩ Hải/);
  });
});

describe("MessageTemplates — 38 scenarios cá nhân, body_template không rỗng (AC2, Story 1.9)", () => {
  test("38 rows, mỗi row có scenario_id", () => {
    assert.equal(MT.rows.length, 38);
    assert.ok(MT.rows.every(r => r.scenario_id), "mọi row phải có scenario_id");
  });
  test("scenario_id unique trong toàn bộ 38 rows", () => {
    const ids = MT.rows.map(r => r.scenario_id);
    assert.equal(new Set(ids).size, 38, "scenario_id phải unique");
  });
  test("care_group nằm trong range 1–6", () => {
    assert.ok(MT.rows.every(r => r.care_group >= 1 && r.care_group <= 6));
  });
  test("mọi body_template không rỗng (>50 ký tự)", () => {
    for (const r of MT.rows) {
      assert.ok(typeof r.body_template === "string" && r.body_template.trim().length > 50,
        `care_group ${r.care_group}: body_template rỗng/quá ngắn`);
    }
  });
  test("mọi hàng draft + version + updated_by", () => {
    for (const r of MT.rows) {
      assert.equal(r.status, "draft", `care_group ${r.care_group} không phải draft`);
      assert.ok(r.version >= 1);
      assert.ok(r.updated_by);
    }
  });
});

describe("câu an toàn bắt buộc — nguyên văn (AC3)", () => {
  test('quên liều: "không uống gấp đôi để bù liều"', () => {
    assert.match(allText(MT) + allText(FAQ), /không uống gấp đôi để bù liều/);
  });
  test('cờ đỏ OTC: "Sốt trên 38.5°C kéo dài hơn 2 ngày"', () => {
    assert.match(allText(MT) + allText(FAQ), /Sốt trên 38\.5°C kéo dài hơn 2 ngày/);
  });
  test('TPCN suffix nguyên văn', () => {
    const tpcn = FAQ.rows.find((r) => r.scope === "tpcn");
    assert.ok(tpcn, "thiếu scope tpcn");
    assert.equal(tpcn.mandatory_suffix, "thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh");
  });
});

describe("FaqEntries — scope cốt lõi + cấu trúc (AC2)", () => {
  const REQUIRED = ["general", "missed-dose", "otc-red-flags", "tpcn"];
  for (const s of REQUIRED) {
    test(`scope "${s}" có mặt với question + answer`, () => {
      const row = FAQ.rows.find((r) => r.scope === s);
      assert.ok(row, `thiếu scope ${s}`);
      assert.ok(row.question && row.answer, `scope ${s} thiếu question/answer`);
      assert.equal(row.status, "draft");
    });
  }
  test("key = [scope] và không trùng scope", () => {
    assert.deepEqual(FAQ.key, ["scope"]);
    const scopes = FAQ.rows.map((r) => r.scope);
    assert.equal(new Set(scopes).size, scopes.length, "scope trùng");
  });
});

// ─── QA gap fills (Story 1.4) ────────────────────────────────────────────────

describe("mô hình relay — không còn câu chữ 2-vai cũ (AC2)", () => {
  const ALL = allText(MT) + allText(FAQ);
  // Mô hình 2-vai cũ tách "nhân viên → kết nối dược sĩ" trước mặt khách → relay loại bỏ.
  test('không còn cụm "kết nối dược sĩ" (2-vai cũ)', () => {
    assert.ok(!/kết nối dược sĩ/i.test(ALL), 'còn dấu vết câu chữ 2-vai "kết nối dược sĩ"');
  });
  test('không còn cụm "nhân viên" (vai tách biệt cũ)', () => {
    assert.ok(!/nhân viên/i.test(ALL), 'còn dấu vết vai "nhân viên"');
  });
  test('AI luôn là người nói: persona "Dược Sĩ Hải" hiện diện ở MessageTemplates', () => {
    assert.match(allText(MT), /Dược Sĩ Hải/);
  });
  test('tự xưng giữ "em"', () => {
    assert.match(ALL, /\bem\b/);
  });
});

describe("cấp cứu 115 phát song song (AC2)", () => {
  test('số cấp cứu 115 hiện diện trong kịch bản', () => {
    assert.match(allText(MT) + allText(FAQ), /\b115\b/);
  });
});

describe("an toàn y tế — quy tắc bù liều đầy đủ (AC3)", () => {
  const ALL = allText(MT) + allText(FAQ);
  test('quên trong "1–2 tiếng" vẫn uống (ngưỡng thời gian)', () => {
    assert.match(ALL, /1[–-]2 tiếng/);
  });
  test('câu nguyên văn "không uống gấp đôi để bù liều" nằm trong Nhóm 1', () => {
    const g1rows = MT.rows.filter((r) => Number(r.care_group) === 1);
    assert.ok(g1rows.length > 0, "thiếu Nhóm 1");
    assert.ok(g1rows.some((r) => /không uống gấp đôi để bù liều/.test(r.body_template)),
      "Nhóm 1 phải có câu bù liều (scenario 1.4)");
  });
});

describe("placeholder runtime giữ nguyên — KHÔNG điền cứng (AC1)", () => {
  test('giữ placeholder [TÊN] (guardrail điền runtime)', () => {
    assert.match(allText(MT), /\[TÊN\]/);
  });
});

describe("FaqEntries — mọi hàng draft + version + updated_by (AC1)", () => {
  test("mọi FAQ có status=draft, version>=1, updated_by", () => {
    for (const r of FAQ.rows) {
      assert.equal(r.status, "draft", `scope ${r.scope} không phải draft`);
      assert.ok(r.version >= 1, `scope ${r.scope} version < 1`);
      assert.ok(r.updated_by, `scope ${r.scope} thiếu updated_by`);
    }
  });
  test("mọi answer không rỗng", () => {
    for (const r of FAQ.rows) {
      assert.ok(typeof r.answer === "string" && r.answer.trim().length > 0,
        `scope ${r.scope}: answer rỗng`);
    }
  });
});

// ─── QA gap fills (Story 1.9) ────────────────────────────────────────────────

describe("MessageTemplates — Story 1.9 specific contracts (AC2, AC3, AC4)", () => {
  test("updated_by = 'story-1.9' cho mọi row (AC2)", () => {
    for (const r of MT.rows) {
      assert.equal(r.updated_by, "story-1.9", `scenario_id ${r.scenario_id}: updated_by phải là "story-1.9"`);
    }
  });

  test("seed key = ['scenario_id'] — idempotency key theo AC3", () => {
    assert.deepEqual(MT.key, ["scenario_id"], "seed key phải là ['scenario_id'] (AC3)");
  });

  test("scenario_id format hợp lệ: '<nhóm>.<số>' (AC2)", () => {
    for (const r of MT.rows) {
      assert.match(r.scenario_id, /^\d+\.\d+$/, `scenario_id "${r.scenario_id}" không đúng format X.Y`);
    }
  });

  test("AC4 — scenario 1.10 là 1 row duy nhất với placeholder [cao huyết áp/tiểu đường]", () => {
    const rows110 = MT.rows.filter(r => r.scenario_id === "1.10");
    assert.equal(rows110.length, 1, "phải đúng 1 row scenario_id='1.10' (không tách 2 rows)");
    assert.match(rows110[0].body_template, /\[cao huyết áp\/tiểu đường\]/,
      "body_template 1.10 phải chứa placeholder [cao huyết áp/tiểu đường] (AC4)");
  });

  test("phân bổ rows theo nhóm đúng đặc tả: 11-5-5-6-6-5 (story spec)", () => {
    const groupCounts = Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map(g => [g, MT.rows.filter(r => r.care_group === g).length])
    );
    assert.deepEqual(groupCounts, { 1: 11, 2: 5, 3: 5, 4: 6, 5: 6, 6: 5 });
  });

  test("tất cả scenario_id kỳ vọng có mặt đầy đủ (completeness)", () => {
    const EXPECTED = [
      "1.1","1.2","1.3","1.4","1.5","1.6","1.7","1.8","1.9","1.10","1.11",
      "2.1","2.2","2.3","2.4","2.5",
      "3.1","3.2","3.3","3.4","3.5",
      "4.1","4.2","4.3","4.4","4.5","4.6",
      "5.1","5.2","5.3","5.4","5.5","5.6",
      "6.1","6.2","6.3","6.4","6.5",
    ];
    const actual = new Set(MT.rows.map(r => r.scenario_id));
    for (const id of EXPECTED) {
      assert.ok(actual.has(id), `thiếu scenario_id "${id}"`);
    }
    assert.equal(actual.size, EXPECTED.length, "có scenario_id ngoài danh sách kỳ vọng");
  });
});
