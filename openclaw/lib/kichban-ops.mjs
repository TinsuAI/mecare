// kichban-ops.mjs — logic thuần (zero-dep, ESM) cho Story 1.4:
//   - upsert seed nội dung (insert mới + update hàng đã tồn tại theo key, KHÔNG nhân đôi)
//   - duyệt draft → approved có dấu vết, idempotent (không reset approved_at đã có)
//
// Tách khỏi I/O để test offline bằng fake store (pattern Story 1.3 case-allocator).
// Store interface (bất đồng bộ):
//   store.list()            -> Promise<rows[]>   // mỗi row có .id + field nội dung
//   store.create(row)       -> Promise<row>      // tạo hàng mới
//   store.update(id, patch) -> Promise<row>      // PATCH field theo user_field_names

// Field trạng thái duyệt — KHÔNG bị ghi đè khi upsert nội dung (tránh hạ approved→draft).
export const STATUS_FIELDS = ["status", "approved_at", "approved_by"];

// So khớp 1 hàng seed với 1 hàng store theo bộ key (so sánh dạng chuỗi cho ổn định kiểu số/text).
export function matchKey(seedRow, storeRow, keyFields) {
  if (!Array.isArray(keyFields) || keyFields.length === 0) throw new Error("keyFields bắt buộc");
  return keyFields.every((k) => String(seedRow[k]) === String(storeRow[k]));
}

// Tạo patch nội dung từ 1 hàng seed: bỏ các field trạng thái duyệt.
export function buildUpsertPatch(seedRow, { statusFields = STATUS_FIELDS } = {}) {
  const skip = new Set(statusFields);
  const patch = {};
  for (const [k, v] of Object.entries(seedRow)) {
    if (skip.has(k)) continue;
    patch[k] = v;
  }
  return patch;
}

// Upsert toàn bộ seed.rows lên store.
//   update=false (mặc định): insert-only, skip key trùng (hành vi seed cũ Story 1.2).
//   update=true: insert mới + PATCH nội dung hàng đã tồn tại; KHÔNG đụng STATUS_FIELDS.
// Idempotent: chạy lại không nhân đôi hàng (dedup theo key).
export async function upsertSeed({ store, seedRows, keyFields, update = false, decorate = null }) {
  if (!store || typeof store.list !== "function" || typeof store.create !== "function") {
    throw new Error("store cần list()/create()");
  }
  if (update && typeof store.update !== "function") throw new Error("store cần update() khi update=true");
  if (!Array.isArray(seedRows)) throw new Error("seedRows bắt buộc là mảng");

  const existing = await store.list();
  let inserted = 0, updated = 0, skipped = 0;
  for (const row of seedRows) {
    const dup = existing.find((r) => matchKey(row, r, keyFields));
    if (dup) {
      if (update) {
        const patch = buildUpsertPatch(row);
        if (Object.keys(patch).length) {
          await store.update(dup.id, patch);
          updated++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
      continue;
    }
    const payload = decorate ? decorate({ ...row }) : { ...row };
    const created = await store.create(payload);
    // Đẩy hàng vừa tạo vào snapshot để 2 row cùng key trong CÙNG batch không nhân đôi.
    existing.push(created && typeof created === "object" ? created : payload);
    inserted++;
  }
  return { inserted, updated, skipped };
}

// Patch duyệt: bắt buộc approvedBy + now (ISO). Caller cấp `now` (không gọi Date trong logic thuần).
export function buildApprovePatch({ approvedBy, now }) {
  if (!approvedBy) throw new Error("approvedBy bắt buộc");
  if (!now) throw new Error("now (ISO timestamp) bắt buộc");
  return { status: "approved", approved_at: now, approved_by: approvedBy };
}

// Hàng có thuộc tenant pharmacyId không (link_row Baserow trả mảng {id} hoặc id thô).
export function belongsToTenant(row, pharmacyId) {
  if (pharmacyId === null || pharmacyId === undefined) return true;
  const link = row.pharmacy_id;
  const ids = Array.isArray(link)
    ? link.map((x) => (x && typeof x === "object" ? x.id : x))
    : link != null ? [link] : [];
  return ids.map(String).includes(String(pharmacyId));
}

// Duyệt mọi record đang draft của tenant → approved + dấu vết.
// Idempotent: record đã approved bị bỏ qua, KHÔNG reset approved_at; record khác tenant bỏ qua.
export async function approveDrafts({ store, approvedBy, now, pharmacyId = null }) {
  if (!store || typeof store.list !== "function" || typeof store.update !== "function") {
    throw new Error("store cần list()/update()");
  }
  const patchBase = buildApprovePatch({ approvedBy, now }); // ném sớm nếu thiếu arg
  const rows = await store.list();
  let approved = 0, alreadyApproved = 0, otherTenant = 0;
  for (const r of rows) {
    if (!belongsToTenant(r, pharmacyId)) { otherTenant++; continue; }
    if (r.status === "approved") { alreadyApproved++; continue; }
    await store.update(r.id, { ...patchBase });
    approved++;
  }
  return { approved, alreadyApproved, otherTenant };
}
