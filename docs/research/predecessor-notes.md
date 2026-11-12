# Predecessor repo notes: computer-evolution-lab

Read-only survey of <https://github.com/0thernes/computer-evolution-lab> on 12 November 2026 (America/Los_Angeles). The repo was **not cloned**. Files were read via the GitHub contents API and `raw.githubusercontent.com` (`README.md`, `package.json`, `VERSION`, `docs/*`, `.github/workflows/ci.yml`, `.github/CONTRIBUTING.md`, and directory listings for `src/`, `tools/`, `tests/`, `.github/`).

Default branch observed: `main`. Live demo: <https://0thernes.github.io/computer-evolution-lab/>.

## Architecture

Computer Evolution Lab v5.0 is a **zero-build, zero npm-runtime-dependency** educational web lab: 48 hard-wired operational machines in four “Grand Circles,” plus a 49-scene 4K HDR 3D museum, an 11-rung × 3-sub-lens layer stack (528 primary rungs / 1,584 views), a 5-tab CS Roofline & Physics Atlas, a live RISC-V `RV32IM` + WebGL2 “Modern Mini PC,” and a WebAudio film-score engine.

The loading model is **26 classic deferred `<script>` tags in deterministic order**, so the app runs from `file://` (double-click `computer-evolution-lab.html`) as well as HTTP. `index.html` and `computer-evolution-lab.html` are required to stay **byte-identical** entrypoints (`CONTRIBUTING.md`).

Documented module graph (`docs/ARCHITECTURE.md`):

| Area | Paths |
| :--- | :---- |
| Entry | `index.html` / `computer-evolution-lab.html`, `styles/lab.css` |
| Vendor | `vendor/three-bundle.js` (`THREE` + addons) |
| Core / UI | `src/core/three-aliases.js`, `src/core/dom-ui.js` |
| Graphics | `src/graphics/pbr-materials.js`, `kit-3d.js`, `studio-stage.js` (MSAA / HDR / CAD slicer) |
| Simulators | `src/sim/core-simulators.js`, `riscv-modern-pc.js`, `enterprise-hpc-quantum-sims.js`, `hardwired-frontier-sims.js` |
| Layers | `src/layers/layer-stack.js`, `layers-expansion.js`, `hardwired-gate-engine.js` |
| App shell | `src/app/compare-modal.js`, `src/app/lab-main.js` (`window.LAB`) |
| Machines | `src/machines/machines-*.js`, `machine-pc20.js` (one file group per circle) |
| Audio | `assets/audio/sfx-clips.js`, `src/audio/cinematic-score.js` |

The modern PC (`pc20`) maps a tiny RV32IM CPU through L1I/L1D/L2 caches onto UART, PCIe-style GPU MMIO (`uniform vec4 uCPU` into a WebGL2 GLSL ES 3.0 shader), and NVMe-style DMA. Rendering is Three.js + 4-sample MSAA (High/Ultra), UnrealBloom, ACES Filmic, optional SMAA.

A native Windows x64 path exists under `desktop/`: .NET 10 + WebView2, built by `tools/build-desktop.mjs` (`npm run build:exe`).

## Tooling

`package.json` (name `computer-evolution-lab`, version **5.0.0**, `private`, `engines.node >= 20`, no runtime `dependencies` block):

| Script | Role |
| :--- | :--- |
| `start` / `dev` | `node tools/serve.mjs` (loopback `http://127.0.0.1:4173`) |
| `test` | `node tools/run-tests.mjs` |
| `test:ci` | `node tools/run-tests.mjs --ci-headless-optional` |
| `audit:4k` | `node tools/render-4k-audit.mjs` |
| `build:icon` / `build:exe` / `install:desktop` | desktop packaging |
| `format` / `format:check` | Prettier on `html,css,js,mjs,json,md,yml` |

Root tooling also includes `.prettierrc.json`, `.gitignore`, `.nojekyll` (GitHub Pages), `.gitattributes`, `LICENSE` (Cosmogonic Non-Commercial), `THIRD-PARTY-NOTICES.md`, `CHANGELOG.md`.

**Note:** the root `VERSION` file still contains `2.0.0` while `package.json` and the README say `5.0.0`. Treat this as a stale-file issue worth not copying.

## Test setup

- Deterministic Node unit tests: `node --test tests/simulators.test.mjs` (README: 31 standalone engines + 768 HardWiredNetlistSolver truth-table states). Only one test file was listed under `tests/`.
- Static audit: `node tools/audit-exhaustive.mjs` (symbols, PBR helpers, SFX, HTML IDs).
- Full suite: `tools/run-tests.mjs` — headless WebGL2 pass over the 48 machines, 528-layer stack, audio, and `file://` verification, using `tools/cdp-harness.mjs` (Chrome DevTools Protocol).
- Optional visual audit: 51 4K (3840×2160) PNGs + white-clipping report (`audit:4k`).
- Coverage badge is published from `docs/badges/coverage.json`.

## CI workflow

Single workflow: `.github/workflows/ci.yml`, name `CI`.

- Triggers: `push` and `pull_request` to `main`.
- Permissions: `contents: read`.
- One job `verify` on `ubuntu-latest`:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with **Node 22**
  3. `node tools/audit-exhaustive.mjs`
  4. `node --test tests/simulators.test.mjs`
  5. `node tools/run-tests.mjs --ci-headless-optional`

## Docs layout

`docs/INDEX.md` is the hub:

| Document | Purpose |
| :--- | :--- |
| `docs/SUMMARY.md` | Executive summary |
| `docs/ARCHITECTURE.md` | Script graph, campus topology, `pc20` bus, 4K HDR pipeline |
| `docs/GLOSSARY.md` | Canonical terms |
| `README.md` | Quickstart, machine matrix, shortcuts, tests |
| `CHANGELOG.md` | Versioned history |
| `THIRD-PARTY-NOTICES.md` | Three.js MIT, CC0 audio, citations |
| `docs/badges/` | CI badge JSON |

GitHub community files: `.github/CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ISSUE_TEMPLATE/`.

## Repo-checklist items worth reusing in Xiaomi 17T Pro Lab

These are the predecessor practices that map cleanly onto a phone-first, citation-heavy lab (without copying product/license identity):

1. **Zero-build browser entry** plus an identical HTTP path; keep two HTML entrypoints byte-identical if `file://` support is required.
2. **No unsourced “cosmetic” hardware** — CONTRIBUTING’s rule (“every 3D machine must genuinely execute”) should become “every figure in the 3D/UI is cited or marked UNKNOWN.”
3. **Layer-stack navigation** (hardware rungs with sub-lenses) is the right skeleton for the taxonomy in `taxonomy.json` (device → quantum).
4. **Docs kit:** `docs/INDEX.md`, `ARCHITECTURE.md`, `GLOSSARY.md`, `SUMMARY.md`, `CHANGELOG.md`, plus a citations/sources page.
5. **Pre-commit / CI checklist** from CONTRIBUTING, adapted:
   - unit tests (`node --test`)
   - static audit (IDs, symbols, **and spec-citation integrity**)
   - optional headless WebGL / WebGPU smoke
   - `prettier --check`
6. **CI shape:** read-only permissions, Node 22 on `ubuntu-latest`, audit then unit tests then optional headless suite; a coverage or “specs confirmed/unknown” badge JSON.
7. **Tooling split:** `tools/serve.mjs`, audit script, CDP harness, optional 4K visual audit — keep runtime free of npm dependencies if the lab is static.
8. **Modular `src/` layout** (`app`, `core`, `graphics`, `layers`, machines-or-systems, `sim`, `audio`) plus a vendored engine (Three.js and/or p5.js) under `vendor/`.
9. **`.nojekyll` + GitHub Pages** (or equivalent) for a zero-install demo.
10. **SECURITY / CONTRIBUTING / CODE_OF_CONDUCT** templates; keyboard help (`?`) and a comparative atlas modal (`G`).
11. **Do not reuse** the stale `VERSION` file pattern; keep a single source of truth for the version number.
12. Desktop WebView2 packaging is optional for a phone-lab and can wait; the predecessor’s `file://` + loopback server is the higher-value default.

Supported predecessor browsers (README): Chrome/Edge ≥ 120, Firefox ≥ 122, Safari ≥ 17.4, with WebGL2 and WebAudio, including Android. That constraint set is directly relevant to WebGPU/WebGL2 notes in the Xiaomi 17T Pro dossier.
