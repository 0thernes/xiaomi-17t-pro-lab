# Architecture

Zero-build. `index.html` loads `src/main.js` as a module. An import map points `three` at `vendor/three/build/three.module.js`. p5 is injected as a classic script the first time a plot needs it.

```
index.html
coi-serviceworker.js          opt-in COOP/COEP for GitHub Pages
data/specs.json               cited hardware leaves
data/taxonomy.json            zoom stacks
src/main.js                   hash router, one route module at a time
src/shell.js                  header, nav, sound, help
src/quality.js                tier from a fill probe, not from width
src/labs/*.js                 views
src/viz/hero.js               three.js phone, imported only by the hub
src/sim/*.js                  pure functions, unit-tested in Node
src/sim/kernels.wasm          SIMD adds and an int8 dot
vendor/                       three r170, p5 1.11.3, OFL fonts
```

## Routing

Hashes, so GitHub Pages needs no rewrite rules.

| Hash                                 | Module         |
| ------------------------------------ | -------------- |
| `#/`                                 | `labs/hub.js`  |
| `#/zoom/...`                         | `labs/zoom.js` |
| `#/cpu` `#/gpu` `#/npu`              | matching lab   |
| `#/litho` `#/transistor` `#/compare` | matching lab   |

Leaving a route calls `dispose()`. The hero releases its WebGL context. The next route’s module is imported then, not at startup.

Zoom URLs look like `#/zoom/cpu/cpu_l10_cache/structure` or `#/zoom/device/soc/soc_cpu/materials`.

## Subpath

Asset URLs are relative (`./src/main.js`, `../data/specs.json` from a module). The dev server also strips a `/xiaomi-17t-pro-lab` prefix so the Pages path can be tested locally. `.nojekyll` stops Jekyll from ignoring files that start with `_`.

## What is not loaded up front

three.js, p5, the WASM kernel, and every lab module are dynamic imports. The hub does not construct the lithography FFT. The CPU page does not construct the phone.

## Server

`tools/serve.mjs` is a loopback static server. `resolveSafe` uses `path.relative` so a sibling directory that shares the root’s string prefix cannot be read. It sets COOP `same-origin` and COEP `require-corp`.
