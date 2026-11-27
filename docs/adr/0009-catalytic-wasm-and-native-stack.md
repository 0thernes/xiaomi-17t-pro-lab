# ADR 0009 — Catalytic Zero-Allocation Arena, Rust WASM SIMD128 & Honest Native-Stack Evaluation

- **Status:** Accepted (`v4.0.0`)
- **Date:** 2026-11-26
- **Deciders:** Alexander Stephen Donahue (`0thernes`)

## Context

In `v3.1.0`, live laptop sessions on `https://0thernes.github.io/xiaomi-17t-pro-lab/` exhibited high CPU/GPU heat and slow startup on heavy tabs:

1. **FP16 Allocation Storm (`src/workloads/safetensors.js`):** `halfToFloat()` allocated `new Uint32Array(1)` + `new Float32Array(u32.buffer)` per FP16 weight — **39.4 million heap allocations** to load the 39.4 MB TinyStories-8M checkpoint (`9,654.84 ms`).
2. **Scalar JS Transformer Decode (`src/workloads/gpt-neo.js`):** Allocated 140+ `Float32Array` scratch/KV buffers per token and ran `50,257 × 256` scalar JS loops with duplicate `Math.exp()` passes (`32.7–34.8 ms/token`).
3. **Unthrottled 3D/2D Loops (`src/graphics/view.js`, `src/p5-loader.js`, `src/labs/thermal.js`, `src/labs/litho.js`, `src/labs/work.js`):** Continuous 4-pass WebGL2 `EffectComposer` + `2048×2048` `PCFSoftShadowMap` rebuilds on every frame even when stationary, scrolled offscreen, or in background tabs, alongside `2,288–12,288` per-frame `p.rect()` canvas calls.

We evaluated our sibling research repositories (`0thernes/catalytic-register-frontiers`, `0thernes/eshkol`, `0thernes/moonlab`, `0thernes/quantum_geometric_tensor`, `0thernes/quantum_rng`) and compiled toolchains (`Rust`, `Zig`, `C`, `C++`, `Assembly`, `WebAssembly SIMD128`) under a strict **zero-degradation, zero-larping** mandate.

## Decision & Honest Technology Matrix

| Technology / Sibling Repo | Role in `xiaomi-17t-pro-lab` v4.0.0 | Honest Scope & Boundary |
| --- | --- | --- |
| **Catalytic Computing (`0thernes/catalytic-register-frontiers`)** | **Directly integrated (`src/sim/catalytic-arena.js`, `native/xiaomi-kernels/`, `lean/XiaomiLabProofs/CatalyticArena.lean`).** Pre-allocated zero-GC linear-memory scratch arena (`mark`/`rewind`) + SIMD128 reversible Catalytic Byte-Vault (`catalyticBorrowXor` & modular shear `catalyticBorrowShear` over $\mathbb{Z}/m\mathbb{Z}$) with exact bit-restoration proof. | Static arena reuse solves real browser GC churn; Byte-Vault XOR & modular shear implement exact passive reversibility matching `catalytic-register-frontiers` without claiming arbitrary floating-point IEEE-754 reversibility. |
| **Rust (`rustc 1.94.1`) → WebAssembly SIMD128 (`wasm32-unknown-unknown`)** | **Directly integrated (`native/xiaomi-kernels/` → `src/sim/fast-kernels.wasm`, 9,667 bytes, `#![no_std]`, zero crates).** Compiles `f32x4` SIMD128 transformer matvec/argmax/logits, multi-step `f64` 2D thermal FDTD, unitary Crank–Nicolson TDSE, fused 2D Radix-2 FFT, `int8_matmul_simd`, and `v128_xor` Catalytic Byte-Vault. | Portable WASM SIMD128 JIT-compiles to host AVX2/NEON inside the browser sandbox while keeping static GitHub Pages + strict CSP intact. Runs on host CPU threads — **never** on MediaTek NPU 990 or Arm SME2. |
| **Zig (`0.17.0`) / C (`gcc`) / C++ (`g++`) / Assembly (`nasm`)** | **Evaluated; Rust selected as single reproducible WASM SIMD128 toolchain.** Zig `wasm32-freestanding` can also target WASM SIMD128, but maintaining one `#![no_std]` Rust crate avoids dual-toolchain drift across Windows/macOS/Linux CI. | Browsers **cannot** execute raw native x86-64/ARM64 assembly or host C/C++ shared libraries due to the Web sandbox; WebAssembly SIMD128 is the sanctioned near-native browser ISA. |
| **Eshkol (`0thernes/eshkol`)** | **Not embedded in browser bundle.** | C++ LISP-like scientific language targeting native LLVM binaries (not installed on browser clients or static GitHub Pages without a separate Emscripten/WASM runtime port). |
| **Moonlab (`0thernes/moonlab`)** | **Not embedded in browser bundle.** | Native C 32-qubit statevector simulator (64 GB RAM at 32 qubits) + ML-KEM PQC. Our browser `#/work/sci` runs exact 1–4 qubit states (16 complex amplitudes, `< 0.5 ms`), so a 32-qubit native C engine adds zero benefit in static browser tabs. |
| **QGTL (`0thernes/quantum_geometric_tensor`)** | **Exact 1-qubit closed-form subset added (`fubiniStudyMetric1Qubit` in `src/sim/quantum-lab.js`).** | Computes exact CP¹ Fubini–Study metric $g_{\theta\theta}=1/4$, $g_{\phi\phi}=\frac{1}{4}\sin^2\theta$, and Berry curvature $\Omega_{\theta\phi}=-\frac{1}{2}\sin\theta$. Explicitly distinguished from full native C multi-parameter projective-manifold QGTL. |
| **QRNG (`0thernes/quantum_rng`)** | **NIST SP 800-90B RCT + APT health tests added (`nistSp80090bHealthTest` in `src/sim/quantum-lab.js`).** | Verifies statistical stream health of browser PRNG/CSPRNG Born-rule measurement samples. **Never** claims physical quantum hardware entropy in a web browser. |

## Zero-Degradation Rendering Architecture

- `src/graphics/view.js`: Added `document.visibilitychange` + `IntersectionObserver` pause, demand-driven idle sleep (`0` renders/sec when settled), `shadowMap.autoUpdate = false` with dirty-triggered re-bakes, cached `uTime` material lists (no per-frame `root.traverse`), and smooth 60 Hz frame pacing on high-refresh-rate displays (with `{ uncapped: true }` preserved exclusively for the `#/work/game` 144 Hz PBR Stress Arena).
- `src/p5-loader.js` & `src/labs/work.js`: Automatic `visibilitychange` + `IntersectionObserver` pause on all animated `loop: true` sketches and the Glitchling A-Life canvas.
- `src/labs/thermal.js`, `src/labs/litho.js`, `src/labs/work.js`: Replaced `2,288` (2D FLIR), `12,288` (EUV resist), and `1,056` (GigaChad pheromone) per-frame `p.rect()` calls with single GPU `drawImage()` blits from reusable `ImageData` offscreen canvases + precomputed 256-entry Ironbow LUT.

## Consequences

- **Measured Speedups (identical numerical outputs, zero visual degradation):**
  - TinyStories-8M FP16 checkpoint load: `9,654.84 ms → 213.03 ms` (**45.3× faster**).
  - TinyStories-8M greedy decode: `32.71–34.76 ms/tok → 6.95–11.52 ms/tok` (**~4.5× faster**, 100% identical tokens across all 5 prompts).
  - Crank–Nicolson 1D TDSE (50 steps): `0.344 ms → 0.106 ms` (**3.25× faster**).
  - INT8 64×64 quantized matmul: `0.282 ms → 0.115 ms` (**2.45× faster**).
  - Idle 3D viewport GPU renders: drops from continuous 60–240 FPS burn to **0 frames/sec** when stationary, hidden, or scrolled offscreen.
- **Reproducibility:** `native/xiaomi-kernels/build.mjs` + CI verify `src/sim/fast-kernels.wasm` builds cleanly from source on `wasm32-unknown-unknown` with `cargo test` passing natively.
