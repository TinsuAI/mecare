import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "out");
const PORT = 4201;

const EXTS = [".mp4", ".webm", ".gif", ".png", ".jpg"];

function humanSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function listPage() {
  const files = fs
    .readdirSync(OUT_DIR)
    .filter((f) => EXTS.includes(path.extname(f).toLowerCase()))
    .map((f) => {
      const stat = fs.statSync(path.join(OUT_DIR, f));
      return { name: f, size: humanSize(stat.size), mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const rows = files
    .map(
      (f) => `
    <tr>
      <td>${f.name.match(/\.(mp4|webm|gif)$/) ? "🎬" : "🖼"} ${f.name}</td>
      <td style="color:#888;padding:0 24px">${f.size}</td>
      <td>
        <a href="/download/${encodeURIComponent(f.name)}" download="${f.name}"
           style="background:#0E9E8E;color:#fff;padding:8px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
          ⬇ Tải về
        </a>
        ${f.name.match(/\.(mp4|webm)$/) ? `<a href="/view/${encodeURIComponent(f.name)}" target="_blank" style="margin-left:10px;color:#0E9E8E;font-size:14px">▶ Xem</a>` : ""}
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>MeCare Videos — Download</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; margin: 0; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .sub { color: #0E9E8E; font-size: 14px; margin-bottom: 28px; }
    table { border-collapse: collapse; width: 100%; }
    tr { border-bottom: 1px solid #21262d; }
    td { padding: 14px 8px; font-size: 15px; }
    tr:hover td { background: #161b22; }
  </style>
</head>
<body>
  <h1>💊 MeCare Videos</h1>
  <p class="sub">Ngọc AI · Showcase render output — ${files.length} file(s)</p>
  <table>${rows || "<tr><td colspan=3 style='color:#888'>Chưa có file nào trong out/</td></tr>"}</table>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(listPage());
    return;
  }

  const match = url.pathname.match(/^\/(download|view)\/(.+)$/);
  if (match) {
    const filename = decodeURIComponent(match[2]);
    const filepath = path.join(OUT_DIR, path.basename(filename));

    if (!fs.existsSync(filepath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const stat = fs.statSync(filepath);
    const ext = path.extname(filepath).toLowerCase();
    const mime =
      ext === ".mp4" ? "video/mp4" :
      ext === ".webm" ? "video/webm" :
      ext === ".gif" ? "image/gif" :
      ext === ".png" ? "image/png" : "application/octet-stream";

    const headers = {
      "Content-Type": mime,
      "Content-Length": stat.size,
    };
    if (match[1] === "download") {
      headers["Content-Disposition"] = `attachment; filename="${path.basename(filepath)}"`;
    }

    res.writeHead(200, headers);
    fs.createReadStream(filepath).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n✅  MeCare video server: http://localhost:${PORT}\n`);
});
