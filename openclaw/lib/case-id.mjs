// Mã ca (correlation key / idempotency key) — module thuần, ESM zero-dep (Story 1.3).
// Format cố định: ESC-<pharmacy_slug>-<YYYYMMDD>-<seq>
//   ESC            = prefix literal hằng
//   pharmacy_slug  = ^[a-z0-9]+$  (KHÔNG '-' để parse không nhập nhằng)
//   YYYYMMDD       = ngày làm việc giờ VN (Asia/Ho_Chi_Minh, UTC+7) — xem vnDateStamp
//   seq            = integer ≥ 1, zero-pad tối thiểu 4 chữ số (0001), KHÔNG cắt khi > 9999
//
// Pure: KHÔNG I/O, KHÔNG gọi Date.now() ẩn. Thời điểm truyền qua tham số → test deterministic.
// [Source: architecture.md#Naming-Patterns ; story 1.3 Dev Notes]

const PREFIX = "ESC";
export const SLUG_RE = /^[a-z0-9]+$/;
const SEQ_MIN_PAD = 4;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, không DST → offset tường minh.

// ── Build ────────────────────────────────────────────────────────────────────
export function buildCaseId({ slug, date, seq }) {
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
    throw new Error(`buildCaseId: slug không hợp lệ (cần ^[a-z0-9]+$): ${JSON.stringify(slug)}`);
  }
  if (typeof date !== "string" || !/^\d{8}$/.test(date)) {
    throw new Error(`buildCaseId: date phải là 8 chữ số YYYYMMDD: ${JSON.stringify(date)}`);
  }
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`buildCaseId: seq phải là integer ≥ 1: ${JSON.stringify(seq)}`);
  }
  const seqStr = String(seq).padStart(SEQ_MIN_PAD, "0"); // pad ≥4, không cắt khi >9999
  return `${PREFIX}-${slug}-${date}-${seqStr}`;
}

// ── Parse (defensive, anchor cố định) ─────────────────────────────────────────
// Anchor: prefix ESC, date = đúng 8 chữ số, seq = integer đuôi; slug = phần giữa ^[a-z0-9]+$.
export function parseCaseId(caseId) {
  if (typeof caseId !== "string") {
    throw new Error(`parseCaseId: caseId phải là string: ${JSON.stringify(caseId)}`);
  }
  const m = /^ESC-([a-z0-9]+)-(\d{8})-(\d+)$/.exec(caseId);
  if (!m) {
    throw new Error(`parseCaseId: sai format ESC-<slug>-<YYYYMMDD>-<seq>: ${JSON.stringify(caseId)}`);
  }
  const [, slug, date, seqStr] = m;
  const seq = Number(seqStr);
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`parseCaseId: seq không hợp lệ: ${JSON.stringify(caseId)}`);
  }
  return { slug, date, seq };
}

// ── Validate ──────────────────────────────────────────────────────────────────
export function isValidCaseId(caseId) {
  try {
    parseCaseId(caseId);
    return true;
  } catch {
    return false;
  }
}

// ── vnDateStamp — quy đổi thời điểm sang ngày local VN (UTC+7), trả 'YYYYMMDD' ──
// Nhận ISO string | Date | epoch ms. KHÔNG dùng Date.now() ngầm.
// Tính tường minh: cộng offset +7h vào epoch UTC rồi đọc thành phần ngày theo UTC.
export function vnDateStamp(isoOrDate) {
  let ms;
  if (isoOrDate instanceof Date) {
    ms = isoOrDate.getTime();
  } else if (typeof isoOrDate === "number") {
    ms = isoOrDate;
  } else if (typeof isoOrDate === "string") {
    ms = new Date(isoOrDate).getTime();
  } else {
    throw new Error(`vnDateStamp: cần ISO string | Date | epoch ms: ${JSON.stringify(isoOrDate)}`);
  }
  if (!Number.isFinite(ms)) {
    throw new Error(`vnDateStamp: thời điểm không hợp lệ: ${JSON.stringify(isoOrDate)}`);
  }
  const vn = new Date(ms + VN_OFFSET_MS); // dịch sang VN; đọc UTC-components = ngày VN
  const y = vn.getUTCFullYear();
  const mo = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const d = String(vn.getUTCDate()).padStart(2, "0");
  return `${y}${mo}${d}`;
}

// Prefix dùng để lọc query Baserow theo (slug, ngày): "ESC-<slug>-<YYYYMMDD>-"
export function caseIdPrefix(slug, date) {
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
    throw new Error(`caseIdPrefix: slug không hợp lệ: ${JSON.stringify(slug)}`);
  }
  if (typeof date !== "string" || !/^\d{8}$/.test(date)) {
    throw new Error(`caseIdPrefix: date phải 8 chữ số: ${JSON.stringify(date)}`);
  }
  return `${PREFIX}-${slug}-${date}-`;
}
