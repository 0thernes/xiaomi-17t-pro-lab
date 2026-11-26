# Three-Cycle, Ten-Pass Red-Team Hardening Audit (`v3.0.0`, 2026-11-25)

Comprehensive adversarial audit of `xiaomi-17t-pro-lab` (baseline `v2.2.0` commit `4195f7d` → release `v3.0.0`) following the **Build Standard for LLMs v1.2.0** (90-item checklist, 10 finding classes) and **Defensible Independent AI Research Playbook v1.3** (10-pass review protocol + 43-item Gold Standard Release Checklist).

## 1. Ten-Pass Adversarial Review Scorecard (Playbook v1.3 Section 9)

| Pass        | Dimension Audited                                      | Scope Checked                                                                                                                                | Result (v3.0.0)                                                                                                                                                                                       |
| :---------- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pass 1**  | Full Tree Inventory & Syntax                           | Every tracked file across `src/`, `tools/`, `tests/`, `scripts/`, `evals/`, `examples/`, `lean/`, `reference/`, `paper/`, `data/`, `vendor/` | **PASS** — `node --check`, Prettier, `ruff`, `mypy`, `lake build`, `tectonic` clean; zero tracked files > 5 MiB; banned PR template deleted.                                                          |
| **Pass 2**  | Hardware Provenance & Citations                        | `data/specs.json` (29 parts, 22 conflicts, 7 `UNKNOWN` leaves), `paper/refs.bib` (14 foundational/textbook citations)                        | **PASS** — `npm run validate` 0 errors; zero invented battery Wh / UFS lanes / GPU clock; zero fabricated DOIs or citations.                                                                          |
| **Pass 3**  | Physical Solvers & Numerical Stability                 | All 22 modules in `src/sim/` cross-checked against 60-digit `reference/physics_oracle.py` & `scripts/stats_eval.mjs`                         | **PASS (2 major bugs caught & fixed)** — Fixed Cycle 1 LER pinhole inversion (`E-003`) and Cycle 2 DVFS 30s bang-bang oscillation (`E-004`); 54/54 oracle checks `< 2.2e-14`.                         |
| **Pass 4**  | Pure Lean 4.35.0 Formal Soundness & Statement Fidelity | `lean/XiaomiLabProofs/` (6 modules), `Challenge.lean`, `Solution.lean`, `VerifyAxioms.lean`, `docs/statement-fidelity.md`                    | **PASS** — 59/59 declarations strictly in `[propext, Classical.choice, Quot.sound]`, zero `sorry` outside `Challenge.lean`, zero `native_decide`, `leanchecker --fresh` PASS, 6-kernel CI configured. |
| **Pass 5**  | Anti-Vacuity, Mutation & Metamorphic Testing           | `AdversarialTests.lean` (5 refutations), `target_nonvacuity_witnesses`, `scripts/mutate.mjs`, `tests/properties-and-regressions.test.mjs`    | **PASS** — 8/8 (100%) planted mutants killed; 2,500+ randomized properties; U(1) gauge, optical scaling, quantization metamorphic tests PASS.                                                         |
| **Pass 6**  | Security, CSP, Server Resilience & Privacy             | `index.html`, `tools/serve.mjs`, `src/workloads/safetensors.js`, `docs/threat-model.md`                                                      | **PASS** — Strict `style-src 'self'` CSP, WebCrypto SHA-256 shard check, `405` on POST, `image/jpeg` MIME, `EIO` stream failure injection (`500` + server survival), zero PII.                        |
| **Pass 7**  | AI Model Provenance, Sharding & Evals                  | `vendor/tinystories/shards/*`, `shards.json`, `evals/run_tinystories_eval.mjs`, `docs/ai.md`                                                 | **PASS** — 9 byte-exact shards (`<= 4.5 MB`) reassemble bit-for-bit to `9999a42a...`; 5/5 prompts deterministic; exact full-vocab entropy; L4 ablation `ΔH = 0.519` bits.                             |
| **Pass 8**  | AMS-LaTeX Manuscript, Figures & Clean-Room arXiv       | `paper/main.tex`, `paper/figures/*.pdf`, `dist/Donahue_2026_Xiaomi_17T_Pro_Lab.pdf`, `dist/arxiv_submission.tar.gz`                          | **PASS** — Visual inspection of all 7 pages verified; 0 overfull/underfull hboxes; 0 undefined refs; standalone arXiv tarball compiles cleanly in fresh temp dir.                                     |
| **Pass 9**  | Mega-Atlas Epistemic Honesty & Identity Compliance     | All 1,900 problems in `MegaAtlas_Unsolved_Problems_V2.json.gz`, `LICENSE`, `NOTICE`, `CITATION.cff`, `formalization.yaml`                    | **PASS** — Explicit `0 / 1,900` retirement verdict; 13 adjacent IDs mapped honestly; zero unformed `"0thernes LLC"` claims; transparent AI disclosure & COI.                                          |
| **Pass 10** | Build Standard v1.2.0 Score, CI, Pages & Archive Sync  | `scripts/Audit-Repo.ps1`, `.github/workflows/{ci,pages,release}.yml`, `CHECKSUMS.sha256`, `data/MANIFEST.sha256`                             | **PASS** — Upgraded from `30.9%` baseline to `100.0%` Core & `100.0%` Completion; verified CI + Pages + Blueprint + `0thernes-research-archive` registration.                                         |

## 2. Classification Distribution Across All 29 Findings (Cycles 1–3)

Every finding logged in [HARDENING_LOG.md](../../HARDENING_LOG.md) falls into exactly one Build Standard class:

| Finding Class |  Total | Fixed / Mitigated | Open (Documented) |
| :------------ | -----: | ----------------: | ----------------: |
| `bug`         |      7 |                 7 |                 0 |
| `error`       |      3 |                 3 |                 0 |
| `issue`       |      7 |                 7 |                 0 |
| `problem`     |      1 |                 1 |                 0 |
| `concern`     |      2 |                 1 |                 1 |
| `dilemma`     |      1 |                 0 |                 1 |
| `conflict`    |      1 |                 0 |                 1 |
| `gap`         |      3 |                 2 |                 1 |
| `hole`        |      2 |                 2 |                 0 |
| `blindspot`   |      2 |                 1 |                 1 |
| **Total**     | **29** |            **24** |             **5** |

## 3. Most High-Impact Real Defects Caught by Multi-Layer Verification

1. **Statistical Evaluation Caught Real Physics Bug (`F-04` / `E-003`):** Running pre-registered 20-seed permutation tests (`scripts/stats_eval.mjs`) revealed that `simulateStochasticResist` inverted dose-vs-LER scaling (`15 mJ/cm²` measured `7.09 nm` vs `45 mJ/cm²` `14.53 nm`) because blind scanning from `c = 3` locked onto low-dose bright-region pinholes. Replacing it with sub-pixel falling-edge interpolation around the nominal aerial edge restored physical scaling (`p_holm ≤ 0.0008`).
2. **Visual PDF Inspection Caught Real Control-Loop Bug (`F-15` / `E-004`):** Visually inspecting rendered Figure 2 of the white paper caught a 30-second bang-bang sawtooth oscillation (`72 °C ↔ 120 °C`) in `simulateSustainedThrottle` caused by updating `throttleScale` once per 30 s outer step with gain `1.0`. Sub-cycling the DVFS controller at `<= 0.5 s` produced smooth physical thermal settling and is now guarded by an automated regression test.
3. **Negative Testing Caught PDE `NaN` Poisoning (`F-03`):** Calling `grid.setAmbient(NaN)` previously bypassed clamping and corrupted the entire temperature array with `NaN`. Fixed with strict finite validation and tested in both `tests/properties-and-regressions.test.mjs` and mutant `M7`.
