# Xiaomi 17T Pro Lab (v1.0.0)

[![CI](https://github.com/0thernes/xiaomi-17t-pro-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/0thernes/xiaomi-17t-pro-lab/actions/workflows/ci.yml)
[![version](https://img.shields.io/badge/version-1.0.0-38d4f2)](CHANGELOG.md)
[![license](https://img.shields.io/badge/license-MIT-a78bfa)](LICENSE)
[![pages](https://img.shields.io/badge/demo-GitHub%20Pages-ff6900)](https://0thernes.github.io/xiaomi-17t-pro-lab/)

Interactive silicon-to-quantum engineering workbench for the **Xiaomi 17T Pro** (`2602EPTC0G`, codename `warhol`) and the **MediaTek Dimensity 9500** (`MT6993Z`, TSMC **N3P FinFET**, `140.57 mm²`, ~30B transistors). Zero-build ES modules, Three.js r187 PBR studio + p5.js 2.4 live scientific plots. Every hardware number is **MEASURED** on your device, **CITED** from FCC `2AFZZPTC0G` / Kurnal / Xiaomi `warhol` kernel / Arm TRMs, or **COMPUTED** with its formula shown. Truly unpublished figures stay **UNKNOWN**.

**Live Demo (GitHub Pages):** <https://0thernes.github.io/xiaomi-17t-pro-lab/>

Owner: Alexander Stephen Donahue (GitHub [0thernes](https://github.com/0thernes)).

## Interactive Labs (10⁻¹ m → 10⁻¹⁵ m)

| Route                           | Scale          | What Runs Live in Real Time                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phone** (`#/`)                | `10⁻¹ m`       | Interactive 3D Xiaomi 17T Pro (Deep Violet / Black / Deep Blue), HyperOS 3 telemetry OLED, Leica Summilux triple optics, and 7-layer ERP/FCC exploded teardown                                                                                                                                                                                                                                                       |
| **Zoom** (`#/zoom`)             | `10⁻¹→10⁻¹⁵ m` | 8-rung Powers-of-Ten descent: Phone → Compeq PCB → MT6993Z PoP → 140.57 mm² Die → C1-Ultra Core → 48 nm FinFET → 0.543 nm Si Crystal → Quantum Tunnel / Dirac e⁻/e⁺                                                                                                                                                                                                                                                  |
| **CPU** (`#/cpu`)               | `28.75 mm²`    | 15-level 3D taxonomy stack, live Sattolo pointer-chase latency curve (16 KB–16 MB), WASM SIMD `f32x4` vs scalar, COOP/COEP timer isolation, ARMv9.3-A 32-bit decoder                                                                                                                                                                                                                                                 |
| **GPU** (`#/gpu`)               | `24.23 mm²`    | 16-level Mali-G1 Ultra MC12 + RTUv2 3D stack, checked WebGPU/WebGL2 matmul vs CPU Float64 reference, interactive TBDR tile-binner & overdraw heatmap                                                                                                                                                                                                                                                                 |
| **NPU 990** (`#/npu`)           | `12.60 mm²`    | 14-level 4× MDLA + 2× MVPU + CIM 3D stack, live FP64 vs INT8 vs BitNet 1.58-bit error heatmaps & WASM INT8 dot (honestly labeled as CPU JS/WASM, not NPU dispatch)                                                                                                                                                                                                                                                   |
| **RAM & UFS** (`#/memory`)      | `76.8 GB/s`    | 3D MT6993Z + SK hynix `H58GG6AV9H` PoP, live STREAM Triad + 16 MB copy benchmark, log-log CS Roofline plot, and interactive LLM memory-wall decode & UFS 4.1 load calculator                                                                                                                                                                                                                                         |
| **EUV Litho** (`#/litho`)       | `13.5 nm`      | 3D Sn-LPP reflective optical column, 40-pair Mo/Si Bragg multilayer 2×2 transfer-matrix reflectivity, defocus-aware Abbe aerial image, and live 2D Poisson EUV photon shot-noise & 3σ LER simulator                                                                                                                                                                                                                  |
| **Atom & QED** (`#/transistor`) | `10⁻⁸→10⁻¹⁵ m` | 3D N3P FinFET vs N2 GAA & WKB/Dirac switcher, finite-difference Schrödinger eigenstates, WKB oxide gate-leakage curve, Kronig–Penney bands, thermal carrier runaway `n_i(T)`, and Dirac e⁻/e⁺ dispersion (`2mₑc² = 1.022 MeV`)                                                                                                                                                                                       |
| **Workloads** (`#/work/*`)      | `Live Run`     | **Game** (instanced PBR stress + 60-frame oscilloscope), **LLM** (Neuralese live weight-hacked TinyStories-8M + 16-head attention heatmap + Top-6 probabilities), **A-Life** (Glitchling 272-neuron 14-region arena + flaw injection + click snacks), **Science** (3D RK4 Lorenz + DOPRI54 Robertson + Tsotchke Bell CHSH / GHZ Mermin-3 / Magic Square), **Browser** (GigaChad 60 Hz 5-caste embodied swarm cortex) |
| **Versus** (`#/compare`)        | `3-Way`        | Normalized multi-metric bar chart and strict same-lab scoreboard vs iPhone 18 Pro Max (A20 Pro N2) and Galaxy S26 Ultra (Snapdragon 8 Elite Gen 5)                                                                                                                                                                                                                                                                   |
| **Specs** (`#/specs`)           | `FCC + Die`    | Instant-searchable forensic catalog of 29 FCC/kernel board parts, 22 source conflicts, 12 tracked issues, supply chain, and 7 genuinely open leaves                                                                                                                                                                                                                                                                  |

## Run Locally & Test

Node 22+ required. Zero build step (`package.json` devDependencies are strictly for Prettier and Playwright).

```bash
npm ci
npm start        # http://127.0.0.1:47321/ (with COOP/COEP headers)
npm test         # node:test physics, specs, TinyStories, quantum & memory checks
npm run validate # specs.json provenance schema audit
npm run lint     # prettier --check .
npm run test:smoke # Playwright phone + desktop E2E across all routes
```

## License

MIT for all authored lab source (`LICENSE`). Vendored third-party libraries, fonts, CC0 textures, TinyStories-8M weights, and Glitchling play sim retain their original licenses (`THIRD-PARTY-NOTICES.md`, `CREDITS.md`).
