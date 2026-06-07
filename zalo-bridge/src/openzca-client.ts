export type OpenzcaResult = { ok: true } | { ok: false; error: string };

export async function sendViaOpenzca(
  pharmacyId: string,
  customerPhone: string,
  content: string
): Promise<OpenzcaResult> {
  const openzcaUrl = process.env.OPENZCA_URL ?? "";
  if (!openzcaUrl) {
    console.warn("[openzca-client] OPENZCA_URL not set — stub mode, ok: true");
    return { ok: true };
  }
  try {
    const resp = await fetch(`${openzcaUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pharmacy_id: pharmacyId, recipient: customerPhone, content }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      return { ok: false, error: `HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
