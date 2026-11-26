# Security

Version 3.1.0. This is a zero-build static site. The loopback dev server (`tools/serve.mjs`), `index.html`, and `blueprint/index.html` enforce a strict Content-Security-Policy (`script-src 'self'` plus import-map hash; `style-src 'self'` with zero `'unsafe-inline'`; `object-src 'none'`; `form-action 'none'`). TinyStories-8M weights under `vendor/tinystories/shards/` are public FP16 model shards cryptographically verified via WebCrypto `SHA-256`, not credentials. See [docs/threat-model.md](docs/threat-model.md) for the full STRIDE matrix.

## Reporting

Open a GitHub security advisory on `0thernes/xiaomi-17t-pro-lab`, or email `0_0@0thernes.art` (Alexander Stephen Donahue, ORCID `0009-0006-8168-9648`). Please describe the route, browser/runtime version, and minimal reproduction.

## What is in scope

- The loopback server in `tools/serve.mjs` reading a file outside the repository root.
- Cross-origin isolation headers weakening isolation (COEP `require-corp` dropped, or a service worker that proxies arbitrary origins).
- A dependency or vendored file that executes unexpected code on load.

## What is not a vulnerability

- The page measuring timing, memory bandwidth, or GPU throughput of the browser it is open in. That is the product, and it does not leave the device.
- UNKNOWN hardware fields. Missing a number is intentional.
- The opt-in service worker. It only attaches COOP/COEP to same-origin responses and is not registered until a person asks.

## Dev server

`npm start` binds `127.0.0.1` only. Paths are resolved with `path.relative` against the repo root and rejected when they escape. Do not expose that process to a network.
