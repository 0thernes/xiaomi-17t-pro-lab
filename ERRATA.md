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

_None recorded as of v3.1.0 release (2026-11-26)._ Report suspected errors via `.github/ISSUE_TEMPLATE/falsification.yml` or `0_0@0thernes.art`.
