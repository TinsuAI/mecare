// Story 2.1: Opt-in gate — fail-closed; only friend_status="friended" passes.

export type OptInResult =
  | { blocked: true; reason: "opt_in_required"; friend_status: string }
  | { blocked: true; reason: "customer_not_found" }
  | { blocked: true; reason: "lookup_error"; error: string }
  | { blocked: false };

function resolveFriendStatus(raw: unknown): string {
  if (!raw) return "none";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && "value" in (raw as object)) {
    return String((raw as { value: unknown }).value);
  }
  return "none";
}

export async function checkOptIn(
  pharmacyId: string,
  customerPhone: string
): Promise<OptInResult> {
  const baserowUrl = (process.env.BASEROW_URL ?? "http://baserow:80").replace(/\/$/, "");
  const token = process.env.BASEROW_TOKEN ?? "";
  const tableId = process.env.CUSTOMERS_TABLE_ID ?? "";

  let rows: Array<Record<string, unknown>>;
  try {
    const url =
      `${baserowUrl}/api/database/rows/table/${tableId}/` +
      `?filter__phone__equal=${encodeURIComponent(customerPhone)}&user_field_names=true`;
    const resp = await fetch(url, { headers: { Authorization: `Token ${token}` } });
    if (!resp.ok) throw new Error(`Baserow HTTP ${resp.status}`);
    const data = (await resp.json()) as { results: typeof rows };
    rows = data.results;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(
      `[opt-in-gate] ERROR pharmacy_id=${pharmacyId} customer_phone=${customerPhone} error=${msg}`
    );
    return { blocked: true, reason: "lookup_error", error: msg };
  }

  if (rows.length === 0) {
    console.log(
      `[opt-in-gate] BLOCKED pharmacy_id=${pharmacyId} customer_phone=${customerPhone} reason=customer_not_found`
    );
    return { blocked: true, reason: "customer_not_found" };
  }

  const friendStatus = resolveFriendStatus(rows[0].friend_status);
  if (friendStatus !== "friended") {
    console.log(
      `[opt-in-gate] BLOCKED pharmacy_id=${pharmacyId} customer_phone=${customerPhone} friend_status=${friendStatus}`
    );
    return { blocked: true, reason: "opt_in_required", friend_status: friendStatus };
  }

  console.log(
    `[opt-in-gate] ALLOWED pharmacy_id=${pharmacyId} customer_phone=${customerPhone} friend_status=friended`
  );
  return { blocked: false };
}
