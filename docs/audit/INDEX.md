# Audit index

Spine for the 2.1.0 hardening sweep. Baseline is `main` at `b76ca54` (v2.0.0), which already contained `35d6b03`. Line counts are newline-terminated records. `bin` is a non-text file; its size is in bytes. Vendored three.js, p5, fonts, TinyStories weights, and screenshots are listed for integrity and license, and were not read line by line. This index file is not a row in the table.

## (root)

| Path                     | Lines | Bytes |
| ------------------------ | ----: | ----: |
| `.gitattributes`         |     4 |    61 |
| `.gitignore`             |     7 |    78 |
| `.nojekyll`              |     1 |    10 |
| `.prettierignore`        |     6 |    89 |
| `.prettierrc.json`       |     5 |    74 |
| `CHANGELOG.md`           |    92 | 11686 |
| `CODE_OF_CONDUCT.md`     |    37 |  1501 |
| `CONTRIBUTING.md`        |    45 |  1706 |
| `CREDITS.md`             |    31 |  3355 |
| `LICENSE`                |    26 |  1308 |
| `README.md`              |    48 |  7829 |
| `SECURITY.md`            |    23 |  1373 |
| `THIRD-PARTY-NOTICES.md` |    58 |  2402 |
| `VERSION`                |     1 |     6 |
| `coi-serviceworker.js`   |    26 |  1023 |
| `favicon.svg`            |     5 |   262 |
| `index.html`             |    38 |  1682 |
| `package-lock.json`      |    81 |  2316 |
| `package.json`           |    25 |   717 |
| `playwright.config.js`   |    20 |   488 |

## .github

| Path                                 | Lines | Bytes |
| ------------------------------------ | ----: | ----: |
| `.github/ISSUE_TEMPLATE/bug.yml`     |    22 |   609 |
| `.github/ISSUE_TEMPLATE/feature.yml` |    16 |   508 |
| `.github/PULL_REQUEST_TEMPLATE.md`   |    15 |   420 |
| `.github/workflows/ci.yml`           |    26 |   468 |
| `.github/workflows/pages.yml`        |    29 |   510 |

## assets

| Path                                                        | Lines |  Bytes |
| ----------------------------------------------------------- | ----: | -----: |
| `assets/textures/cc0/CREDITS.md`                            |    15 |    915 |
| `assets/textures/cc0/metal_plate/metal_plate_diff_1k.jpg`   |   bin | 692234 |
| `assets/textures/cc0/metal_plate/metal_plate_nor_gl_1k.jpg` |   bin | 770307 |
| `assets/textures/cc0/metal_plate/metal_plate_rough_1k.jpg`  |   bin | 775206 |

## data

| Path                 | Lines |  Bytes |
| -------------------- | ----: | -----: |
| `data/specs.json`    |  3097 | 146378 |
| `data/taxonomy.json` |  3262 | 117737 |

## docs

| Path                                        | Lines |   Bytes |
| ------------------------------------------- | ----: | ------: |
| `docs/ADR-001-zero-build.md`                |    17 |     817 |
| `docs/ADR-002-provenance.md`                |    19 |     917 |
| `docs/ADR-003-quality-tier.md`              |    19 |    1102 |
| `docs/ADR-004-timers.md`                    |    17 |     865 |
| `docs/ADR-005-npu.md`                       |    17 |    1013 |
| `docs/ADR-006-one-subject.md`               |    17 |     615 |
| `docs/ADR-007-design-system.md`             |    17 |     612 |
| `docs/ARCHITECTURE.md`                      |    47 |    2451 |
| `docs/DATA-PROVENANCE.md`                   |    32 |    2468 |
| `docs/glossary.md`                          |    18 |    2397 |
| `docs/INDEX.md`                             |    21 |     801 |
| `docs/MEASUREMENTS.md`                      |    60 |    5348 |
| `docs/RELEASE-0.1.0.md`                     |    31 |    1202 |
| `docs/REVIEW-0.2.0.md`                      |    21 |    4350 |
| `docs/SUMMARY.md`                           |     7 |     620 |
| `docs/design/00-tokens.md`                  |    13 |     522 |
| `docs/design/01-shell.md`                   |    15 |     454 |
| `docs/design/02-phone.md`                   |    11 |     259 |
| `docs/design/03-zoom.md`                    |    10 |     176 |
| `docs/design/04-cpu.md`                     |    10 |     161 |
| `docs/design/05-gpu.md`                     |     9 |     131 |
| `docs/design/06-npu.md`                     |     9 |     136 |
| `docs/design/07-litho.md`                   |     8 |     180 |
| `docs/design/08-transistor.md`              |     8 |     180 |
| `docs/design/09-compare.md`                 |    11 |     227 |
| `docs/design/10-work.md`                    |     9 |     261 |
| `docs/design/11-specs.md`                   |     8 |     104 |
| `docs/research/cpu-gpu-npu-deep.md`         |   375 |   30435 |
| `docs/research/deep-dive.md`                |   176 |   17667 |
| `docs/research/head-to-head.md`             |   177 |   18350 |
| `docs/research/predecessor-notes.md`        |   106 |    7263 |
| `docs/research/specs-dossier.md`            |   295 |   31609 |
| `docs/research/unknowns-resolved.md`        |   263 |   42835 |
| `docs/screenshots/desktop/compare.png`      |   bin |  659596 |
| `docs/screenshots/desktop/cpu.png`          |   bin | 1455786 |
| `docs/screenshots/desktop/gpu.png`          |   bin | 1484831 |
| `docs/screenshots/desktop/litho.png`        |   bin | 1359870 |
| `docs/screenshots/desktop/memory.png`       |   bin | 1425894 |
| `docs/screenshots/desktop/npu.png`          |   bin | 1480350 |
| `docs/screenshots/desktop/phone.png`        |   bin | 1010481 |
| `docs/screenshots/desktop/specs.png`        |   bin |  737372 |
| `docs/screenshots/desktop/thermal.png`      |   bin | 1448971 |
| `docs/screenshots/desktop/transistor.png`   |   bin | 1342996 |
| `docs/screenshots/desktop/work-browser.png` |   bin |  815293 |
| `docs/screenshots/desktop/work-life.png`    |   bin |  905099 |
| `docs/screenshots/desktop/work-llm.png`     |   bin |  856435 |
| `docs/screenshots/desktop/work-sci.png`     |   bin | 1359265 |
| `docs/screenshots/desktop/work.png`         |   bin | 3934528 |
| `docs/screenshots/desktop/zoom-gpu.png`     |   bin | 1360109 |
| `docs/screenshots/desktop/zoom-litho.png`   |   bin | 1358750 |
| `docs/screenshots/desktop/zoom-npu.png`     |   bin | 1378763 |
| `docs/screenshots/desktop/zoom.png`         |   bin | 1363211 |
| `docs/screenshots/high/cpu.png`             |   bin |  174534 |
| `docs/screenshots/high/gpu.png`             |   bin |  178219 |
| `docs/screenshots/high/npu.png`             |   bin |  179095 |
| `docs/screenshots/high/phone-back.png`      |   bin |  154460 |
| `docs/screenshots/high/phone-front.png`     |   bin |  164619 |
| `docs/screenshots/phone/compare.png`        |   bin |  381022 |
| `docs/screenshots/phone/cpu.png`            |   bin |  468961 |
| `docs/screenshots/phone/gpu.png`            |   bin |  509426 |
| `docs/screenshots/phone/litho.png`          |   bin |  534889 |
| `docs/screenshots/phone/memory.png`         |   bin |  486071 |
| `docs/screenshots/phone/npu.png`            |   bin |  458067 |
| `docs/screenshots/phone/phone.png`          |   bin |  290698 |
| `docs/screenshots/phone/specs.png`          |   bin |  304495 |
| `docs/screenshots/phone/thermal.png`        |   bin |  559422 |
| `docs/screenshots/phone/transistor.png`     |   bin |  502307 |
| `docs/screenshots/phone/work-browser.png`   |   bin |  382075 |
| `docs/screenshots/phone/work-life.png`      |   bin |  360114 |
| `docs/screenshots/phone/work-llm.png`       |   bin |  379673 |
| `docs/screenshots/phone/work-sci.png`       |   bin |  541398 |
| `docs/screenshots/phone/work.png`           |   bin |  531779 |
| `docs/screenshots/phone/zoom-gpu.png`       |   bin |  397482 |
| `docs/screenshots/phone/zoom-litho.png`     |   bin |  397715 |
| `docs/screenshots/phone/zoom-npu.png`       |   bin |  408343 |
| `docs/screenshots/phone/zoom.png`           |   bin |  411955 |

## src

| Path                           | Lines | Bytes |
| ------------------------------ | ----: | ----: |
| `src/audio.js`                 |   143 |  5031 |
| `src/dom.js`                   |    86 |  2973 |
| `src/format.js`                |    15 |   654 |
| `src/graphics/board-layout.js` |   171 |  3203 |
| `src/graphics/pbr-maps.js`     |    75 |  2784 |
| `src/graphics/pu-scenes.js`    |   743 | 26100 |
| `src/graphics/shaders.js`      |   136 |  4790 |
| `src/graphics/subjects.js`     |  1151 | 39987 |
| `src/graphics/view.js`         |   786 | 23850 |
| `src/isolation.js`             |    25 |  1026 |
| `src/labs/compare.js`          |   244 |  8869 |
| `src/labs/cpu.js`              |   301 | 10659 |
| `src/labs/explore.js`          |   111 |  3662 |
| `src/labs/gpu-run.js`          |   216 |  8048 |
| `src/labs/gpu.js`              |   199 |  7777 |
| `src/labs/hub.js`              |   281 | 11047 |
| `src/labs/litho.js`            |   488 | 17255 |
| `src/labs/memory.js`           |   319 | 11760 |
| `src/labs/npu.js`              |   191 |  6811 |
| `src/labs/specs-view.js`       |   264 |  9409 |
| `src/labs/thermal.js`          |   431 | 15646 |
| `src/labs/transistor.js`       |   625 | 22547 |
| `src/labs/work.js`             |  1591 | 60086 |
| `src/labs/zoom.js`             |   173 |  7471 |
| `src/main.js`                  |    74 |  2478 |
| `src/p5-loader.js`             |   109 |  3154 |
| `src/provenance.js`            |    37 |  1383 |
| `src/quality.js`               |   113 |  3641 |
| `src/ref-card.js`              |    21 |   717 |
| `src/references.js`            |    63 |  2557 |
| `src/routes.js`                |    25 |  1658 |
| `src/shell.js`                 |   298 | 10809 |
| `src/sim/a64.js`               |    91 |  2970 |
| `src/sim/cache-curve.js`       |    34 |  1450 |
| `src/sim/chase.js`             |    86 |  2824 |
| `src/sim/compare-model.js`     |   211 |  6338 |
| `src/sim/constants.js`         |    76 |  2325 |
| `src/sim/device-math.js`       |    97 |  3177 |
| `src/sim/dirac-tunnel.js`      |    82 |  2872 |
| `src/sim/dvs.js`               |    32 |  1165 |
| `src/sim/fft.js`               |    57 |  1600 |
| `src/sim/finfet.js`            |    36 |  1299 |
| `src/sim/kernels.wasm`         |   bin |   301 |
| `src/sim/kernels.wat`          |    63 |  2231 |
| `src/sim/kronig.js`            |    46 |  1449 |
| `src/sim/litho-2d.js`          |   293 |  9682 |
| `src/sim/litho-advanced.js`    |   287 |  9159 |
| `src/sim/lithography.js`       |   109 |  3050 |
| `src/sim/memory-model.js`      |    96 |  3044 |
| `src/sim/ode.js`               |   107 |  3449 |
| `src/sim/pipeline.js`          |    85 |  2808 |
| `src/sim/quant.js`             |   102 |  3035 |
| `src/sim/quantum-lab.js`       |   284 |  8927 |
| `src/sim/rayleigh.js`          |    58 |  1891 |
| `src/sim/schrodinger.js`       |   100 |  3229 |
| `src/sim/stats.js`             |    58 |  1551 |
| `src/sim/stream.js`            |    49 |  1509 |
| `src/sim/taxonomy-walk.js`     |    66 |  1847 |
| `src/sim/tdse.js`              |   247 |  7807 |
| `src/sim/thermal-fdtd.js`      |   310 | 10920 |
| `src/sim/tiler.js`             |    66 |  2514 |
| `src/sim/timing.js`            |    33 |   966 |
| `src/sim/validate-specs.js`    |   128 |  4348 |
| `src/sim/wasm.js`              |    27 |   822 |
| `src/specs.js`                 |   161 |  4881 |
| `src/version.js`               |     2 |    91 |
| `src/viz/hero.js`              |   202 |  7061 |
| `src/workloads/gpt-neo.js`     |   252 |  8245 |
| `src/workloads/safetensors.js` |    80 |  2476 |
| `src/workloads/tokenizer.js`   |   101 |  2935 |

## styles

| Path             | Lines | Bytes |
| ---------------- | ----: | ----: |
| `styles/lab.css` |  1545 | 31924 |

## tests

| Path                        | Lines | Bytes |
| --------------------------- | ----: | ----: |
| `tests/e2e/smoke.spec.js`   |   161 |  6311 |
| `tests/engines.test.mjs`    |   306 | 12959 |
| `tests/rebuild.test.mjs`    |   138 |  5875 |
| `tests/server.test.mjs`     |    66 |  2105 |
| `tests/v1-engines.test.mjs` |   123 |  5067 |
| `tests/v2-engines.test.mjs` |   135 |  6066 |

## tools

| Path                         | Lines | Bytes |
| ---------------------------- | ----: | ----: |
| `tools/pack-tinystories.mjs` |    64 |  2968 |
| `tools/serve.mjs`            |   101 |  3349 |
| `tools/validate-specs.mjs`   |     9 |   312 |

## vendor

| Path                                                            | Lines |    Bytes |
| --------------------------------------------------------------- | ----: | -------: |
| `vendor/fonts/IBM-PLEX-MONO-OFL.txt`                            |    93 |     4363 |
| `vendor/fonts/INTER-OFL.txt`                                    |    93 |     4477 |
| `vendor/fonts/JETBRAINS-MONO-OFL.txt`                           |    93 |     4524 |
| `vendor/fonts/LITERATA-LICENSE`                                 |   bin |     4506 |
| `vendor/fonts/OUTFIT-LICENSE`                                   |   bin |     4387 |
| `vendor/fonts/SOURCE-SANS-3-OFL.txt`                            |    93 |     4486 |
| `vendor/fonts/SPACE-GROTESK-OFL.txt`                            |    93 |     4401 |
| `vendor/fonts/UNBOUNDED-OFL.txt`                                |    93 |     4392 |
| `vendor/fonts/ibm-plex-mono-latin-400-normal.woff2`             |   bin |    14812 |
| `vendor/fonts/inter-greek-wght-normal.woff2`                    |   bin |    18996 |
| `vendor/fonts/inter-latin-ext-wght-normal.woff2`                |   bin |    85068 |
| `vendor/fonts/inter-latin-wght-normal.woff2`                    |   bin |    48256 |
| `vendor/fonts/jetbrains-mono-greek-wght-normal.woff2`           |   bin |     9004 |
| `vendor/fonts/jetbrains-mono-latin-ext-wght-normal.woff2`       |   bin |    15196 |
| `vendor/fonts/jetbrains-mono-latin-wght-normal.woff2`           |   bin |    40404 |
| `vendor/fonts/literata-latin-400-normal.woff2`                  |   bin |    20420 |
| `vendor/fonts/literata-latin-600-normal.woff2`                  |   bin |    21860 |
| `vendor/fonts/literata-latin-700-normal.woff2`                  |   bin |    22004 |
| `vendor/fonts/outfit-latin-400-normal.woff2`                    |   bin |    14032 |
| `vendor/fonts/outfit-latin-500-normal.woff2`                    |   bin |    13528 |
| `vendor/fonts/outfit-latin-600-normal.woff2`                    |   bin |    14140 |
| `vendor/fonts/source-sans-3-latin-400-normal.woff2`             |   bin |    15696 |
| `vendor/fonts/source-sans-3-latin-600-normal.woff2`             |   bin |    15668 |
| `vendor/fonts/source-sans-3-latin-700-normal.woff2`             |   bin |    15596 |
| `vendor/fonts/space-grotesk-latin-ext-wght-normal.woff2`        |   bin |    18940 |
| `vendor/fonts/space-grotesk-latin-wght-normal.woff2`            |   bin |    22288 |
| `vendor/fonts/unbounded-latin-500-normal.woff2`                 |   bin |    20740 |
| `vendor/fonts/unbounded-latin-700-normal.woff2`                 |   bin |    21092 |
| `vendor/glitchling/NOTICE.md`                                   |     7 |      453 |
| `vendor/glitchling/sim.js`                                      |   137 |    16459 |
| `vendor/p5/license.txt`                                         |   458 |    24480 |
| `vendor/p5/p5.min.js`                                           |  1865 |  1066050 |
| `vendor/three/LICENSE`                                          |    21 |     1081 |
| `vendor/three/build/three.core.js`                              | 61162 |  1474799 |
| `vendor/three/build/three.module.js`                            | 19537 |   658900 |
| `vendor/three/build/three.tsl.js`                               | 41903 |  1065544 |
| `vendor/three/build/three.webgpu.js`                            | 53714 |  1350894 |
| `vendor/three/examples/jsm/environments/RoomEnvironment.js`     |   144 |     3606 |
| `vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js`    |   155 |     4625 |
| `vendor/three/examples/jsm/math/SimplexNoise.js`                |   444 |    14351 |
| `vendor/three/examples/jsm/postprocessing/EffectComposer.js`    |   231 |     4651 |
| `vendor/three/examples/jsm/postprocessing/MaskPass.js`          |   104 |     2231 |
| `vendor/three/examples/jsm/postprocessing/OutputPass.js`        |    97 |     2524 |
| `vendor/three/examples/jsm/postprocessing/Pass.js`              |    95 |     1706 |
| `vendor/three/examples/jsm/postprocessing/RenderPass.js`        |    99 |     1941 |
| `vendor/three/examples/jsm/postprocessing/SAOPass.js`           |   407 |    13105 |
| `vendor/three/examples/jsm/postprocessing/SMAAPass.js`          |   230 |    50379 |
| `vendor/three/examples/jsm/postprocessing/SSAOPass.js`          |   414 |    11116 |
| `vendor/three/examples/jsm/postprocessing/ShaderPass.js`        |    77 |     1576 |
| `vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js`   |   415 |    12410 |
| `vendor/three/examples/jsm/shaders/CopyShader.js`               |    45 |      571 |
| `vendor/three/examples/jsm/shaders/DepthLimitedBlurShader.js`   |   183 |     4187 |
| `vendor/three/examples/jsm/shaders/LuminosityHighPassShader.js` |    64 |     1147 |
| `vendor/three/examples/jsm/shaders/OutputShader.js`             |    85 |     1490 |
| `vendor/three/examples/jsm/shaders/SAOShader.js`                |   201 |     5313 |
| `vendor/three/examples/jsm/shaders/SMAAShader.js`               |   489 |    15002 |
| `vendor/three/examples/jsm/shaders/SSAOShader.js`               |   300 |     6478 |
| `vendor/three/examples/jsm/tsl/display/BloomNode.js`            |   599 |    17230 |
| `vendor/three/examples/jsm/tsl/display/DepthOfFieldNode.js`     |   572 |    15329 |
| `vendor/three/examples/jsm/tsl/display/GTAONode.js`             |   727 |    21926 |
| `vendor/three/examples/jsm/tsl/display/GaussianBlurNode.js`     |   412 |    11001 |
| `vendor/three/examples/jsm/tsl/display/SMAANode.js`             |   729 |    66454 |
| `vendor/tinystories/NOTICE.md`                                  |     8 |      628 |
| `vendor/tinystories/SHA256.txt`                                 |     1 |       88 |
| `vendor/tinystories/merges.txt`                                 | 50001 |   456318 |
| `vendor/tinystories/model.f16.safetensors`                      |   bin | 39417097 |
| `vendor/tinystories/vocab.json`                                 |     1 |   798156 |

254 files. Text-file line total 261990.
