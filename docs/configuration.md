# Configuration Reference (`docs/configuration.md`)

`xiaomi-17t-pro-lab` is a zero-build static web application with an optional Node.js loopback development server (`tools/serve.mjs`). No secrets, API keys, or cloud credentials are required.

## 1. Environment Variables (`.env.example`)

| Variable     | Default | Validation                                                                        | Purpose                                                                                                                     |
| :----------- | :------ | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `PORT`       | `47321` | Integer in `0..65535` (`parsePort` fails fast with `RangeError` on invalid input) | TCP loopback port for `tools/serve.mjs` (`127.0.0.1` only). CLI positional arg overrides `PORT`.                            |
| `LOG_FORMAT` | unset   | `"json"` or empty                                                                 | When set to `"json"`, emits structured JSON log lines (`ts`, `level`, `event`, metadata) on server start and stream errors. |
| `SHOOT`      | `0`     | `"1"` enables capture                                                             | Used by `tools/shoot.mjs` / `tests/e2e/smoke.spec.js` to regenerate `docs/screenshots/{phone,desktop}/*.png`.               |

## 2. URL Query Parameters (Browser Client)

| Parameter  | Values                           | Effect                                                                                                            |
| :--------- | :------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `?tier=`   | `low`, `medium`, `high`, `ultra` | Overrides automatic hardware capability tier selection (`src/quality.js`).                                        |
| `?webgl=1` | `1`                              | Forces WebGL2 matmul verification path on `#/gpu`.                                                                |
| `?coi=1`   | `1`                              | Opt-in Cross-Origin Isolation service worker (`coi-serviceworker.js`) for high-resolution timers on GitHub Pages. |

## 3. HTTP Server Endpoints (`tools/serve.mjs`)

- `GET /` and `GET /xiaomi-17t-pro-lab/*`: Serves static lab files with strict CSP (`style-src 'self'`), `COOP: same-origin`, `COEP: require-corp`, `CORP: same-origin`, `X-Content-Type-Options: nosniff`, and accurate MIME types (including `.jpg` → `image/jpeg`, `.wasm` → `application/wasm`, `.pdf` → `application/pdf`).
- `GET /healthz` (and `GET /xiaomi-17t-pro-lab/healthz`): Returns HTTP `200` JSON `{ "ok": true, "service": "xiaomi-17t-pro-lab", "uptimeMs": ... }`.
- `HEAD <path>`: Returns headers with empty body.
- All other HTTP methods (`POST`, `PUT`, `DELETE`, etc.): Returns `405 Method Not Allowed` with `Allow: GET, HEAD`.
