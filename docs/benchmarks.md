# Performance Benchmarks & Latency Budgets (`docs/benchmarks.md`)

Build Standard v1.2.0 **B26**, **B27**, and **A37** reproducible performance tracking for `xiaomi-17t-pro-lab` (v3.1.0).

## 1. Benchmark Methodology

- Harness: `node scripts/bench.mjs` (`results/perf-benchmarks.json`).
- Each solver executes a cold warmup pass followed by 15–40 timed iterations via `performance.now()`.
- Reported statistics: **median**, **IQR (`p75 - p25`)**, **p95**, and **hard frame-budget target** (aligned to 60–144 Hz interactive frame budgets).

## 2. Measured Baseline (`v3.1.0`, Windows x64, Node 22)

| Solver Benchmark                   | Iterations | Median (ms) | IQR (ms) | p95 (ms) | Hard Budget (ms) | Status   |
| :--------------------------------- | ---------: | ----------: | -------: | -------: | ---------------: | :------- |
| `bragg_40pair_81pt_spectrum`       |         25 |       1.434 |    1.321 |    3.216 |             15.0 | **PASS** |
| `litho_2d_64x64_annular_opc`       |         20 |       1.916 |    0.727 |    3.808 |             40.0 | **PASS** |
| `stochastic_resist_48x256`         |         20 |       1.658 |    1.766 |    3.151 |             20.0 | **PASS** |
| `tdse_crank_nicolson_50steps_n240` |         30 |       0.254 |    0.756 |    6.806 |             15.0 | **PASS** |
| `thermal_fdtd_44x52_frame_80ms`    |         30 |       0.912 |    1.969 |    6.130 |             15.0 | **PASS** |
| `schrodinger_jacobi_n48`           |         15 |       2.640 |    2.015 |   15.231 |             25.0 | **PASS** |
| `quant_int8_matmul_64x64`          |         40 |       0.298 |    0.226 |    0.975 |             10.0 | **PASS** |
| `fp64_matmul_64x64`                |         40 |       0.303 |    0.123 |    0.772 |             10.0 | **PASS** |
| `chsh_and_mermin3_2000shots`       |         25 |       0.517 |    0.445 |    2.006 |             15.0 | **PASS** |

## 3. Honest Caveats (B27)

- Small-iteration JIT warm-up and OS scheduling jitter explain p95 tails (`~3–15 ms`); CI tracks these report-only rather than gating merges.
- Browser render times depend heavily on GPU hardware (real Mali-G1 Ultra MC12 vs. SwiftShader software WebGL in CI).
- TinyStories-8M cold load (`~10 s` to parse 39.4 MB FP16 → Float32 on Node CPU) is tracked separately in `docs/ai.md` and `results/tinystories-eval.json`.
