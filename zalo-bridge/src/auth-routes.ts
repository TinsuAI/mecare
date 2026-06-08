import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuthState, startQRLogin } from "./zalo-session-manager.ts";
import { verifyPharmacyToken } from "./pharmacy-client.ts";

function getQueryParam(rawUrl: string, name: string): string {
  try {
    const u = new URL(rawUrl, "http://x");
    return u.searchParams.get(name) ?? "";
  } catch {
    return "";
  }
}

function getBearerToken(req: IncomingMessage): string {
  const auth = req.headers["authorization"] ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

const ONBOARD_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MeCare — Kết nối Zalo</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f0faf5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 40px;
      width: 100%;
      max-width: 440px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #059669;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 32px;
    }
    h2 { font-size: 20px; color: #111827; margin-bottom: 8px; }
    .hint { color: #6b7280; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    input[type="text"] {
      width: 100%;
      padding: 12px 16px;
      border: 1.5px solid #d1fae5;
      border-radius: 8px;
      font-size: 16px;
      outline: none;
      margin-bottom: 16px;
      transition: border-color .2s;
      background: #f9fafb;
      color: #374151;
    }
    input[type="text"]:read-only { cursor: default; }
    button {
      width: 100%;
      padding: 14px;
      background: #059669;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s;
    }
    button:hover { background: #047857; }
    button:disabled { background: #a7f3d0; cursor: not-allowed; }
    .qr-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    #qr-img {
      width: 220px;
      height: 220px;
      border-radius: 12px;
      border: 2px solid #d1fae5;
      object-fit: contain;
      background: #f0faf5;
    }
    .qr-placeholder {
      width: 220px;
      height: 220px;
      border-radius: 12px;
      border: 2px dashed #a7f3d0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 14px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
    }
    .status-badge.waiting { background: #f3f4f6; color: #6b7280; }
    .status-badge.scanned { background: #fef3c7; color: #92400e; }
    .status-badge.success-badge { background: #d1fae5; color: #065f46; }
    .status-badge.error { background: #fee2e2; color: #991b1b; }
    .pulse { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .step { display: none; }
    .step.active { display: block; }
    .success-icon { font-size: 64px; margin-bottom: 16px; }
    .steps-indicator {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 28px;
    }
    .dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #d1fae5;
      transition: background .3s;
    }
    .dot.active { background: #059669; }
    .instruction-list {
      text-align: left;
      background: #f0faf5;
      border-radius: 10px;
      padding: 16px 20px;
      margin-top: 4px;
    }
    .instruction-list li {
      color: #374151;
      font-size: 14px;
      line-height: 1.6;
      margin-left: 16px;
    }
    .expire-note { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    #retry-btn {
      width: auto;
      padding: 8px 20px;
      font-size: 14px;
      background: transparent;
      border: 1.5px solid #059669;
      color: #059669;
      margin-top: 8px;
    }
    #retry-btn:hover { background: #f0faf5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">💊 MeCare</div>
    <div class="subtitle">Hệ thống chăm sóc khách hàng tự động</div>

    <div class="steps-indicator">
      <div class="dot active" id="dot-1"></div>
      <div class="dot" id="dot-2"></div>
      <div class="dot" id="dot-3"></div>
    </div>

    <!-- Step 1: Confirm pharmacy slug -->
    <div class="step active" id="step-1">
      <h2>Kết nối Zalo nhà thuốc</h2>
      <p class="hint">Xác nhận mã nhà thuốc của bạn và nhấn bắt đầu để kết nối tài khoản Zalo với hệ thống MeCare.</p>
      <input type="text" id="slug-input" value="__SLUG_VALUE__" readonly autocomplete="off" />
      <button id="start-btn" onclick="startAuth()">Bắt đầu kết nối →</button>
    </div>

    <!-- Step 2: QR code -->
    <div class="step" id="step-2">
      <h2>Quét mã QR bằng Zalo</h2>
      <p class="hint">Mở ứng dụng Zalo trên điện thoại và quét mã bên dưới để kết nối.</p>
      <div class="qr-wrap">
        <div id="qr-placeholder" class="qr-placeholder pulse">Đang tạo mã QR…</div>
        <img id="qr-img" src="" alt="QR Code" style="display:none" />
        <div id="qr-status" class="status-badge waiting">
          <span id="status-dot" class="pulse">●</span>
          <span id="status-text">Đang chờ quét…</span>
        </div>
        <div class="instruction-list">
          <ol>
            <li>Mở <strong>Zalo</strong> trên điện thoại</li>
            <li>Chọn biểu tượng <strong>quét QR</strong> (góc trên phải)</li>
            <li>Hướng camera vào mã QR bên trên</li>
            <li>Nhấn <strong>Xác nhận</strong> để đăng nhập</li>
          </ol>
        </div>
        <p class="expire-note">Mã QR tự động làm mới khi hết hạn</p>
        <button id="retry-btn" style="display:none" onclick="retryAuth()">Thử lại</button>
      </div>
    </div>

    <!-- Step 3: Success -->
    <div class="step" id="step-3">
      <div class="success-icon">✅</div>
      <h2>Kết nối thành công!</h2>
      <p class="hint" id="success-msg">Tài khoản Zalo đã được kết nối với hệ thống MeCare.</p>
      <div id="success-badge" class="status-badge success-badge" style="justify-content:center">
        ● Đang hoạt động
      </div>
    </div>
  </div>

  <script>
    const SLUG = '__SLUG__';
    const TOKEN = '__TOKEN__';
    let pollTimer = null;

    function showStep(n) {
      [1, 2, 3].forEach(i => {
        document.getElementById('step-' + i).classList.toggle('active', i === n);
        document.getElementById('dot-' + i).classList.toggle('active', i <= n);
      });
    }

    async function startAuth() {
      const btn = document.getElementById('start-btn');
      btn.disabled = true;
      btn.textContent = 'Đang khởi tạo…';

      try {
        const res = await fetch('/auth/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
          body: JSON.stringify({ slug: SLUG })
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert('Lỗi: ' + (d.error || res.status));
          btn.disabled = false;
          btn.textContent = 'Bắt đầu kết nối →';
          return;
        }
        const data = await res.json();
        if (data.status === 'authenticated') {
          document.getElementById('success-msg').textContent =
            (data.userName ? 'Xin chào, ' + data.userName + '! ' : '') +
            'Tài khoản Zalo đã kết nối với nhà thuốc ' + SLUG + '.';
          showStep(3);
          return;
        }
        showStep(2);
        startPolling();
      } catch (err) {
        alert('Không thể kết nối: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Bắt đầu kết nối →';
      }
    }

    function startPolling() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(poll, 2000);
    }

    async function poll() {
      try {
        const res = await fetch('/auth/qr/' + encodeURIComponent(SLUG),
          { headers: { 'Authorization': 'Bearer ' + TOKEN } });
        if (!res.ok) return;
        const data = await res.json();
        updateQR(data);
      } catch { /* network error, retry next tick */ }
    }

    function updateQR(data) {
      const img = document.getElementById('qr-img');
      const placeholder = document.getElementById('qr-placeholder');
      const badge = document.getElementById('qr-status');
      const statusText = document.getElementById('status-text');
      const statusDot = document.getElementById('status-dot');
      const retryBtn = document.getElementById('retry-btn');

      if (data.qrImage) {
        img.src = 'data:image/png;base64,' + data.qrImage;
        img.style.display = 'block';
        placeholder.style.display = 'none';
      }

      switch (data.status) {
        case 'qr_ready':
          badge.className = 'status-badge waiting';
          statusDot.className = 'pulse';
          statusText.textContent = 'Đang chờ quét…';
          retryBtn.style.display = 'none';
          break;

        case 'scanned':
          badge.className = 'status-badge scanned';
          statusDot.className = '';
          statusText.textContent = '✓ Đã quét! Đang xác nhận…';
          retryBtn.style.display = 'none';
          break;

        case 'authenticated':
          clearInterval(pollTimer);
          document.getElementById('success-msg').textContent =
            (data.userName ? 'Xin chào, ' + data.userName + '! ' : '') +
            'Tài khoản Zalo đã kết nối với nhà thuốc ' + SLUG + '.';
          showStep(3);
          break;

        case 'failed':
          clearInterval(pollTimer);
          badge.className = 'status-badge error';
          statusDot.className = '';
          statusText.textContent = '✗ Lỗi xác thực';
          retryBtn.style.display = 'inline-block';
          break;
      }
    }

    async function retryAuth() {
      document.getElementById('retry-btn').style.display = 'none';
      document.getElementById('status-text').textContent = 'Đang khởi tạo lại…';
      try {
        await fetch('/auth/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
          body: JSON.stringify({ slug: SLUG })
        });
        startPolling();
      } catch (err) {
        alert('Không thể kết nối: ' + err.message);
      }
    }
  </script>
</body>
</html>`;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function injectHtml(slug: string, token: string): string {
  return ONBOARD_HTML.replace("'__SLUG__'", JSON.stringify(slug))
    .replace("'__TOKEN__'", JSON.stringify(token))
    .replace("__SLUG_VALUE__", slug.replace(/"/g, "&quot;"));
}

export async function handleAuthRoutes(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const rawUrl = req.url ?? "";
  const [path] = rawUrl.split("?");
  const url = path;

  if (url === "/onboard" && req.method === "GET") {
    const slug = getQueryParam(rawUrl, "slug");
    const token = getQueryParam(rawUrl, "token");
    if (!slug || !token) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Bad request: slug and token required.");
      return true;
    }
    const result = await verifyPharmacyToken(slug, token);
    if (result === "unavailable") {
      res.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
      res.end("Service unavailable: Baserow not reachable or PHARMACIES_TABLE_ID not set.");
      return true;
    }
    if (result !== "ok") {
      res.writeHead(401, { "content-type": "text/plain; charset=utf-8" });
      res.end("Unauthorized: invalid token or pharmacy not found.");
      return true;
    }
    const html = injectHtml(slug, token);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return true;
  }

  if (url === "/auth/start" && req.method === "POST") {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        sendJson(res, 400, { error: "invalid_json" });
        return;
      }
      const payload = (body ?? {}) as Record<string, unknown>;
      const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
      if (!slug) {
        sendJson(res, 400, { error: "slug_required" });
        return;
      }
      const token = getBearerToken(req);
      const verify = await verifyPharmacyToken(slug, token);
      if (verify === "unavailable") {
        sendJson(res, 503, { error: "baserow_unavailable" });
        return;
      }
      if (verify !== "ok") {
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }
      const current = getAuthState(slug);
      if (current.status === "authenticated") {
        sendJson(res, 200, { status: "authenticated", userName: current.userName });
        return;
      }
      startQRLogin(slug);
      sendJson(res, 200, { status: "started" });
    });
    return true;
  }

  if (url.startsWith("/auth/qr/") && req.method === "GET") {
    const slug = decodeURIComponent(url.slice("/auth/qr/".length));
    const token = getBearerToken(req) || getQueryParam(rawUrl, "token");
    const verify = await verifyPharmacyToken(slug, token);
    if (verify === "unavailable") {
      sendJson(res, 503, { error: "baserow_unavailable" });
      return true;
    }
    if (verify !== "ok") {
      sendJson(res, 401, { error: "unauthorized" });
      return true;
    }
    const state = getAuthState(slug);
    sendJson(res, 200, {
      status: state.status,
      qrImage: state.qrImage ?? null,
      userName: state.userName ?? null,
    });
    return true;
  }

  if (url.startsWith("/auth/status/") && req.method === "GET") {
    const slug = decodeURIComponent(url.slice("/auth/status/".length));
    const token = getBearerToken(req) || getQueryParam(rawUrl, "token");
    const verify = await verifyPharmacyToken(slug, token);
    if (verify === "unavailable") {
      sendJson(res, 503, { error: "baserow_unavailable" });
      return true;
    }
    if (verify !== "ok") {
      sendJson(res, 401, { error: "unauthorized" });
      return true;
    }
    const state = getAuthState(slug);
    sendJson(res, 200, {
      status: state.status,
      userName: state.userName ?? null,
      error: state.error ?? null,
    });
    return true;
  }

  return false;
}
