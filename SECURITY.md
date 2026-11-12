# Security

Version 0.2.0. This is a static site. It has no accounts, no server-side secret, and no database. The TinyStories weights under `vendor/tinystories/` are a public model checkpoint, not a credential.

## Reporting

Open a GitHub security advisory on `0thernes/xiaomi-17t-pro-lab`, or mail the maintainer listed on the repository if advisories are not enabled yet. Please describe the page, the browser, and a minimal reproduction. Give us a chance to fix it before writing about it in public.

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
