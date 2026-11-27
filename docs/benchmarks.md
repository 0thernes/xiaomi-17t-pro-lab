# Performance Benchmarks & Before/After Speedup Audit (`docs/benchmarks.md`)

Build Standard v1.2.0 **B26**, **B27**, and **A37** reproducible performance tracking for `xiaomi-17t-pro-lab` (**v4.0.0**), recording authentic **BEFORE (`v3.1.0`) vs. AFTER (`v4.0.0`)** measurements under identical inputs on the same Windows x64 host (Node.js v25.8.2) with **zero visual, shader, resolution, or numerical degradation**.

## 1. Benchmark Methodology

- Solver harness: `node scripts/bench.mjs` (`results/perf-benchmarks.json`). Each solver executes a cold warmup pass followed by 15–40 timed iterations via `performance.now()`.
- LLM harness: `node evals/run_tinystories_eval.mjs` (`results/tinystories-eval.json`), reassembling all 9 SHA-256-verified shards (`39,417,097` bytes) and decoding 5 canonical prompts (8 greedy tokens each + exact 50,257-token full-vocabulary Shannon entropy).
- Browser idle-GPU harness: Playwright E2E Spec #10 (`tests/e2e/smoke.spec.js`) measuring `canvas.dataset.renders` on `/?tier=high&pose=front#/` over an 800 ms idle window after initial 12-frame `EffectComposer` health check.

## 2. Measured Before (`v3.1.0`) vs. After (`v4.0.0`) Speedups

| Workload / Solver Benchmark | `v3.1.0` Before (JS) | `v4.0.0` After (Catalytic + Rust WASM SIMD128) | Measured Speedup | Accuracy / Fidelity Check |
| :-------------------------- | -------------------: | ---------------------------------------------: | ---------------: | :------------------------ |
| **TinyStories-8M FP16 Load & Parse** (`19.7M` weights) | `9,654.84 ms` | **`213.03 ms`** | **`45.3×`** | 65,536/65,536 bit-exact FP16 LUT = Rust WASM (fixed subnormal off-by-one) |
| **TinyStories-8M Greedy Decode** (`classic_story`, `small_dog`) | `32.71–34.76 ms/tok` | **`6.95–7.69 ms/tok`** | **`4.5×–4.7×`** | 40/40 identical tokens across all 5 prompts; entropy matches to `1e-6` bits |
| `tdse_crank_nicolson_50steps_n240` | `0.344 ms` | **`0.103 ms`** | **`3.34×`** | WASM vs JS max abs err `< 1e-13`; unitary norm err `< 1e-10` |
| `quant_int8_matmul_64x64` | `0.282 ms` | **`0.126 ms`** | **`2.24×`** | WASM SIMD128 vs JS max abs err `< 1e-12` |
| `thermal_fdtd_44x52_frame_80ms` | `0.419 ms` (`IQR 0.930`) | **`0.320 ms`** (`IQR 0.046`) | **`1.31×`** (**20× tighter IQR**) | WASM vs JS max abs err `< 1e-11 °C` |
| `catalytic_xor_64kib_simd128` (new) | — | **`0.017 ms`** (~3.8 GB/s) | New kernel | Bit-exact SHA-256 restoration (`Lean Thm 10`) |
| `fp16_lut_decode_262k_weights` (new) | — | **`0.536 ms`** (~489M wt/s) | New kernel | Exhaustive 65,536/65,536 IEEE-754 parity |
| **Idle 3D WebGL2 Viewport** (`/?tier=high&pose=front#/`) | Continuous `60–240 FPS` | **`0 renders / 800 ms`** (`sleeping`) | **100% idle GPU elimination** | Same HDR Bloom, SMAA, `2048×2048` shadows; Playwright `brightest > 12` |
| **2D FLIR Thermal Canvas** (`#/thermal`) | `2,288` `p.rect()` + `270` `p.line()` / frame | **`2` `drawImage()` blits / frame** | **>1,000× fewer draw calls** | Identical Ironbow LUT colors + Kurnal overlays |
| **2D EUV Resist Plot** (`#/litho`) | `12,288` `p.rect()` / drag | **`1` `drawImage()` blit / drag** | **12,288× fewer draw calls** | Bit-identical binary resist image |

## 3. Full `v4.0.0` Solver Latency Budget Table (`results/perf-benchmarks.json`)

| Solver Benchmark                   | Iterations | Median (ms) | IQR (ms) | p95 (ms) | Hard Budget (ms) | Status   |
| :--------------------------------- | ---------: | ----------: | -------: | -------: | ---------------: | :------- |
| `bragg_40pair_81pt_spectrum`       |         25 |       0.372 |    1.071 |    2.083 |             15.0 | **PASS** |
| `litho_2d_64x64_annular_opc`       |         20 |       2.574 |    1.936 |    5.764 |             40.0 | **PASS** |
| `stochastic_resist_48x256`         |         20 |       1.357 |    2.236 |    5.248 |             20.0 | **PASS** |
| `tdse_crank_nicolson_50steps_n240` |         30 |       0.103 |    0.072 |    2.536 |             15.0 | **PASS** |
| `thermal_fdtd_44x52_frame_80ms`    |         30 |       0.320 |    0.046 |    2.574 |             15.0 | **PASS** |
| `schrodinger_jacobi_n48`           |         15 |       2.761 |    2.905 |   17.243 |             25.0 | **PASS** |
| `quant_int8_matmul_64x64`          |         40 |       0.126 |    0.188 |    1.354 |             10.0 | **PASS** |
| `fp64_matmul_64x64`                |         40 |       0.280 |    0.172 |    1.584 |             10.0 | **PASS** |
| `chsh_and_mermin3_2000shots`       |         25 |       0.445 |    0.263 |    3.046 |             15.0 | **PASS** |
| `catalytic_xor_64kib_simd128`      |         40 |       0.017 |    0.003 |    0.081 |              5.0 | **PASS** |
| `fp16_lut_decode_262k_weights`     |         25 |       0.536 |    0.346 |    1.709 |             15.0 | **PASS** |

## 4. Honest Caveats (B27)

- All Rust WASM SIMD128 benchmarks execute on the host CPU thread via V8 TurboFan JIT (`wasm32` + `simd128` → host AVX2/NEON) — **never** on the MediaTek NPU 990 or Arm SME2 unit.
- Small-iteration OS scheduling jitter explains p95 tails (`1–17 ms`); under heavy concurrent CPU load (e.g., running full unit tests simultaneously), TinyStories load rises from `213 ms` (isolated) to `~530 ms`, still `18×–45×` faster than `v3.1.0`.
- For `litho_2d_64x64_annular_opc`, JS↔WASM array transfer of nine `64×64` complex grids makes fused WASM roughly comparable to V8 JIT (`1.5–2.5 ms`, well under the `40 ms` frame budget); the primary speedup on `#/litho` is replacing `12,288` resist `p.rect()` calls with 1 GPU blit.
