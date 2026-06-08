import { Zalo, ThreadType, LoginQRCallbackEventType } from "zca-js";
import type { API, Credentials } from "zca-js";
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

export type AuthStatus = "idle" | "qr_ready" | "scanned" | "authenticated" | "failed";

export type TenantAuthState = {
  status: AuthStatus;
  qrImage?: string;
  userName?: string;
  userAvatar?: string;
  error?: string;
};

export type ZaloSendResult = { ok: true } | { ok: false; error: string };

const authStates = new Map<string, TenantAuthState>();
const apiInstances = new Map<string, API>();

const TENANT_BASE = process.env.TENANT_SESSION_BASE ?? "/app/tenants";

function credPath(slug: string): string {
  return path.join(TENANT_BASE, slug, "credentials.json");
}

export async function initFromSavedSession(slug: string): Promise<boolean> {
  try {
    const raw = await readFile(credPath(slug), "utf-8");
    const creds = JSON.parse(raw) as Credentials;
    const zalo = new Zalo();
    const api = await zalo.login(creds);
    apiInstances.set(slug, api);
    authStates.set(slug, { status: "authenticated" });
    console.log(`[session-manager] Restored session: ${slug}`);
    return true;
  } catch {
    return false;
  }
}

export async function initAllSavedSessions(): Promise<void> {
  try {
    const entries = await readdir(TENANT_BASE);
    for (const slug of entries) {
      try {
        await stat(credPath(slug));
        await initFromSavedSession(slug);
      } catch {
        // no credentials.json for this entry
      }
    }
  } catch {
    // TENANT_BASE not yet created
  }
}

export function getApi(slug: string): API | null {
  return apiInstances.get(slug) ?? null;
}

export function getAuthState(slug: string): TenantAuthState {
  return authStates.get(slug) ?? { status: "idle" };
}

export function startQRLogin(slug: string): void {
  const current = authStates.get(slug);
  if (current?.status === "qr_ready" || current?.status === "scanned") return;

  authStates.set(slug, { status: "qr_ready" });

  const zalo = new Zalo();

  zalo
    .loginQR({}, async (event) => {
      switch (event.type) {
        case LoginQRCallbackEventType.QRCodeGenerated:
          authStates.set(slug, {
            status: "qr_ready",
            qrImage: event.data.image,
          });
          break;

        case LoginQRCallbackEventType.QRCodeExpired:
          event.actions.retry();
          break;

        case LoginQRCallbackEventType.QRCodeScanned:
          authStates.set(slug, {
            ...authStates.get(slug),
            status: "scanned",
            userName: event.data.display_name,
            userAvatar: event.data.avatar,
          });
          break;

        case LoginQRCallbackEventType.QRCodeDeclined:
          authStates.set(slug, { status: "idle" });
          break;

        case LoginQRCallbackEventType.GotLoginInfo: {
          const creds: Credentials = {
            imei: event.data.imei,
            cookie: event.data.cookie as Credentials["cookie"],
            userAgent: event.data.userAgent,
          };
          const p = credPath(slug);
          await mkdir(path.dirname(p), { recursive: true });
          await writeFile(p, JSON.stringify(creds, null, 2));
          break;
        }
      }
    })
    .then((api) => {
      apiInstances.set(slug, api);
      const prev = authStates.get(slug);
      authStates.set(slug, { status: "authenticated", userName: prev?.userName });
      console.log(`[session-manager] Authenticated: ${slug}`);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      authStates.set(slug, { status: "failed", error: msg });
      console.error(`[session-manager] Auth failed for ${slug}: ${msg}`);
    });
}

export async function sendZaloMessage(
  slug: string,
  recipientPhone: string,
  content: string
): Promise<ZaloSendResult> {
  const api = apiInstances.get(slug);
  if (!api) return { ok: false, error: "no_session" };

  try {
    const user = await api.findUser(recipientPhone);
    if (!user) return { ok: false, error: "user_not_found" };
    await api.sendMessage({ msg: content }, user.uid, ThreadType.User);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
