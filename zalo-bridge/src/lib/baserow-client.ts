// Thin HTTP client for Baserow internal Docker calls.
// Two paths:
//   Test: globalThis.fetch is mocked by test suite → use it (supports .ok/.json() shape).
//   Prod: globalThis.fetch ignores Host header (Fetch spec) → use node:http directly so
//         Caddy inside the Baserow all-in-one container accepts the request (it only responds
//         to Host: mecareapp.tinsu.ai matching BASEROW_PUBLIC_URL).
import http from "node:http";

const BASEROW_URL = (process.env.BASEROW_URL ?? "http://baserow:80").replace(/\/$/, "");
export const BASEROW_TOKEN = process.env.BASEROW_TOKEN ?? "";

const nativeFetch = globalThis.fetch;

function hostHeader(): string {
  const pub = process.env.BASEROW_PUBLIC_URL ?? "";
  if (!pub) return "";
  try {
    return new URL(pub).hostname;
  } catch {
    return "";
  }
}

export type BaserowResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type FetchInit = { method?: string; body?: string; headers?: Record<string, string>; signal?: AbortSignal };

function nodeHttpFetch(path: string, init?: FetchInit): Promise<BaserowResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(`${BASEROW_URL}${path}`);
    const host = hostHeader() || parsed.hostname;
    const headers: Record<string, string> = {
      Authorization: `Token ${BASEROW_TOKEN}`,
      Host: host,
      ...(init?.headers ?? {}),
    };
    if (init?.body) headers["Content-Type"] ??= "application/json";

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 80,
        path: parsed.pathname + parsed.search,
        method: init?.method ?? "GET",
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          const status = res.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: () => {
              try {
                return Promise.resolve(JSON.parse(raw));
              } catch {
                return Promise.reject(new Error(`invalid JSON: ${raw.slice(0, 80)}`));
              }
            },
          });
        });
      }
    );
    req.on("error", reject);
    init?.signal?.addEventListener("abort", () => req.destroy());
    if (init?.body) req.write(init.body);
    req.end();
  });
}

export async function baserowFetch(path: string, init?: FetchInit): Promise<BaserowResponse> {
  const url = `${BASEROW_URL}${path}`;
  // When tests replace globalThis.fetch with a mock, use the mock.
  if (globalThis.fetch !== nativeFetch) {
    const authHeaders = { Authorization: `Token ${BASEROW_TOKEN}`, ...(init?.headers ?? {}) };
    const res = await globalThis.fetch(url, { ...init, headers: authHeaders } as RequestInit);
    return { ok: res.ok, status: res.status, json: () => res.json() };
  }
  return nodeHttpFetch(path, init);
}
