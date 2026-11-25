import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREFIX = "/xiaomi-17t-pro-lab";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".wav": "audio/wav",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

/**
 * Map a URL path onto a file inside ROOT.
 * Rejects prefix-sibling escapes (`/workspace` vs `/workspace-secret`)
 * and encoded `..` segments. Returns null when the path leaves ROOT.
 */
export function resolveSafe(root, urlPath) {
  const bare = urlPath.split("?")[0].split("#")[0];
  if (bare.includes("\0")) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(bare);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  let pathname = decoded;
  if (pathname === PREFIX) pathname = "/";
  else if (pathname.startsWith(`${PREFIX}/`)) pathname = pathname.slice(PREFIX.length);
  const rel = pathname.replace(/^\/+/, "");
  const full = path.resolve(root, rel);
  const relative = path.relative(root, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return full;
}

const SECURITY_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'sha256-Fr475xZHBHPN6xm2sq3LW3tLGg/EpTH7a1ZC8aYgWsU='; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; worker-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-cache",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    ...SECURITY_HEADERS,
  });
  res.end(body);
}

export function startServer(port) {
  const server = http.createServer((req, res) => {
    const file = resolveSafe(ROOT, req.url || "/");
    if (!file) {
      send(res, 403, "Forbidden");
      return;
    }
    let target = file;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, "index.html");
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      send(res, 404, "Not found");
      return;
    }
    const type = TYPES[path.extname(target)] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      ...SECURITY_HEADERS,
    });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const port = Number(process.argv[2] || 47321);
  startServer(port).then(() => {
    console.log(`http://127.0.0.1:${port}/`);
  });
}
