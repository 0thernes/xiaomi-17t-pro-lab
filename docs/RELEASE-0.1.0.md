# Xiaomi 17T Pro Lab 0.1.0

Released 2026-11-12.

This is the first slice of a phone-first lab for the Xiaomi 17T Pro (MediaTek Dimensity 9500, TSMC N3P FinFET). It is a zero-build static site: ES modules, vendored three.js r170 and p5.js 1.11.3, relative URLs, `.nojekyll`.

## What works

- Hub with a measured quality tier and a three.js phone at the cited body size.
- Taxonomy zoom stacks for the device, CPU (15), GPU (16), and NPU (14).
- Live CPU chase, STREAM triad, and WASM SIMD, with timer uncertainty.
- WebGPU matmul and a WebGL2 fallback, both checked against CPU math.
- INT8 and 1.58-bit matmul labeled as software, not the NPU.
- Rayleigh plus a 1D Abbe aerial image.
- 1D Schrödinger well, Kronig–Penney bands, FinFET scale length, with unit tests against analytic results.
- Head-to-head wins and losses from the cited dossier.
- Sound off until the listener turns it on.

## What this release does not claim

GPU clock, peak TFLOPS, L1 geometry, NPU TOPS, tokens/s, transistor count, die size, and DRAM width. Those stay UNKNOWN. High-NA 0.55 is not asserted for N3P.

## Install

```bash
npm install
npm test
npm start
```

Demo: https://0thernes.github.io/xiaomi-17t-pro-lab/
