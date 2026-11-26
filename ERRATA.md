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

## Open Post-v3.1.0 Errata

The open items are recorded under the dated heading below.

## 2026-11-26 statement audit

An independent statement audit of v3.1.0 (commit `f1da68b`) found the items below. Audit log: <https://github.com/0thernes/0thernes-research-archive/blob/main/docs/reviews/2026-11-26-statement-audit.md>. The README, `CLAIMS.md`, `LIMITATIONS.md` and the restating files under `docs/` were corrected in the same pass. The frozen paper, its PDF and the Lean code are not changed in place; the corrections are recorded here.

- **E-008 (paper, Section "Constructive Pure Lean 4.35.0 Formal Verification Core", `paper/main.tex` lines 287-289; abstract line 71; contribution "Constructive Pure Lean 4.35.0 Six-Kernel Formal Core", line 118):** The paper says the comparator runs "across six independent kernels (`lean`, `leanchecker --paranoid`, `lean4lean`, `nanoda`, `con-leche`, `con-ron`)". Correction: CI runs `lake comparator --paranoid`, which checks the 10 comparator targets and their dependency closure with 6 kernel checks (Lean default and paranoid mode, lean4lean, nanoda, con-leche, con-ron). Lean default and paranoid mode are one implementation, so these are 5 distinct kernels. All 75 declarations are checked by the Lean kernel (`lake build`, `leanchecker`). Does not affect any theorem statement.
- **E-009 (paper, contribution list, `paper/main.tex` lines 119-121; Theorem 9 item on the 9-shard split, lines 380-383):** The paper says the comparator targets "certify ... shard-conservation". Correction: Lean checks only `8 × 4,500,000 + 3,417,097 = 39,417,097` and that each size is below `5,242,880`, on hard-coded numbers. The shard files themselves are verified by SHA-256 in `evals/run_tinystories_eval.mjs` (measured, not proved). Does not affect the theorem statement.
- **E-010 (paper, Theorem 3 title "Crank–Nicolson Cayley Unitarity", `paper/main.tex` line 321; `docs/statement-fidelity.md` row 3 before this pass):** The title and the fidelity note ("on every Hermitian eigenmode") read as unitarity of the Crank–Nicolson operator. Correction: the Lean statement is norm preservation for one scalar Cayley factor `(1 + ih)ψ₁ = (1 − ih)ψ₀` with integer `h` over ℤ[i]. The extension to the full operator via eigenmodes is informal. The theorem statement in the paper body is correct as written; only the title and gloss overstate it.
- **E-011 (paper, Theorem 2, `paper/main.tex` lines 310-319):** "Improves Rayleigh resolution" and "shrinking depth of focus" are informal readings. Correction: Lean proves strict monotonicity of the integer products `(k1·λ)·NA` and `(k2·λ)·NA²` in NA; the forms `CD = k1·λ/NA` and `DOF = k2·λ/NA²` involve division, which is not formalized. Does not affect the theorem statement.
- **E-012 (`CHANGELOG.md` v3.1.0 entry and `VERIFICATION.md` row 1):** The axiom breakdown "28 zero-axiom, 47 `[propext, Quot.sound]`" is wrong. Correction: `#print axioms` gives 28 declarations with no axioms, 14 with `[propext]`, and 33 with `[propext, Quot.sound]`. The total of 75 and the absence of `Classical.choice` are correct. `VERIFICATION.md` is not edited in this pass. Does not affect any theorem statement.

### Known issues in the formal code (not yet fixed)

- **K-001 (`lean/XiaomiLabProofs/EuvLithography.lean` lines 18-23, `rayleigh_cd_strictly_decreasing_in_na`; used by `target_thm2_euv_rayleigh_and_dof` in `lean/Solution.lean`):** The docstring says "for positive k1, lambda and 0 < na1 < na2", but the statement has only the hypotheses `0 < k1`, `0 < lam` and `na1 < na2`; `0 < na1` is not assumed. The proved statement is strict monotonicity of multiplication by the positive integer `k1 * lam`, which is true and slightly more general than the docstring. Correction: either add `0 < na1` to the statement or change the docstring to match, and state that the `CD(na2) < CD(na1)` reading is an informal equivalence. Affects the docstring only, not the truth of the theorem statement.

Report suspected errors via `.github/ISSUE_TEMPLATE/falsification.yml` or `0_0@0thernes.art`.
