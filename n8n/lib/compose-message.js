import crypto from "node:crypto";

// Scan [FIELD] tokens; return names missing from map or empty.
export function detectMissingPlaceholders(bodyTemplate, placeholderMap) {
  const seen = [];
  const re = /\[([^\]]+)\]/g;
  let match;
  while ((match = re.exec(bodyTemplate)) !== null) {
    const key = match[1];
    if (!seen.includes(key)) seen.push(key);
  }
  return seen.filter((key) => !placeholderMap[key]);
}

// Replace [FIELD] patterns from placeholderMap.
// Returns {ok: true, content} or {ok: false, missing: [...fieldNames]}.
export function substituteTemplate(bodyTemplate, placeholderMap) {
  const missing = detectMissingPlaceholders(bodyTemplate, placeholderMap);
  if (missing.length > 0) return { ok: false, missing };
  const content = bodyTemplate.replace(/\[([^\]]+)\]/g, (_, key) => placeholderMap[key] ?? "");
  return { ok: true, content };
}

// Append TPCN mandatory disclaimer for care_group 4 only.
export function appendTpcnSuffix(content, careGroup) {
  if (careGroup === 4) {
    return content + "\n\nLưu ý: thực phẩm bảo vệ sức khỏe, không phải thuốc điều trị bệnh.";
  }
  return content;
}

// SHA-256 hash of "pharmacyId:customerId" — PII-min, no name/phone in Messages.
export function buildCustomerRef(pharmacyId, customerId) {
  return crypto.createHash("sha256").update(pharmacyId + ":" + customerId).digest("hex");
}
