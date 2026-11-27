# Architecture

`v4.0.0` preserves the zero-build static ES-module layout for GitHub Pages while adding a `#![no_std]` Rust WebAssembly SIMD128 kernel module (`src/sim/fast-kernels.wasm`, 9.4 KiB), a reusable Catalytic Zero-Allocation Linear Arena (`src/sim/catalytic-arena.js`), and demand-driven zero-degradation 3D/2D rendering (`src/graphics/view.js`, `src/p5-loader.js`). Hardware numbers come from `src/specs.js`, which reads `data/specs.json`. Workloads live in `src/labs/work.js` and `src/workloads/`. See [ADR 0006](adr/0006-one-subject.md), [ADR 0008](adr/0008-sharded-weights-and-lean4.md), and [ADR 0009](adr/0009-catalytic-wasm-and-native-stack.md).

Zero-build. `index.html` loads `src/main.js` as a module. An import map points `three` at `vendor/three/build/three.module.js`. `p5` is injected as a classic script the first time a plot needs it, and `fast-kernels.wasm` preloads once at boot with transparent JS fallback.

```
index.html
coi-serviceworker.js          opt-in COOP/COEP for GitHub Pages
data/specs.json               cited hardware leaves
data/taxonomy.json            zoom stacks
native/xiaomi-kernels/        #![no_std] Rust SIMD128 source -> src/sim/fast-kernels.wasm
src/main.js                   hash router + parallel capability & WASM preload
src/shell.js                  header, nav, sound, help
src/quality.js                tier from a fill probe, not from width
src/graphics/view.js          demand-driven WebGL2 EffectComposer + visibility/offscreen pause
src/labs/*.js                 views
src/sim/*.js                  pure numerical & catalytic arena solvers, unit-tested in Node
src/sim/fast-kernels.wasm     compiled Rust SIMD128 kernels (f32x4, f64, i8, v128_xor)
src/sim/kernels.wasm          legacy WAT SIMD microbenchmark (f32x4 adds & int8_dot)
vendor/                       three.js, p5.js, TinyStories-8M (9 shards), OFL fonts
```

## Routing

Hashes, so GitHub Pages needs no rewrite rules.

| Hash                                 | Module         |
| ------------------------------------ | -------------- |
| `#/`                                 | `labs/hub.js`  |
| `#/zoom/...`                         | `labs/zoom.js` |
| `#/cpu` `#/gpu` `#/npu`              | matching lab   |
| `#/memory` `#/thermal`               | matching lab   |
| `#/litho` `#/transistor` `#/compare` | matching lab   |
| `#/work/...` `#/specs`               | matching lab   |

Leaving a route calls `dispose()`. Each view releases its WebGL context, disconnects `ResizeObserver` / `IntersectionObserver` / `visibilitychange` listeners, and cancels all `requestAnimationFrame` handles.

## Subpath

Asset URLs are relative (`./src/main.js`, `../data/specs.json` from a module). The dev server also strips a `/xiaomi-17t-pro-lab` prefix so the Pages path can be tested locally. `.nojekyll` stops Jekyll from ignoring files that start with `_`.

## What is not loaded up front

`three.js`, `p5.js`, TinyStories-8M weight shards, and every lab module are dynamic imports. The hub does not construct the lithography FFT. The CPU page does not construct the phone.

## Server

`tools/serve.mjs` is a loopback static server. `resolveSafe` uses `path.relative` so a sibling directory that shares the root's string prefix cannot be read. It sets COOP `same-origin` and COEP `require-corp`.
