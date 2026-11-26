# Roadmap

**Maintenance Status:** `active` (v3.0.0 released 2026-11-25).

## Completed Milestones

- **v1.0.0–v2.0.0:** 19 zero-build interactive hardware/physics routes, 2D Fourier EUV + OPC, unitary Crank–Nicolson TDSE, 2D FDTD silicon thermal PDE, interactive quantum circuit composer, vendored TinyStories-8M & Glitchling.
- **v2.1.0–v2.2.0:** Strict CSP (`style-src 'self'`), 1,200 s thermal clock alignment, battery watt-hour provenance integrity, conflict precedence rules (conflicts 16–22), CC0 percussion audio hits.
- **v3.0.0 (Current):**
  - Deterministic 9-shard TinyStories-8M checkpoint (`<= 4.5 MB` per tracked shard) with WebCrypto SHA-256 verification and exact full-vocabulary Shannon entropy;
  - Cycle 1–3 hardening fixes: sub-pixel stochastic LER metrology (eliminating pinhole inversion bias), closed-loop DVFS sub-stepping (eliminating 30 s bang-bang thermal oscillation), strict finite/positive domain guards, `serve.mjs` EIO resilience & JPEG MIME & `/healthz`;
  - Pure Lean 4.35.0 formal core (`XiaomiLabProofs`, 59 audited declarations, 9 Palomar comparator targets, 6-kernel CI, interactive Blueprint at `/blueprint/`);
  - Independent 60-digit Python `Decimal`/`Fraction` oracle (54 checks), 8/8 semantic mutants, 20-seed Holm–Bonferroni statistical eval, and zero-warning AMS-LaTeX white paper + verified standalone `arxiv_submission.tar.gz`;
  - Full Build Standard v1.2.0 compliance and Mega-Atlas 1,900-problem cross-reference (`0/1,900` retired).

## Planned / Open Exploration

- **Hardware validation on physical Xiaomi 17T Pro / Mali-G1 Ultra MC12:** Capture real-device WebGL2/WebGPU shader captures and thermal IR comparisons once physical hardware is benchmarked.
- **Unresolved spec leaves:** Update the 7 `UNKNOWN` leaves in `data/specs.json` strictly when verifiable primary datasheets or lab teardowns publish them (never via secondary transcription).
- **Optional WebGPU compute kernels:** Add feature-detected WebGPU compute-shader paths for 2D FFT and 2D FDTD thermal grids while keeping CPU/WebGL2 exact reference fallbacks.
