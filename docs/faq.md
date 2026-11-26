# Frequently Asked Questions (`docs/faq.md`)

### 1. Does `xiaomi-17t-pro-lab` solve any open problem in `unsolved-problems-mega-atlas`?

**No (`0 / 1,900` retired).** This workbench implements established multi-scale physics and certifies finite/algebraic invariants of those models in Lean 4.35.0. See [docs/mega-atlas-cross-reference.md](mega-atlas-cross-reference.md) for the exact 13 adjacent open IDs and why each parent problem remains open.

### 2. Does the in-browser TinyStories-8M LLM or BitNet lab run on the Dimensity 9500 NPU 990?

**No.** Standard web browsers do not expose MediaTek NeuroPilot / NPU 990 execution APIs. Every browser workload executes on the visitor's CPU JavaScript thread (or optional WebGL2 shader) and labels that boundary explicitly.

### 3. Why is the Xiaomi 17T Pro's battery watt-hour rating shown as `UNKNOWN`?

Xiaomi publishes `7000 mAh` typical capacity and a `4.58 V` high-voltage cell rating, not nominal discharge voltage or Wh. Multiplying `7000 mAh × 4.58 V` would fabricate an inflated Wh figure, so `batteryWh` remains `null` (`UNKNOWN`).

### 4. Why is TinyStories-8M split into 9 shards under `vendor/tinystories/shards/`?

Build Standard v1.2.0 (`A24`) caps tracked repository files at 5 MiB (`5,242,880` bytes). Splitting the `39,417,097`-byte FP16 safetensors file into nine byte-exact `≤ 4.5 MB` shards keeps GitHub Pages 100% self-hosted and offline-capable while verifying exact bit-for-bit SHA-256 (`9999a42a...`) in both browsers (WebCrypto) and Node tests.

### 5. What does the Lean 4.35.0 formal core actually prove — and what does it NOT prove?

`lean/XiaomiLabProofs/` proves 59 exact algebraic, combinatorial, CFL stability, Cayley unitarity, and quantum contextuality declarations over `Nat`, `Int`, and `ℤ[i]` across 6 independent kernels with zero Mathlib and zero custom axioms. It does **not** formally verify V8 IEEE-754 floating-point rounding (which is checked differentially to `< 2.2e-14` by `reference/physics_oracle.py`).

### 6. Why are there no Pull Requests or git hooks?

Build Standard v1.2.0 Hard Rules **R1–R4** mandate a direct-to-`main` linear solo-researcher workflow with zero blocking commit hooks, zero PR templates, and report-only linters/SAST in CI.

### 7. Is the white paper peer reviewed?

**No.** `dist/Donahue_2026_Xiaomi_17T_Pro_Lab.pdf` is an independent research preprint (CC-BY-4.0) with machine-checked Lean proofs and reproducible computational artifacts, not an externally peer-reviewed journal publication.
