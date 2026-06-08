// Contract — Baserow view definitions (Story 3.1). Offline, no Baserow live.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { repoPath } from "../helpers/server.js";

const VIEWS_DIR   = repoPath("baserow/views");
const SCHEMAS_DIR = repoPath("baserow/schema");

function loadView(filename) {
  return JSON.parse(fs.readFileSync(path.join(VIEWS_DIR, filename), "utf8"));
}

function loadSchema(filename) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, filename), "utf8"));
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

// ── Story 6.1: Customer profile & group filter views (AC1/AC5/AC6/AC7/AC8) ──

const customersGallery   = loadView("02-customers-gallery.json");
const messagesLookup     = loadView("05-customer-messages-lookup.json");

describe("AC1/AC7 (Story 6.1) — customers-by-group updated", () => {
  test("15.1: is_opted_out có trong fields với hidden: false", () => {
    const field = customersByGroup.fields.find((f) => f.name === "is_opted_out");
    assert.ok(field, "is_opted_out thiếu trong customers-by-group");
    assert.equal(field.hidden, false, "is_opted_out phải visible");
  });

  test("15.2: group6_unlocked có trong fields với hidden: false", () => {
    const field = customersByGroup.fields.find((f) => f.name === "group6_unlocked");
    assert.ok(field, "group6_unlocked thiếu trong customers-by-group");
    assert.equal(field.hidden, false, "group6_unlocked phải visible");
  });

  test("15.3: tổng visible field count ≥ 9", () => {
    const required = ["full_name", "phone", "care_group", "is_complaint_active", "is_opted_out", "group6_unlocked", "friend_status", "notes", "pharmacy_id"];
    const visible = new Set(
      customersByGroup.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    for (const name of required) {
      assert.ok(visible.has(name), `${name} phải visible trong customers-by-group`);
    }
    assert.ok(visible.size >= 9, `visible field count ${visible.size} < 9`);
  });
});

describe("AC6 (Story 6.1) — customers-gallery view", () => {
  test("15.4: type=gallery, table=Customers, name=customers-gallery", () => {
    assert.equal(customersGallery.type, "gallery");
    assert.equal(customersGallery.table, "Customers");
    assert.equal(customersGallery.name, "customers-gallery");
  });

  test("15.5: full_name, care_group, phone, is_complaint_active, is_opted_out, friend_status visible", () => {
    const visible = new Set(
      customersGallery.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    for (const name of ["full_name", "care_group", "phone", "is_complaint_active", "is_opted_out", "friend_status"]) {
      assert.ok(visible.has(name), `${name} phải visible trong customers-gallery`);
    }
  });

  test("15.6: description tồn tại và đề cập pharmacy_id filter", () => {
    assert.ok(customersGallery.description, "customers-gallery thiếu description");
    assert.match(customersGallery.description, /pharmacy_id/, "description phải đề cập pharmacy_id filter");
  });
});

describe("AC5 (Story 6.1) — customer-messages-lookup view", () => {
  test("15.7: type=grid, table=Messages, name=customer-messages-lookup", () => {
    assert.equal(messagesLookup.type, "grid");
    assert.equal(messagesLookup.table, "Messages");
    assert.equal(messagesLookup.name, "customer-messages-lookup");
  });

  test("15.8: sort ts DESC; customer_ref, type, status, case_id, content, ts, pharmacy_id visible; message_id và error hidden", () => {
    const tsSort = messagesLookup.sortings.find((s) => s.field === "ts");
    assert.ok(tsSort, "sortings phải có entry cho field ts");
    assert.equal(tsSort.order, "DESC", "ts phải sort DESC");

    const visible = new Set(
      messagesLookup.fields.filter((f) => f.hidden === false).map((f) => f.name)
    );
    for (const name of ["customer_ref", "type", "status", "case_id", "content", "ts", "pharmacy_id"]) {
      assert.ok(visible.has(name), `${name} phải visible trong customer-messages-lookup`);
    }

    const hidden = new Set(
      messagesLookup.fields.filter((f) => f.hidden === true).map((f) => f.name)
    );
    assert.ok(hidden.has("message_id"), "message_id phải hidden");
    assert.ok(hidden.has("error"), "error phải hidden");
  });
});

// ── Story 6.1 gap-fill: AC1/AC2/AC3/AC4/AC5/AC6 supplemental ──

const purchasesSchema    = loadSchema("03-medications.json");
const careScheduleSchema = loadSchema("04-care-schedule.json");

describe("AC1 gap (Story 6.1) — customers-by-group sort order", () => {
  test("15.9: sortings = care_group ASC then full_name ASC", () => {
    assert.ok(Array.isArray(customersByGroup.sortings), "sortings phải là array");
    const careGroupSort = customersByGroup.sortings.find((s) => s.field === "care_group");
    assert.ok(careGroupSort, "sortings phải có entry care_group");
    assert.equal(careGroupSort.order, "ASC", "care_group phải sort ASC");
    const fullNameSort = customersByGroup.sortings.find((s) => s.field === "full_name");
    assert.ok(fullNameSort, "sortings phải có entry full_name");
    assert.equal(fullNameSort.order, "ASC", "full_name phải sort ASC");
  });
});

describe("AC2 gap (Story 6.1) — customers-by-group tenant isolation", () => {
  test("15.10: description tồn tại và đề cập pharmacy_id isolation", () => {
    assert.ok(customersByGroup.description, "customers-by-group thiếu description");
    assert.match(customersByGroup.description, /pharmacy_id/, "description phải đề cập pharmacy_id");
  });
});

describe("AC5 gap (Story 6.1) — customer-messages-lookup pharmacy_id sort", () => {
  test("15.11: sortings có pharmacy_id ASC (tenant grouping)", () => {
    const pidSort = messagesLookup.sortings.find((s) => s.field === "pharmacy_id");
    assert.ok(pidSort, "sortings phải có entry pharmacy_id");
    assert.equal(pidSort.order, "ASC", "pharmacy_id phải sort ASC để nhóm theo tenant");
  });
});

describe("AC6 gap (Story 6.1) — customers-gallery sort order", () => {
  test("15.12: sortings = care_group ASC then full_name ASC", () => {
    assert.ok(Array.isArray(customersGallery.sortings), "sortings phải là array");
    const careGroupSort = customersGallery.sortings.find((s) => s.field === "care_group");
    assert.ok(careGroupSort, "sortings phải có entry care_group");
    assert.equal(careGroupSort.order, "ASC", "care_group phải sort ASC");
    const fullNameSort = customersGallery.sortings.find((s) => s.field === "full_name");
    assert.ok(fullNameSort, "sortings phải có entry full_name");
    assert.equal(fullNameSort.order, "ASC", "full_name phải sort ASC");
  });
});

describe("AC3 gap (Story 6.1) — Purchases back-reference schema", () => {
  test("15.13: Purchases.customer_id là link_row → Customers", () => {
    const field = purchasesSchema.fields.find((f) => f.name === "customer_id");
    assert.ok(field, "03-medications.json phải có field customer_id");
    assert.equal(field.type, "link_row", "customer_id phải type=link_row");
    assert.equal(field.link_table, "Customers", "customer_id phải link tới Customers table");
  });
});

describe("AC4 gap (Story 6.1) — CareSchedule back-reference schema", () => {
  test("15.14: CareSchedule.customer_id là link_row → Customers", () => {
    const field = careScheduleSchema.fields.find((f) => f.name === "customer_id");
    assert.ok(field, "04-care-schedule.json phải có field customer_id");
    assert.equal(field.type, "link_row", "customer_id phải type=link_row");
    assert.equal(field.link_table, "Customers", "customer_id phải link tới Customers table");
  });
});

// ── Story 6.2: Dashboard chỉ số cơ bản — quota-counter-dashboard view ──

const quotaCounterDashboard = loadView("07-quota-counter-dashboard.json");

// ── Story 6.3: Quản lý & tự duyệt kịch bản — edit views ──

const messageTemplatesEdit = loadView("08-message-templates-edit.json");
const faqEntriesEdit = loadView("09-faq-entries-edit.json");

describe("AC1 (Story 6.2) — quota-counter-dashboard file exists", () => {
  test("16.1: loadView trả về object hợp lệ", () => {
    assert.ok(quotaCounterDashboard && typeof quotaCounterDashboard === "object",
      "07-quota-counter-dashboard.json phải tồn tại và parse được");
  });
});

describe("AC2 (Story 6.2) — quota-counter-dashboard type và table", () => {
  test("16.2: type = grid", () => {
    assert.equal(quotaCounterDashboard.type, "grid", "type phải là grid");
  });
  test("16.3: table = QuotaCounter", () => {
    assert.equal(quotaCounterDashboard.table, "QuotaCounter", "table phải là QuotaCounter");
  });
});

describe("AC3 (Story 6.2) — quota-counter-dashboard visible fields", () => {
  test("16.4: period_month visible", () => {
    const f = quotaCounterDashboard.fields.find((x) => x.name === "period_month");
    assert.ok(f, "fields phải có period_month");
    assert.equal(f.hidden, false, "period_month phải visible");
  });
  test("16.5: sent_count visible", () => {
    const f = quotaCounterDashboard.fields.find((x) => x.name === "sent_count");
    assert.ok(f, "fields phải có sent_count");
    assert.equal(f.hidden, false, "sent_count phải visible");
  });
  test("16.6: cap visible", () => {
    const f = quotaCounterDashboard.fields.find((x) => x.name === "cap");
    assert.ok(f, "fields phải có cap");
    assert.equal(f.hidden, false, "cap phải visible");
  });
});

describe("AC4 (Story 6.2) — quota-counter-dashboard tenant isolation", () => {
  test("16.7: pharmacy_id hidden", () => {
    const f = quotaCounterDashboard.fields.find((x) => x.name === "pharmacy_id");
    assert.ok(f, "fields phải có pharmacy_id");
    assert.equal(f.hidden, true, "pharmacy_id phải hidden (tenant isolation)");
  });
});

describe("AC1 sort (Story 6.2) — quota-counter-dashboard sort period_month DESC", () => {
  test("16.8: sortings có period_month DESC", () => {
    assert.ok(Array.isArray(quotaCounterDashboard.sortings), "sortings phải là array");
    const s = quotaCounterDashboard.sortings.find((x) => x.field === "period_month");
    assert.ok(s, "sortings phải có entry period_month");
    assert.equal(s.order, "DESC", "period_month phải sort DESC (mới nhất lên đầu)");
  });
});

describe("AC1 name (Story 6.2) — quota-counter-dashboard view name", () => {
  test("16.9: name = quota-counter-dashboard", () => {
    assert.equal(quotaCounterDashboard.name, "quota-counter-dashboard",
      "view name phải là quota-counter-dashboard");
  });
});

describe("AC4 description (Story 6.2) — quota-counter-dashboard tenant isolation documented", () => {
  test("16.10: description mention pharmacy_id và runbook (tenant isolation contract)", () => {
    assert.ok(quotaCounterDashboard.description, "07-quota-counter-dashboard.json thiếu description");
    assert.match(quotaCounterDashboard.description, /pharmacy_id/i,
      "description phải nhắc pharmacy_id để document tenant isolation");
    assert.match(quotaCounterDashboard.description, /runbook/i,
      "description phải nhắc runbook (onboarding step để set filter per-tenant)");
  });
});

describe("AC1 (Story 6.3) — message-templates-edit file exists", () => {
  test("17.1: loadView trả về object hợp lệ", () => {
    assert.ok(messageTemplatesEdit && typeof messageTemplatesEdit === "object",
      "08-message-templates-edit.json phải tồn tại và parse được");
  });
});

describe("AC1 (Story 6.3) — message-templates-edit type và table", () => {
  test("17.2: type = grid", () => {
    assert.equal(messageTemplatesEdit.type, "grid", "type phải là grid");
  });
  test("17.3: table = MessageTemplates", () => {
    assert.equal(messageTemplatesEdit.table, "MessageTemplates", "table phải là MessageTemplates");
  });
});

describe("AC2 (Story 6.3) — message-templates-edit visible fields", () => {
  test("17.4: care_group visible", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "care_group");
    assert.ok(f, "fields phải có care_group");
    assert.equal(f.hidden, false, "care_group phải visible");
  });
  test("17.5: body_template visible", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "body_template");
    assert.ok(f, "fields phải có body_template");
    assert.equal(f.hidden, false, "body_template phải visible");
  });
  test("17.6: status visible", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "status");
    assert.ok(f, "fields phải có status");
    assert.equal(f.hidden, false, "status phải visible");
  });
});

describe("AC2 (Story 6.3) — message-templates-edit hidden system fields", () => {
  test("17.7: pharmacy_id hidden", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "pharmacy_id");
    assert.ok(f, "fields phải có pharmacy_id");
    assert.equal(f.hidden, true, "pharmacy_id phải hidden (tenant isolation)");
  });
  test("17.8: version hidden", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "version");
    assert.ok(f, "fields phải có version");
    assert.equal(f.hidden, true, "version phải hidden (system field)");
  });
  test("17.9: updated_by hidden", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "updated_by");
    assert.ok(f, "fields phải có updated_by");
    assert.equal(f.hidden, true, "updated_by phải hidden (system field)");
  });
  test("17.10: approved_at hidden", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "approved_at");
    assert.ok(f, "fields phải có approved_at");
    assert.equal(f.hidden, true, "approved_at phải hidden (system field)");
  });
});

describe("AC3 (Story 6.3) — faq-entries-edit file exists", () => {
  test("17.11: loadView trả về object hợp lệ", () => {
    assert.ok(faqEntriesEdit && typeof faqEntriesEdit === "object",
      "09-faq-entries-edit.json phải tồn tại và parse được");
  });
});

describe("AC3 (Story 6.3) — faq-entries-edit type và table", () => {
  test("17.12: type = grid", () => {
    assert.equal(faqEntriesEdit.type, "grid", "type phải là grid");
  });
  test("17.13: table = FaqEntries", () => {
    assert.equal(faqEntriesEdit.table, "FaqEntries", "table phải là FaqEntries");
  });
});

describe("AC4 (Story 6.3) — faq-entries-edit visible fields", () => {
  test("17.14: scope visible", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "scope");
    assert.ok(f, "fields phải có scope");
    assert.equal(f.hidden, false, "scope phải visible");
  });
  test("17.15: question visible", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "question");
    assert.ok(f, "fields phải có question");
    assert.equal(f.hidden, false, "question phải visible");
  });
  test("17.16: answer visible", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "answer");
    assert.ok(f, "fields phải có answer");
    assert.equal(f.hidden, false, "answer phải visible");
  });
  test("17.17: status visible", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "status");
    assert.ok(f, "fields phải có status");
    assert.equal(f.hidden, false, "status phải visible");
  });
});

describe("AC4 (Story 6.3) — faq-entries-edit hidden system fields", () => {
  test("17.18: pharmacy_id hidden", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "pharmacy_id");
    assert.ok(f, "fields phải có pharmacy_id");
    assert.equal(f.hidden, true, "pharmacy_id phải hidden (tenant isolation)");
  });
  test("17.19: version hidden", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "version");
    assert.ok(f, "fields phải có version");
    assert.equal(f.hidden, true, "version phải hidden (system field)");
  });
});

describe("AC2 (Story 6.3) — message-templates-edit additional hidden system fields", () => {
  test("17.20: scenario_id hidden", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "scenario_id");
    assert.ok(f, "fields phải có scenario_id");
    assert.equal(f.hidden, true, "scenario_id phải hidden (system key)");
  });
  test("17.21: approved_by hidden", () => {
    const f = messageTemplatesEdit.fields.find((x) => x.name === "approved_by");
    assert.ok(f, "fields phải có approved_by");
    assert.equal(f.hidden, true, "approved_by phải hidden (system field)");
  });
});

describe("AC4 (Story 6.3) — faq-entries-edit mandatory_suffix visible", () => {
  test("17.22: mandatory_suffix visible", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "mandatory_suffix");
    assert.ok(f, "fields phải có mandatory_suffix");
    assert.equal(f.hidden, false, "mandatory_suffix phải visible");
  });
});

describe("AC4 (Story 6.3) — faq-entries-edit additional hidden system fields", () => {
  test("17.23: updated_by hidden", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "updated_by");
    assert.ok(f, "fields phải có updated_by");
    assert.equal(f.hidden, true, "updated_by phải hidden (system field)");
  });
  test("17.24: approved_at hidden", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "approved_at");
    assert.ok(f, "fields phải có approved_at");
    assert.equal(f.hidden, true, "approved_at phải hidden (system field)");
  });
  test("17.25: approved_by hidden", () => {
    const f = faqEntriesEdit.fields.find((x) => x.name === "approved_by");
    assert.ok(f, "fields phải có approved_by");
    assert.equal(f.hidden, true, "approved_by phải hidden (system field)");
  });
});

describe("AC5 (Story 6.3) — tenant isolation documented in descriptions", () => {
  test("17.26: 08-message-templates-edit description có tenant isolation note", () => {
    assert.ok(
      typeof messageTemplatesEdit.description === "string" &&
        messageTemplatesEdit.description.includes("Filter by pharmacy_id per tenant qua onboarding runbook"),
      "description phải ghi rõ tenant isolation runbook"
    );
  });
  test("17.27: 09-faq-entries-edit description có tenant isolation note", () => {
    assert.ok(
      typeof faqEntriesEdit.description === "string" &&
        faqEntriesEdit.description.includes("Filter by pharmacy_id per tenant qua onboarding runbook"),
      "description phải ghi rõ tenant isolation runbook"
    );
  });
});

describe("AC6 (Story 6.3) — R2 warning + draft→approved documented in 08 description", () => {
  test("17.28: description có R2 warning", () => {
    assert.ok(
      typeof messageTemplatesEdit.description === "string" &&
        messageTemplatesEdit.description.includes("R2"),
      "description phải có cảnh báo R2 (chủ chịu trách nhiệm nội dung y tế)"
    );
  });
  test("17.29: description có draft→approved workflow", () => {
    assert.ok(
      typeof messageTemplatesEdit.description === "string" &&
        messageTemplatesEdit.description.toLowerCase().includes("draft") &&
        messageTemplatesEdit.description.toLowerCase().includes("approved"),
      "description phải document workflow draft→approved"
    );
  });
});
