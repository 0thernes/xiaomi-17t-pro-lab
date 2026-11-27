# Xiaomi 17T Pro Lab (v4.0.0)

[![CI](https://github.com/0thernes/xiaomi-17t-pro-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/0thernes/xiaomi-17t-pro-lab/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-4.0.0-38d4f2)](CHANGELOG.md)
[![Lean 4.35.0](https://img.shields.io/badge/Lean%204.35.0-90%20constructive%20decls%20%C2%B7%200%20Choice%20%C2%B7%206%20kernel%20checks-4ade80)](lean/VerifyAxioms.lean)
[![Oracle](https://img.shields.io/badge/60--digit%20oracle-60%2F60%20pass-0b6bcb)](reference/physics_oracle.py)
[![WASM SIMD128](https://img.shields.io/badge/Rust%20WASM%20SIMD128-9.4%20KiB%20no__std-ff6900)](native/xiaomi-kernels/src/lib.rs)
[![License](https://img.shields.io/badge/license-MIT%20%2B%20CC--BY--4.0-a78bfa)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-2ea043)](ROADMAP.md)
[![Pages](https://img.shields.io/badge/demo-GitHub%20Pages-ff6900)](https://0thernes.github.io/xiaomi-17t-pro-lab/)

Interactive silicon-to-quantum hardware workbench with a **Catalytic Zero-Allocation Arena**, **9.4 KiB `#![no_std]` Rust WebAssembly SIMD128 kernels**, **zero-degradation demand-driven 3D/2D rendering**, independent **60-digit differential physics oracle**, a **90-declaration constructive Lean 4.35.0 invariant suite** for the workbench's mathematical models, and an **AMS-LaTeX white paper** for the **Xiaomi 17T Pro** (`2602EPTC0G`, codename `warhol`) and **MediaTek Dimensity 9500** (`MT6993Z`, TSMC N3P, `140.57 mm²`).

The Lean suite proves integer invariants of the formulas the workbench uses and checks arithmetic on cited constants. It does not formally verify the device, the browser simulators, or their floating-point arithmetic, and it retires no open problem.

![Xiaomi 17T Pro Lab Social Preview](docs/media/social-preview.png)

- **Live Interactive Workbench:** <https://0thernes.github.io/xiaomi-17t-pro-lab/>
- **Interactive Lean 4.35.0 Proof Blueprint:** <https://0thernes.github.io/xiaomi-17t-pro-lab/blueprint/>
- **Frozen AMS-LaTeX White Paper (Preprint, CC-BY-4.0):** [Donahue_2026_Xiaomi_17T_Pro_Lab.pdf](dist/Donahue_2026_Xiaomi_17T_Pro_Lab.pdf)
- **Permanent Software Heritage Snapshot:** [`swh:1:snp:06ad26ff598cf7d592768bdef08d9de7616cd4e0`](https://archive.softwareheritage.org/swh:1:snp:06ad26ff598cf7d592768bdef08d9de7616cd4e0/) (v4.0.0 archival submission queued via Save Code Now)
- **Author:** Alexander Stephen Donahue ([ORCID 0009-0006-8168-9648](https://orcid.org/0009-0006-8168-9648)), Independent Researcher, Spokane, WA, USA (`0_0@0thernes.art`)
- **Status:** active

---

## v4.0.0 Catalytic & Rust WASM SIMD128 Performance Architecture (Zero Visual Loss)

Release `v4.0.0` eliminates the laptop CPU/GPU heat and startup stalls of `v3.1.0` with **zero visual, shader, resolution, or numerical degradation** (see [ADR 0009](docs/adr/0009-catalytic-wasm-and-native-stack.md) and [docs/benchmarks.md](docs/benchmarks.md)):

- **45.3× Faster TinyStories-8M FP16 Checkpoint Load (`9,654.84 ms → 213.03 ms`):** Replaced 39.4 million per-weight TypedArray allocations in `src/workloads/safetensors.js` with a precomputed 65,536-entry IEEE-754 binary16 → binary32 LUT (fixing a pre-existing subnormal off-by-one bug verified across all 65,536/65,536 bit patterns against Rust WASM).
- **~4.5× Faster TinyStories-8M Decode (`32.7–34.8 ms/tok → 6.95–11.52 ms/tok`, 100% identical tokens):** Pre-allocated Catalytic Scratch Arena (`src/sim/catalytic-arena.js`), flat KV-cache slabs, single-pass softmax `exp`, and `#![no_std]` Rust WASM SIMD128 `f32x4` `matvec_f32_simd` / `argmax_matvec_f32_simd` (`src/sim/fast-kernels.wasm`, `9,667` bytes).
- **3.3× Faster Crank–Nicolson TDSE (`0.344 ms → 0.103 ms`), 2.2× Faster INT8 Matmul (`0.282 ms → 0.126 ms`), & `0.017 ms` 64 KiB SIMD128 Catalytic Byte-Vault XOR Borrow/Restore** (`v128_xor` + modular $\mathbb{Z}/m\mathbb{Z}$ shear from `0thernes/catalytic-register-frontiers`).
- **0% Idle GPU/CPU Burn:** `src/graphics/view.js` & `src/p5-loader.js` now pause automatically on `document.visibilitychange` and offscreen `IntersectionObserver`, sleep at **0 renders/sec** when settled (verified live by Playwright E2E Spec #10), disable static `2048×2048` shadow-map rebuilds on orbiting cameras, cache `uTime` shaders, and replace `2,288–12,288` per-frame `p.rect()` draw calls in FLIR/resist/swarm plots with single GPU `drawImage()` blits.

## Quickstart

Node.js `>= 22` is required (zero build step for the web app; optional Rust `wasm32-unknown-unknown`, Python `>= 3.12`, Lean `4.35.0`, and Tectonic for full kernel, formal & manuscript reproduction).

```bash
git clone https://github.com/0thernes/xiaomi-17t-pro-lab.git
cd xiaomi-17t-pro-lab
npm ci
npm start            # Launches loopback server at http://127.0.0.1:47321/ (with strict CSP & COOP/COEP)
```

Verify the full suite from a clean clone:

```bash
npm run verify:all                                   # Specs schema + 60 Node tests + 10/10 mutants + 3 examples
python reference/physics_oracle.py --check-checksums # 60 differential checks at 60-digit precision + SHA-256 manifests
npm run evals                                        # 9-shard TinyStories-8M WebCrypto/Node SHA-256 + greedy regression
npm run test:smoke                                   # Playwright 19-route phone/desktop/blueprint/idle-GPU E2E smoke
```

## 5-Second Lean 4.35.0 Kernel Verification

```bash
cd lean
lake build XiaomiLabProofs Challenge Solution
lake env lean VerifyAxioms.lean
lake env leanchecker --fresh XiaomiLabProofs
lake env leanchecker --fresh Solution
# On Linux with bubblewrap (automated in CI across all 6 kernels):
lake comparator --config comparator.json --paranoid
```

All **90 audited declarations** (79 exported theorems across 8 modules including `CatalyticArena.lean` + 11 isolated comparator targets; 33 zero-axiom) compile cleanly with zero Mathlib, zero `sorry` (outside statement-only `Challenge.lean`), zero `native_decide`, and **zero `Classical.choice`** — strictly within `[propext, Quot.sound]`. All 90 declarations are kernel-checked by Lean (`lake build`, `leanchecker`). In CI, the 11 comparator targets and their dependency closure are also checked by 6 kernel checks (Lean default and paranoid mode, lean4lean, nanoda, con-leche, con-ron); Lean default and paranoid are one implementation, so these are 5 distinct kernels. Paired with 4 live negative kernel & comparator rejection tests (`scripts/test_negative_lean.py`). See [docs/statement-fidelity.md](docs/statement-fidelity.md), [docs/literature-search-log.md](docs/literature-search-log.md), and [formalization.yaml](formalization.yaml).

### Verbatim Headline Comparator `#print axioms` Output (CI Drift-Checked)

<!-- LEAN_AXIOMS_START -->

```text
'XiaomiLab.ComparatorTarget.target_thm1_hardware_and_roofline' depends on axioms: [propext, Quot.sound]
'XiaomiLab.ComparatorTarget.target_thm2_euv_rayleigh_and_dof' depends on axioms: [propext, Quot.sound]
'XiaomiLab.ComparatorTarget.target_thm3_dirac_finfet_and_crank_nicolson' depends on axioms: [propext, Quot.sound]
'XiaomiLab.ComparatorTarget.target_thm4_fdtd_cfl_maximum_principle' depends on axioms: [propext, Quot.sound]
'XiaomiLab.ComparatorTarget.target_thm5_chsh_and_mermin3_classical_caps' does not depend on any axioms
'XiaomiLab.ComparatorTarget.target_thm6_peres_mermin_magic_square' depends on axioms: [propext, Quot.sound]
'XiaomiLab.ComparatorTarget.target_thm7_bloch_purity_bounds' depends on axioms: [propext, Quot.sound]
'XiaomiLab.ComparatorTarget.target_thm8_adversarial_refutations' does not depend on any axioms
'XiaomiLab.ComparatorTarget.target_thm9_bragg_parseval_and_shards' depends on axioms: [propext, Quot.sound]
'XiaomiLab.ComparatorTarget.target_thm10_catalytic_arena_and_simd' depends on axioms: [propext, Quot.sound]
'XiaomiLab.ComparatorTarget.target_nonvacuity_witnesses' does not depend on any axioms
```

<!-- LEAN_AXIOMS_END -->

## Usage

### Interactive Browser Labs (`10⁻¹ m → 10⁻¹⁵ m`)

Press **`Ctrl+K`** anywhere to jump to any lab, physics solver, live workload, or FCC component. Hover any 3D part to inspect provenance-badged specs; click to focus (`R` resets framing).

| Route                           | Scale          | Live Real-Time Computation                                                                                                                                                                                                    |
| :------------------------------ | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phone** (`#/`)                | `10⁻¹ m`       | Interactive 3D Xiaomi 17T Pro with PBR microfacet maps, HyperOS 3 telemetry OLED, Leica triple optics, 7-layer FCC teardown, demand-driven idle GPU sleep, raycast inspector                                                  |
| **Zoom** (`#/zoom`)             | `10⁻¹→10⁻¹⁵ m` | 8-rung Powers-of-Ten descent: Phone → PCB → MT6993Z PoP → `140.57 mm²` Die → C1-Ultra → FinFET → Si Crystal → Quantum Tunnel / Dirac                                                                                          |
| **CPU** (`#/cpu`)               | `28.75 mm²`    | 15-level taxonomy, live Sattolo pointer-chase latency curve, WASM SIMD `f32x4`, COOP/COEP timer isolation, ARMv9.3-A decoder                                                                                                  |
| **GPU** (`#/gpu`)               | `24.23 mm²`    | 16-level Mali-G1 Ultra MC12 + RTUv2 stack, checked WebGPU/WebGL2 matmul vs Float64 reference, interactive TBDR tile-binner                                                                                                    |
| **NPU 990** (`#/npu`)           | `12.60 mm²`    | 14-level 4× MDLA + 2× MVPU + CIM stack, live FP64 vs INT8 (Rust WASM SIMD128) vs BitNet 1.58-bit error heatmaps (labeled CPU WASM/JS, not NPU dispatch)                                                                       |
| **RAM & UFS** (`#/memory`)      | `76.8 GB/s`    | MT6993Z + SK hynix `H58GG6AV9H` PoP, live STREAM Triad + 16 MB copy, CS Roofline plot, LLM memory-wall & UFS 4.1 load calculator                                                                                              |
| **Thermal PDE** (`#/thermal`)   | `5,500 mm²`    | Live Rust WASM 2D explicit FDTD heat PDE with CFL sub-stepping & smooth closed-loop DVFS (`<= 0.5 s`), FLIR Ironbow shader + single-blit 2D canvas, 20-minute exact clock (`1,200 s`)                                         |
| **EUV Litho** (`#/litho`)       | `13.5 nm`      | Fused WASM 2D Fourier partial-coherence EUV simulator (`6T SRAM`, `L-Bend`, `Via0`, `48 nm Lines`) + OPC serifs, 40-pair Mo/Si Bragg transfer matrix (`74.32%`), sub-pixel Poisson shot-noise LER                              |
| **Atom & QED** (`#/transistor`) | `10⁻⁸→10⁻¹⁵ m` | Rust WASM unitary Crank–Nicolson TDSE (`norm err < 1e-8`), N3P FinFET double-gate $\lambda$, Kronig–Penney bands, Varshni $n_i(T)$, Dirac dispersion                                                                          |
| **Workloads** (`#/work/*`)      | `Live Run`     | 6K uncapped PBR stress arena, Rust WASM SIMD128 + Catalytic Arena TinyStories-8M GPT-Neo with Neuralese hooks, 272-neuron Glitchling A-Life, Bloch/CHSH/Mermin-3/Peres–Mermin/Fubini–Study/NIST SP 800-90B quantum composer   |
| **Versus** (`#/compare`)        | `3-Way`        | Normalized multi-metric scoreboard vs iPhone 18 Pro Max & Galaxy S26 Ultra with strict same-lab attribution                                                                                                                   |
| **Specs** (`#/specs`)           | `FCC + Die`    | Searchable forensic catalog of 29 FCC/kernel parts, 22 source conflicts with precedence rules, 12 issues, and 7 explicit `UNKNOWN` leaves                                                                                     |

### Programmatic Examples (`examples/`)

```bash
node examples/01_euv_and_bragg.mjs
node examples/02_thermal_fdtd_iceloop.mjs
node examples/03_quantum_contextuality.mjs
```

### One-Word Task Runner (`justfile`)

```bash
just reproduce   # Full verification ladder: tests, mutants, examples, 60-digit oracle, evals, bench, stats, Lean 4, LaTeX PDF
just audit       # Build Standard v1.2.0 90-item repository audit
```

## Verification & Research Artifacts

- **Claims & Falsifiers:** [CLAIMS.md](CLAIMS.md) (`C01`–`C13`) · [VERIFICATION.md](VERIFICATION.md) · [REPLICATION.md](REPLICATION.md)
- **Hardening & Architecture Decisions:** [HARDENING_LOG.md](HARDENING_LOG.md) · [docs/adr/0009-catalytic-wasm-and-native-stack.md](docs/adr/0009-catalytic-wasm-and-native-stack.md) · [docs/reviews/2026-11-26-v4-catalytic-wasm-hardening-audit.md](docs/reviews/2026-11-26-v4-catalytic-wasm-hardening-audit.md) · [ERRATA.md](ERRATA.md)
- **Mega-Atlas & Literature:** [docs/mega-atlas-cross-reference.md](docs/mega-atlas-cross-reference.md) (**0 / 1,900** grand open problems retired) · [docs/literature-search-log.md](docs/literature-search-log.md) · [results/citation-audit.json](results/citation-audit.json) (12/12 DOIs non-retracted)
- **Formal & Security Docs:** [docs/statement-fidelity.md](docs/statement-fidelity.md) · [docs/threat-model.md](docs/threat-model.md) · [docs/ai.md](docs/ai.md) · [docs/benchmarks.md](docs/benchmarks.md) · [docs/preregistration.md](docs/preregistration.md)

## Limitations

- **Zero Mega-Atlas Retirements:** This repository solves **0 / 1,900** open problems in `0thernes/unsolved-problems-mega-atlas`.
- **No Browser NPU 990 Dispatch or Hardware QRNG:** All live LLM and quantization workloads run on the visitor's CPU thread via Rust WASM SIMD128 / JS (or WebGL2), never on MediaTek NPU 990; NIST SP 800-90B tests audit browser PRNG/CSPRNG streams rather than physical QRNG hardware.
- **Unpublished Hardware Leaves Stay `UNKNOWN`:** Nominal battery watt-hours, reverse-wireless wattage, rear glass composition, device UFS lanes, GPU clock, and proprietary TSMC N3P process-kit ground rules remain explicitly `null` / `UNKNOWN`.
- **Not Externally Peer Reviewed:** The AMS-LaTeX white paper is an independent research preprint. See [LIMITATIONS.md](LIMITATIONS.md) for the full literal-vs-metaphor boundary table.

## License

- First-party source code (`src/`, `native/xiaomi-kernels/`, `lean/`, `scripts/`, `reference/`): **MIT License** ([LICENSE](LICENSE))
- AMS-LaTeX white paper (`paper/`, `dist/`), figures, and documentation: **CC-BY-4.0** ([NOTICE](NOTICE))
- Third-party bundled libraries, fonts, CC0 assets, TinyStories-8M weights, and Glitchling port retain their upstream licenses ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), [CREDITS.md](CREDITS.md)).
