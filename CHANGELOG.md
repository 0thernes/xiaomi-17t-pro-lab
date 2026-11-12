# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-12

First public lab slice for the Xiaomi 17T Pro and Dimensity 9500.

### Added

- Phone hub with a lazy-loaded three.js body (PBR, PMREM studio, bloom on tiers above low). Quality tier comes from a fill probe, `deviceMemory`, core count, and the GPU renderer string. Orientation is not an input.
- Zoom navigation driven by `data/taxonomy.json`: device tree plus 15 CPU, 16 GPU, and 14 NPU levels.
- CPU lab: pointer chase from 32 KB to 32 MB, STREAM triad, WASM SIMD versus scalar, documented A64 decoder (`NOP`, `RET`, `SVC #0`, `ADD X0, X1, X2`).
- GPU lab: WebGPU compute matmul with a WebGL2 fallback. Results are checked against a CPU product. Official peak stays unknown because the GPU clock is unpublished.
- NPU-concepts lab: INT8 and absmean 1.58-bit matmul in JS/WASM, with RMSE versus FP32. The page says it is not running on NPU 990.
- Lithography lab: Rayleigh CD and a live 1D Abbe aerial image at NA 0.33 and 0.55.
- Transistor lab: finite-difference infinite well, Dirac-comb Kronig–Penney, double-gate FinFET scale length. N3P is FinFET.
- Head-to-head view from `specs.json`, including losses.
- WebAudio score and UI blips, muted by default.
- Provenance badges: MEASURED, CITED, COMPUTED, UNKNOWN.
- Opt-in `coi-serviceworker.js` for GitHub Pages. The dev server sends COOP/COEP itself.
- Unit tests (`node:test`), specs validation, Playwright smoke at a phone viewport, CI, and a Pages workflow.

### Notes

- L1 size, GPU clock, NPU TOPS, transistor count, die size, and DRAM channel width are UNKNOWN and are displayed that way.
- High-NA EUV (0.55) is a contrast, not a claim about the N3P mask set.

[0.1.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v0.1.0
