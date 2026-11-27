# Errata (`ERRATA.md`)

All substantive factual, numerical, physical, or formal errors discovered post-publication are logged permanently here rather than silently overwritten.

## Resolved Pre-v3.0.0 Defects (Caught During v2.1–v3.0 Hardening)

- **E-001 (v2.1.0, fixed in `81cb614`):** `src/sim/thermal-fdtd.js` previously labeled a ~24 s thermal trace as 20 minutes and computed an unverified `27.16 Wh` battery figure from `3.88 V`; fixed to exact `1200 s` clock and `batteryWh: null`.
- **E-002 (v2.1.0, fixed in `81cb614`):** Battery inspect copy stated `90 W` wired charging next to a `cited` badge; corrected to cited `100 W` wired / `50 W` wireless.
- **E-003 (v3.0.0, Cycle 1):** `src/sim/litho-advanced.js` `simulateStochasticResist` scanned from `c = 3` for any binary flip, latching onto bright-region low-dose shot-noise pinholes and inverting dose-vs-LER scaling (`15 mJ/cm²` appeared smoother than `45 mJ/cm²`). Fixed via sub-pixel falling-edge interpolation inside a local window around the nominal aerial edge.
- **E-004 (v3.0.0, Cycle 2):** `src/sim/thermal-fdtd.js` updated the DVFS throttle controller once per `dtSec = 30 s` outer step in `simulateSustainedThrottle`, creating a 30-second bang-bang sawtooth oscillation between ~72 °C and ~120 °C on the uncooled curve (caught by visual inspection of white paper Figure 2). Fixed by sub-cycling the closed-loop DVFS controller at `≤ 0.5 s` intervals.
- **E-005 (v3.0.0, Cycle 2):** Early draft of `paper/main.tex` cited `R(13.5 nm) ≈ 73.17%` / `R^{11} ≈ 3.19%` while the live 40-pair Mo/Si transfer matrix and 60-digit oracle compute `74.32%` / `3.82%`. Synchronized verbatim to `results/oracle-60digit.json` prior to v3.0.0 freeze.

## Resolved v3.0.0 → v3.1.0 Defects (Caught During Round 2 Hardening)

- **E-006 (v3.1.0, Round 2):** `blueprint/index.html` lacked `<link rel="icon">` (causing a live `/favicon.ico` 404 on `/blueprint/`) and used inline CSS without a strict CSP meta header; extracted `blueprint/blueprint.css`, added favicon and `style-src 'self'` CSP, and added Playwright E2E enforcement.
- **E-007 (v3.1.0, Round 2):** Seven relative Markdown links in `docs/research/*.md` omitted `../../data/`, `docs/statement-fidelity.md` Row 3 and `CLAIMS.md` Rows `C05`/`C07` had unescaped `|` pipes splitting table columns, `lean/VerifyAxioms.lean` miscounted `44+9=53`, and `docs/mega-atlas-cross-reference.md` / `docs/operations.md` cited stale archive ID `0TH-BUILD-010` instead of `0TH-BUILD-012`. Fixed all and added permanent CI guards in `scripts/check_repo_integrity.py`.

## Resolved v3.1.0 → v4.0.0 Defects (Caught During Round 3 Catalytic/WASM Hardening)

- **E-013 (v4.0.0, Round 3):** `src/workloads/safetensors.js` `halfToFloat()` previously allocated two TypedArrays per FP16 weight (`39.4M` heap allocations, `9,655 ms` load) AND initialized subnormal normalization with `let e = -1; do { e += 1; ... }` (off-by-one shift doubling all 2,046 IEEE-754 binary16 subnormals, mapping `0x0001` to $2^{-23}$ instead of $2^{-24}$). Caught by exhaustive 65,536/65,536 Rust WASM `fp16_to_f32_bulk` differential testing (`tests/catalytic-wasm.test.mjs`), replaced with a 256 KiB exact LUT (`213 ms` load, `45.3×` speedup), and verified bit-for-bit against `reference/physics_oracle.py` (`fp16_min_subnormal_2m24`).

## 2026-11-26 statement audit

An independent statement audit of v3.1.0 (commit `f1da68b`) found the items below. Audit log: <https://github.com/0thernes/0thernes-research-archive/blob/main/docs/reviews/2026-11-26-statement-audit.md>. The README, `CLAIMS.md`, `LIMITATIONS.md`, and restating files under `docs/` incorporate these corrections; historical notes for v3.1.0 are preserved here.

- **E-008 (v3.1.0 paper / comparator wording):** CI runs `lake comparator --paranoid`, which checks the comparator targets and their dependency closure with 6 kernel checks (Lean default and paranoid mode, lean4lean, nanoda, con-leche, con-ron). Lean default and paranoid mode are one implementation, so these are 5 distinct kernels. All declarations are checked by the Lean kernel (`lake build`, `leanchecker`). Does not affect any theorem statement.
- **E-009 (v3.1.0 paper / 9-shard split):** Lean checks only `8 × 4,500,000 + 3,417,097 = 39,417,097` and that each size is below `5,242,880`, on hard-coded numbers. The shard files themselves are verified by SHA-256 in `evals/run_tinystories_eval.mjs` (measured, not proved). Does not affect the theorem statement.
- **E-010 (v3.1.0 paper / Theorem 3 title):** The Lean statement is norm preservation for one scalar Cayley factor `(1 + ih)ψ₁ = (1 − ih)ψ₀` with integer `h` over ℤ[i]. Extension to the full operator via eigenmodes is informal.
- **E-011 (v3.1.0 paper / Theorem 2):** "Improves Rayleigh resolution" and "shrinking depth of focus" are informal readings; Lean proves strict monotonicity of the integer products `(k1·λ)·NA` and `(k2·λ)·NA²` in NA without formalizing division.
- **E-012 (v3.1.0 `CHANGELOG.md` and `VERIFICATION.md`):** For v3.1.0 (75 declarations), `#print axioms` gave 28 with no axioms, 14 with `[propext]`, and 33 with `[propext, Quot.sound]` (zero `Classical.choice`).

### Known issues in the formal code (not yet fixed)

- **K-001 (`lean/XiaomiLabProofs/EuvLithography.lean`, `rayleigh_cd_strictly_decreasing_in_na`):** The docstring says "for positive k1, lambda and 0 < na1 < na2", while the statement assumes `0 < k1`, `0 < lam`, and `na1 < na2` (`0 < na1` is not required for monotonicity of multiplication by `k1 * lam`). Affects the docstring only, not the truth of the theorem statement.

## Open Post-v4.0.0 Errata

Report suspected errors via `.github/ISSUE_TEMPLATE/falsification.yml` or `0_0@0thernes.art`.
