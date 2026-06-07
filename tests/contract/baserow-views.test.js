// Contract — Baserow view definitions (Story 3.1). Offline, no Baserow live.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { repoPath } from "../helpers/server.js";

const VIEWS_DIR = repoPath("baserow/views");

function loadView(filename) {
  return JSON.parse(fs.readFileSync(path.join(VIEWS_DIR, filename), "utf8"));
}

const counterForm = loadView("02-customers-counter-form.json");
const phoneLookup = loadView("02-customers-phone-lookup.json");

describe("AC1/AC3 — counter-entry-form view", () => {
  test("type=form, table=Customers, name=counter-entry-form", () => {
    assert.equal(counterForm.type, "form");
    assert.equal(counterForm.table, "Customers");
    assert.equal(counterForm.name, "counter-entry-form");
  });

  test("submit_button_label và title tồn tại", () => {
    assert.ok(counterForm.submit_button_label, "thiếu submit_button_label");
    assert.ok(counterForm.title, "thiếu title");
  });

  test("5 field hiển thị đúng thứ tự: full_name, phone, care_group, friend_status, notes", () => {
    const visible = counterForm.fields
      .filter((f) => f.hidden === false)
      .sort((a, b) => a.order - b.order)
      .map((f) => f.name);
    assert.deepEqual(visible, ["full_name", "phone", "care_group", "friend_status", "notes"]);
  });

  test("full_name và phone required=true", () => {
    const byName = Object.fromEntries(counterForm.fields.map((f) => [f.name, f]));
    assert.equal(byName.full_name.required, true, "full_name phải required");
    assert.equal(byName.phone.required, true, "phone phải required");
    assert.equal(byName.care_group.required, true, "care_group phải required");
    assert.equal(byName.friend_status.required, true, "friend_status phải required");
  });

  test("friend_status default_value=pending (AC3)", () => {
    const f = counterForm.fields.find((f) => f.name === "friend_status");
    assert.equal(f.default_value, "pending");
  });

  test("pharmacy_id, is_complaint_active, created_at, updated_at ẩn hidden=true", () => {
    const hidden = new Set(
      counterForm.fields.filter((f) => f.hidden === true).map((f) => f.name)
    );
    for (const name of ["pharmacy_id", "is_complaint_active", "created_at", "updated_at"]) {
      assert.ok(hidden.has(name), `${name} phải hidden`);
    }
  });
});

describe("AC2 — phone-lookup grid view", () => {
  test("type=grid, table=Customers, name=phone-lookup", () => {
    assert.equal(phoneLookup.type, "grid");
    assert.equal(phoneLookup.table, "Customers");
    assert.equal(phoneLookup.name, "phone-lookup");
  });

  test("sortings: phone ASC trước, full_name ASC sau", () => {
    assert.ok(Array.isArray(phoneLookup.sortings), "thiếu sortings");
    assert.equal(phoneLookup.sortings.length, 2);
    assert.equal(phoneLookup.sortings[0].field, "phone");
    assert.equal(phoneLookup.sortings[0].order, "ASC");
    assert.equal(phoneLookup.sortings[1].field, "full_name");
    assert.equal(phoneLookup.sortings[1].order, "ASC");
  });

  test("full_name, phone, care_group, friend_status, notes, pharmacy_id hiển thị", () => {
    const visible = new Set(
      phoneLookup.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    for (const name of ["full_name", "phone", "care_group", "friend_status", "notes", "pharmacy_id"]) {
      assert.ok(visible.has(name), `${name} phải visible trong phone-lookup`);
    }
  });

  test("is_complaint_active, created_at, updated_at ẩn", () => {
    const hidden = new Set(
      phoneLookup.fields.filter((f) => f.hidden === true).map((f) => f.name)
    );
    for (const name of ["is_complaint_active", "created_at", "updated_at"]) {
      assert.ok(hidden.has(name), `${name} phải hidden trong phone-lookup`);
    }
  });

  test("description đề cập tenant isolation", () => {
    assert.ok(phoneLookup.description, "thiếu description");
    assert.match(phoneLookup.description, /pharmacy_id/i, "description phải nhắc tenant isolation qua pharmacy_id");
  });
});

// ── Story 3.2: group management views ──

const customersByGroup = loadView("02-customers-by-group.json");
const groupChangesLog  = loadView("10-customer-group-changes-log.json");

describe("AC1/AC2 (Story 3.2) — customers-by-group grid view", () => {
  test("type=grid, table=Customers, name=customers-by-group", () => {
    assert.equal(customersByGroup.type, "grid");
    assert.equal(customersByGroup.table, "Customers");
    assert.equal(customersByGroup.name, "customers-by-group");
  });

  test("sortings: care_group ASC trước, full_name ASC sau", () => {
    assert.ok(Array.isArray(customersByGroup.sortings), "thiếu sortings");
    assert.equal(customersByGroup.sortings.length, 2);
    assert.equal(customersByGroup.sortings[0].field, "care_group");
    assert.equal(customersByGroup.sortings[0].order, "ASC");
    assert.equal(customersByGroup.sortings[1].field, "full_name");
    assert.equal(customersByGroup.sortings[1].order, "ASC");
  });

  test("care_group và is_complaint_active hiển thị đồng thời (AC2)", () => {
    const visible = new Set(
      customersByGroup.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    assert.ok(visible.has("care_group"), "care_group phải visible");
    assert.ok(visible.has("is_complaint_active"), "is_complaint_active phải visible");
  });

  test("full_name, phone, friend_status, notes, pharmacy_id visible", () => {
    const visible = new Set(
      customersByGroup.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    for (const name of ["full_name", "phone", "friend_status", "notes", "pharmacy_id"]) {
      assert.ok(visible.has(name), `${name} phải visible trong customers-by-group`);
    }
  });

  test("created_at và updated_at ẩn", () => {
    const hidden = new Set(
      customersByGroup.fields.filter((f) => f.hidden === true).map((f) => f.name)
    );
    assert.ok(hidden.has("created_at"), "created_at phải hidden");
    assert.ok(hidden.has("updated_at"), "updated_at phải hidden");
  });
});

describe("AC3 (Story 3.2) — group-changes-log grid view", () => {
  test("type=grid, table=CustomerGroupChanges, name=group-changes-log", () => {
    assert.equal(groupChangesLog.type, "grid");
    assert.equal(groupChangesLog.table, "CustomerGroupChanges");
    assert.equal(groupChangesLog.name, "group-changes-log");
  });

  test("sortings: changed_at DESC (mới nhất trên cùng)", () => {
    assert.ok(Array.isArray(groupChangesLog.sortings), "thiếu sortings");
    assert.equal(groupChangesLog.sortings.length, 1);
    assert.equal(groupChangesLog.sortings[0].field, "changed_at");
    assert.equal(groupChangesLog.sortings[0].order, "DESC");
  });

  test("tất cả fields visible: changed_at, customer_id, pharmacy_id, from_group, to_group, changed_by", () => {
    const visible = new Set(
      groupChangesLog.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    for (const name of ["changed_at", "customer_id", "pharmacy_id", "from_group", "to_group", "changed_by"]) {
      assert.ok(visible.has(name), `${name} phải visible trong group-changes-log`);
    }
  });

  test("description tồn tại (audit trail label)", () => {
    assert.ok(groupChangesLog.description, "group-changes-log thiếu description");
  });
});

describe("AC1/AC2 (Story 3.2) — customers-by-group view description contract", () => {
  test("description tồn tại và nhắc care_group + CustomerGroupChanges (inline-edit workflow)", () => {
    assert.ok(customersByGroup.description, "customers-by-group thiếu description");
    assert.match(customersByGroup.description, /care_group/, "description phải nhắc care_group");
    assert.match(customersByGroup.description, /CustomerGroupChanges/, "description phải nhắc CustomerGroupChanges");
  });
});

// ── Story 3.2 Task 4 — SOP doc contract (AC1/AC2/AC3) ──

const sopDoc = fs.readFileSync(repoPath("docs/baserow-counter-form-sop.md"), "utf8");

describe("AC1 (Story 3.2) — SOP doc: bảng quyết định phân nhóm", () => {
  test("section 'Bảng quyết định phân nhóm' tồn tại", () => {
    assert.match(sopDoc, /Bảng quyết định phân nhóm/, "thiếu section bảng quyết định phân nhóm trong SOP");
  });

  test("N1 override listed (mãn tính → N1 ưu tiên cao nhất)", () => {
    assert.match(sopDoc, /N1/, "SOP phải liệt kê N1");
    assert.match(sopDoc, /[Oo]verride/, "SOP phải ghi N1 override tất cả");
  });

  test("5 tình huống N6 đầy đủ: từ chối, mua hộ, vội, người già, lần đầu", () => {
    assert.match(sopDoc, /[Tt]ừ chối/, "thiếu tình huống N6: từ chối chia sẻ");
    assert.match(sopDoc, /[Mm]ua hộ/, "thiếu tình huống N6: mua hộ người khác");
    assert.match(sopDoc, /[Vv]ội/, "thiếu tình huống N6: đang vội");
    assert.match(sopDoc, /[Nn]gười già/, "thiếu tình huống N6: người già / khó giao tiếp");
    assert.match(sopDoc, /[Ll]ần đầu/, "thiếu tình huống N6: lần đầu / nhân viên quên nhập");
  });
});

describe("AC2 (Story 3.2) — SOP doc: xử lý khiếu nại không ghi đè care_group", () => {
  test("section 'Xử lý khiếu nại' tồn tại", () => {
    assert.match(sopDoc, /[Xx]ử lý khiếu nại/, "thiếu section xử lý khiếu nại trong SOP");
  });

  test("SOP khẳng định is_complaint_active KHÔNG thay thế/ghi đè care_group", () => {
    assert.match(sopDoc, /KHÔNG thay thế|không ghi đè|không.*override/i, "SOP phải nêu rõ is_complaint_active không ghi đè care_group");
  });

  test("SOP hướng dẫn bật is_complaint_active = true, giữ nguyên care_group", () => {
    assert.match(sopDoc, /is_complaint_active/, "SOP phải nhắc is_complaint_active");
    assert.match(sopDoc, /[Gg]iữ nguyên.*care_group|care_group.*[Gg]iữ nguyên/, "SOP phải hướng dẫn giữ nguyên care_group");
  });
});

describe("AC3 (Story 3.2) — SOP doc: đổi nhóm + ghi log 2 bước", () => {
  test("section 'Đổi nhóm khách + ghi log' tồn tại", () => {
    assert.match(sopDoc, /[Đđ]ổi nhóm.*ghi log|ghi log.*đổi nhóm/i, "thiếu section đổi nhóm + ghi log trong SOP");
  });

  test("SOP mô tả 2 bước: đổi nhóm + ghi log", () => {
    assert.match(sopDoc, /[Bb]ước 1/, "SOP phải có Bước 1");
    assert.match(sopDoc, /[Bb]ước 2/, "SOP phải có Bước 2");
  });

  test("Bước 1 dùng view customers-by-group", () => {
    assert.match(sopDoc, /customers-by-group/, "SOP Bước 1 phải nhắc view customers-by-group");
  });

  test("Bước 2 ghi vào bảng CustomerGroupChanges với đủ fields", () => {
    assert.match(sopDoc, /CustomerGroupChanges/, "SOP Bước 2 phải nhắc bảng CustomerGroupChanges");
    assert.match(sopDoc, /changed_at/, "SOP phải nhắc field changed_at");
    assert.match(sopDoc, /customer_id/, "SOP phải nhắc field customer_id");
    assert.match(sopDoc, /pharmacy_id/, "SOP phải nhắc field pharmacy_id");
    assert.match(sopDoc, /from_group/, "SOP phải nhắc field from_group");
    assert.match(sopDoc, /to_group/, "SOP phải nhắc field to_group");
  });
});

// ── Story 5.4: Messages history + EscalationCases list views (AC7, AC8) ──

const messagesHistory = loadView("05-messages-history.json");
const escalationList  = loadView("06-escalation-cases-list.json");

describe("AC7 (Story 5.4) — messages-history grid view", () => {
  test("type=grid, table=Messages, name=messages-history", () => {
    assert.equal(messagesHistory.type, "grid");
    assert.equal(messagesHistory.table, "Messages");
    assert.equal(messagesHistory.name, "messages-history");
  });

  test("sortings: ts DESC (mới nhất lên đầu)", () => {
    assert.ok(Array.isArray(messagesHistory.sortings), "thiếu sortings");
    assert.equal(messagesHistory.sortings[0].field, "ts");
    assert.equal(messagesHistory.sortings[0].order, "DESC");
  });

  test("customer_ref, type, status, case_id, content, ts, pharmacy_id visible", () => {
    const visible = new Set(
      messagesHistory.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    for (const name of ["customer_ref", "type", "status", "case_id", "content", "ts", "pharmacy_id"]) {
      assert.ok(visible.has(name), `${name} phải visible trong messages-history`);
    }
  });

  test("error hidden (chỉ hiện khi debug)", () => {
    const hidden = new Set(
      messagesHistory.fields.filter((f) => f.hidden === true).map((f) => f.name)
    );
    assert.ok(hidden.has("error"), "error phải hidden trong messages-history");
  });

  test("description tồn tại và đề cập AR-7 hoặc audit", () => {
    assert.ok(messagesHistory.description, "messages-history thiếu description");
    assert.match(messagesHistory.description, /AR-7|audit/i, "description phải đề cập AR-7 hoặc audit");
  });
});

describe("AC8 (Story 5.4) — escalation-cases-list grid view", () => {
  test("type=grid, table=EscalationCases, name=escalation-cases-list", () => {
    assert.equal(escalationList.type, "grid");
    assert.equal(escalationList.table, "EscalationCases");
    assert.equal(escalationList.name, "escalation-cases-list");
  });

  test("sortings: created_at DESC (mới nhất lên đầu)", () => {
    assert.ok(Array.isArray(escalationList.sortings), "thiếu sortings");
    assert.equal(escalationList.sortings[0].field, "created_at");
    assert.equal(escalationList.sortings[0].order, "DESC");
  });

  test("case_id, state, trigger, customer_content, pharmacist_reply, created_at, resolved_at visible", () => {
    const visible = new Set(
      escalationList.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    for (const name of ["case_id", "state", "trigger", "customer_content", "pharmacist_reply", "created_at", "resolved_at"]) {
      assert.ok(visible.has(name), `${name} phải visible trong escalation-cases-list`);
    }
  });

  test("pharmacy_id và customer_id hidden (FK refs — không cần hiện trực tiếp)", () => {
    const hidden = new Set(
      escalationList.fields.filter((f) => f.hidden === true).map((f) => f.name)
    );
    assert.ok(hidden.has("pharmacy_id"), "pharmacy_id phải hidden trong escalation-cases-list");
    assert.ok(hidden.has("customer_id"), "customer_id phải hidden trong escalation-cases-list");
  });

  test("description tồn tại", () => {
    assert.ok(escalationList.description, "escalation-cases-list thiếu description");
  });
});
