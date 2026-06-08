import { baserowFetch } from "./lib/baserow-client.ts";

export type TokenVerifyResult = "ok" | "invalid" | "not_found" | "unavailable";

const PHARMACIES_TABLE_ID = process.env.PHARMACIES_TABLE_ID ?? "";

export async function verifyPharmacyToken(
  slug: string,
  token: string
): Promise<TokenVerifyResult> {
  if (!PHARMACIES_TABLE_ID || !slug || !token) return "unavailable";
  try {
    const res = await baserowFetch(
      `/api/database/rows/table/${PHARMACIES_TABLE_ID}/` +
        `?filter__pharmacy_slug__equal=${encodeURIComponent(slug)}&user_field_names=true`
    );
    if (!res.ok) return "unavailable";
    const data = (await res.json()) as {
      results: Array<{ onboard_token?: string }>;
    };
    const row = data.results[0];
    if (!row) return "not_found";
    if (!row.onboard_token || row.onboard_token !== token) return "invalid";
    return "ok";
  } catch {
    return "unavailable";
  }
}
