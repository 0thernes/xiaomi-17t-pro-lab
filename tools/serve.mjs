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
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
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

export function parsePort(raw, fallback = 47321) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    throw new RangeError(`Invalid port "${raw}": must be an integer in 0..65535`);
  }
  return n;
}

function logEvent(level, event, extra = {}) {
  if (process.env.LOG_FORMAT === "json") {
    const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...extra });
    (level === "error" ? console.error : console.log)(line);
  }
}

export function startServer(port, { createReadStream = fs.createReadStream } = {}) {
  const validPort = parsePort(port, 47321);
  const startedAt = Date.now();
  const server = http.createServer((req, res) => {
    const method = req.method || "GET";
    if (method !== "GET" && method !== "HEAD") {
      res.writeHead(405, {
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=utf-8",
        ...SECURITY_HEADERS,
      });
      res.end("Method Not Allowed");
      return;
    }

    const bare = (req.url || "/").split("?")[0].split("#")[0];
    if (bare === "/healthz" || bare === `${PREFIX}/healthz`) {
      const payload = JSON.stringify({
        ok: true,
        service: "xiaomi-17t-pro-lab",
        uptimeMs: Date.now() - startedAt,
      });
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        ...SECURITY_HEADERS,
      });
      res.end(method === "HEAD" ? undefined : payload);
      return;
    }

    const file = resolveSafe(ROOT, req.url || "/");
    if (!file) {
      send(res, 403, method === "HEAD" ? "" : "Forbidden");
      return;
    }
    let target = file;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, "index.html");
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      send(res, 404, method === "HEAD" ? "" : "Not found");
      return;
    }
    const type = TYPES[path.extname(target)] || "application/octet-stream";
    if (method === "HEAD") {
      res.writeHead(200, { "Content-Type": type, ...SECURITY_HEADERS });
      res.end();
      return;
    }
    const stream = createReadStream(target);
    let headersSent = false;
    stream.on("open", () => {
      headersSent = true;
      res.writeHead(200, {
        "Content-Type": type,
        ...SECURITY_HEADERS,
      });
      stream.pipe(res);
    });
    stream.on("error", (err) => {
      logEvent("error", "read_stream_error", { target, code: err?.code || "ERR", message: err?.message });
      if (!headersSent && !res.headersSent) {
        send(res, 500, "Internal Server Error");
      } else if (!res.writableEnded) {
        res.destroy();
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(validPort, "127.0.0.1", () => {
      logEvent("info", "server_started", { port: server.address().port });
      resolve(server);
    });
  });
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const port = parsePort(process.argv[2] ?? process.env.PORT, 47321);
  startServer(port).then((srv) => {
    console.log(`http://127.0.0.1:${srv.address().port}/`);
  });
}
