# Review 0.3.0

Hardening sweep of `main` at `b76ca54` (v2.0.0), which already contained `35d6b03`. The product version is 2.1.0. The file index is [INDEX.md](INDEX.md).

A pass is one dimension applied across that index. Eighteen passes were run. Two hundred were not. After the clock, citation, CSP, and smoke defects below, further sweeps re-read solvers that already have analytic checks (TDSE norm, FFT round-trip, Bragg reflectivity, WKB, CHSH `2√2`, Mermin-3 `4`, infinite-well eigenvalues). Repeating those checks would pad the count.

## Classes

Each finding is one class, using the same words as [REVIEW-0.2.0.md](../REVIEW-0.2.0.md) and the dossier:

| Class    | Meaning                                                              |
| -------- | -------------------------------------------------------------------- |
| bug      | The code does something other than the contract it states.           |
| error    | A figure or failure that is simply wrong.                            |
| issue    | Incomplete or stale relative to a known requirement.                 |
| problem  | It runs, and it is weaker than the bar it claims.                    |
| dilemma  | Two real constraints cannot both be met.                             |
| conflict | Two sources disagree, and the lab must not pick a winner in silence. |

Gaps, holes, and blindspots are listed separately. They are not given one of those six classes.

## Passes

| #   | Dimension           | Result                                                                                                              |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Inventory           | 254 files in the index. Text-file line total recorded there.                                                        |
| 2   | Syntax              | `node --check` on every first-party `.js` and `.mjs`. Clean.                                                        |
| 3   | Lint                | `npm run lint` (Prettier). Clean.                                                                                   |
| 4   | Spec schema         | `npm run validate`. `specs.json` reports 0 errors.                                                                  |
| 5   | Numerical checks    | Existing reference tests, plus the thermal clock pinned at 1200 s for a 20-minute run.                              |
| 6   | Units and citations | Compared battery and charge callouts with `specs.json`.                                                             |
| 7   | Provenance labels   | The battery inspect line no longer states an invented watt-hour as cited.                                           |
| 8   | Accessibility       | Skip link, `:focus-visible`, reduced-motion orbit, 44 px dock targets in smoke. `--faint` on `--s0` is about 5.1:1. |
| 9   | Security            | Path traversal tests, no committed secrets, CSP, COOP/COEP, loopback bind.                                          |
| 10  | Disposal            | Route changes call `dispose()`. Views release geometries, composer, and the renderer.                               |
| 11  | WebGL / WebGPU      | `?webgl=1` smoke still matches the CPU matmul. No hardware GPU on this runner.                                      |
| 12  | Docs versus code    | README table, `SECURITY.md` version, and `docs/INDEX.md` were behind the tree.                                      |
| 13  | Tests               | Unit suite plus a smoke test that walks every route.                                                                |
| 14  | CI                  | `.github/workflows/ci.yml` runs lint, unit tests, and Playwright on Node 22. Left as written.                       |
| 15  | Vendor integrity    | TinyStories `model.f16.safetensors` matches `vendor/tinystories/SHA256.txt`. three.js and p5 were not line-audited. |
| 16  | Offline / COI       | Dev server sends COOP/COEP. The service worker stays opt-in.                                                        |
| 17  | Copy                | README workloads row repaired so the table parses.                                                                  |
| 18  | Runtime edges       | Thermal CFL sub-stepping still caps the explicit Euler step. A 20-minute curve finishes in the unit test.           |

## Findings

| Class    | File                                                      | Severity | What                                                                                                                                                                                                           | Status                                                                    |
| -------- | --------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| bug      | `src/sim/thermal-fdtd.js:293`                             | high     | `simulateSustainedThrottle` labeled samples as 20 minutes and then stepped 0.6 s, so the last point was about 24 s of physics.                                                                                 | fixed in `81cb614`                                                        |
| bug      | `README.md` workloads row                                 | medium   | Raw pipe characters split the workloads cell, so the table did not parse.                                                                                                                                      | fixed in the 2.1.0 commit                                                 |
| error    | `src/sim/thermal-fdtd.js:229`                             | high     | 3.88 V and 27.16 Wh were not in `specs.json`. The cited cell voltage is 4.58 V. Nominal watt-hours are unpublished, so `batteryWh` and `batteryHrs` are null.                                                  | fixed in `81cb614`                                                        |
| error    | `src/graphics/subjects.js:509`, `src/labs/thermal.js:415` | high     | The battery callout said 90 W wired next to a cited badge. The cited wired charge is 100 W and wireless is 50 W.                                                                                               | fixed in `81cb614`                                                        |
| issue    | `index.html:9`, `tools/serve.mjs`, `src/labs/work.js:638` | high     | No CSP, and Glitchling ran through `new Function`. The policy hashes the import map. Glitchling is a module import. `style-src` still allows `'unsafe-inline'` because Three.js and p5 assign `element.style`. | fixed in `a78537e`                                                        |
| issue    | `SECURITY.md`, `docs/INDEX.md`                            | low      | Security text still said 0.2.0, and the docs index omitted later ADRs and this audit.                                                                                                                          | fixed in the 2.1.0 commit                                                 |
| issue    | `src/audio.js`                                            | low      | The score is original synthesis. No sample library was added.                                                                                                                                                  | open, [issue #3](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/3) |
| problem  | `tests/e2e/smoke.spec.js:134`                             | medium   | Smoke checked some canvases and `pageerror`, not every route and not `console.error`. A single sample could read the transistor canvas before its first frame.                                                 | fixed in `a78537e` and `9fab9d5`                                          |
| dilemma  | product version                                           | medium   | The request said 0.3.0. `main` was already 2.0.0. Dropping to 0.3.0 would break semver. This release is 2.1.0. The audit file keeps the 0.3.0 review name.                                                     | fixed by the 2.1.0 choice                                                 |
| dilemma  | `vendor/glitchling/NOTICE.md`                             | high     | CQM creatures stay out. Copying them would relicense them or ship files that do not run.                                                                                                                       | open, [issue #2](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/2) |
| dilemma  | FinFET / BEOL drawings                                    | high     | Fin height, high-k thickness, and the N3P metal deck above 23 nm are unpublished.                                                                                                                              | open, [issue #5](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/5) |
| conflict | `data/specs.json` `conflicts`                             | high     | Open leaves and conflicts 16–22 still disagree. The specs page does not pick a winner.                                                                                                                         | open, [issue #4](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/4) |

## Gaps, holes, blindspots

| Item                                           | Why it stays                                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Nominal battery watt-hours                     | Unpublished. 7000 mAh and 4.58 V are cited. Multiplying them would treat a high-voltage rating as a discharge voltage. |
| No hardware GPU on the CI runner               | SwiftShader only. A real Mali look is a Pages check. Already on issue #5.                                              |
| Vendored three.js, p5, and TinyStories weights | Listed in the index. Integrity and license only. The TinyStories float16 file matches its SHA-256.                     |
| `style-src 'unsafe-inline'`                    | Required by renderer style assignments. Script execution stays on `'self'` plus the import-map hash.                   |

## Counts

| Class                  | Found | Fixed | Open |
| ---------------------- | ----: | ----: | ---: |
| bug                    |     2 |     2 |    0 |
| error                  |     2 |     2 |    0 |
| issue                  |     3 |     2 |    1 |
| problem                |     1 |     1 |    0 |
| dilemma                |     3 |     1 |    2 |
| conflict               |     1 |     0 |    1 |
| gap / hole / blindspot |     4 |     0 |    4 |

## Tests

`npm test`: 37 passed. `npm run validate`: 0 errors. `npm run lint`: clean. Playwright: 8 passed after the first-frame wait, including the all-route canvas and console-error check. CI on GitHub runs the same three commands.
