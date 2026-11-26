# Replication Protocol (`REPLICATION.md`)

Complete instructions to independently reproduce every computational result, formal Lean 4.35.0 proof, 60-digit oracle verification, statistical test, browser E2E test, and AMS-LaTeX white paper from a clean clone (Build Standard v1.2.0 B43 & B44).

## 1. Prerequisites

- **Node.js:** `>= 22.0.0` (`.nvmrc` pinned to `22`)
- **Python:** `>= 3.12` (standard library only for `physics_oracle.py`, `check_readme_axioms.py`, `package_dist.py`; optional `uv` / `matplotlib` + `numpy` only if regenerating PDF figures)
- **Lean 4:** `leanprover/lean4:v4.35.0` via `elan` (`lean/lean-toolchain`)
- **LaTeX:** `tectonic` (`>= 0.15`) for zero-warning PDF & standalone arXiv compilation
- **Optional:** `just` task runner (every command below can also be run directly without `just`)

## 2. Clean-Clone End-to-End Replication Commands

```bash
git clone https://github.com/0thernes/xiaomi-17t-pro-lab.git
cd xiaomi-17t-pro-lab
npm ci

# 1. Schema validation, 50 unit/property/metamorphic/golden/EIO tests, and 8/8 mutation testing (~15 s)
npm run validate
npm test
node scripts/mutate.mjs

# 2. Runnable examples (~1 s)
node examples/01_euv_and_bragg.mjs
node examples/02_thermal_fdtd_iceloop.mjs
node examples/03_quantum_contextuality.mjs

# 3. Independent 60-digit Python Decimal/Fraction differential oracle + SHA-256 manifests (~2 s)
python reference/physics_oracle.py --check-checksums

# 4. Deterministic TinyStories-8M 9-shard eval, perf benchmarks, and 20-seed statistical eval (~25 s)
node evals/run_tinystories_eval.mjs
node scripts/bench.mjs
node scripts/stats_eval.mjs

# 5. Pure Lean 4.35.0 formal build, 59-declaration axiom audit, and leanchecker (~15–120 s)
cd lean
lake build XiaomiLabProofs Challenge Solution
lake env lean VerifyAxioms.lean
lake env leanchecker --fresh XiaomiLabProofs
lake env leanchecker --fresh Solution
# On Linux with bubblewrap (automated in GitHub Actions CI):
# lake comparator --config comparator.json --paranoid
cd ..
python scripts/check_readme_axioms.py

# 6. Zero-warning AMS-LaTeX white paper & clean-room arXiv tarball check (~10 s)
python scripts/package_dist.py

# 7. Playwright 19-route browser smoke & strict CSP check (~45 s)
npx playwright install chromium
npm run test:smoke
```

## 3. Expected Tolerances & Pass Criteria

- **60-digit Oracle (`reference/physics_oracle.py`):** 54/54 checks pass, max relative error `< 1e-11` (observed `2.159e-14`).
- **Mutation Testing (`scripts/mutate.mjs`):** 8/8 mutants killed (`100.0%`).
- **Statistical Eval (`scripts/stats_eval.mjs`):** 4/4 hypotheses significant (`p_holm < 0.05`, observed `≤ 0.0008`).
- **TinyStories Eval (`evals/run_tinystories_eval.mjs`):** Reassembled SHA-256 equals `9999a42aa4cb668c19760c02448ab97b0458c89871013fa8d0c5cae2a569c28f`; greedy tokens for `"Once upon a time"` equal `[11, 612, 373, 257, 1310, 2576, 3706, 20037]`.
- **Lean 4.35.0:** 75/75 constructive audited declarations strictly within `[propext, Quot.sound]` (**0 `Classical.choice`**, 28 zero-axiom); 0 `sorry` outside `Challenge.lean`; live negative kernel & comparator rejection PASS.
- **Citations & Integrity:** `python scripts/check_repo_integrity.py` (0 broken/case-mismatch links, 0 CRLF, 0 malformed Markdown tables, strict CSP+favicon) & `python scripts/check_citations.py` (12/12 live Crossref/arXiv DOIs, 0 retractions).
- **LaTeX (`scripts/package_dist.py`):** 0 overfull/underfull hboxes, 0 undefined refs/citations, standalone arXiv tarball compiles cleanly (`plainurl` clickable DOIs).

## 4. Dated Replication Log

| Date       | Version | Environment                                                                    | Scope Verified                                                                                                                                                                                                                                                                                                                                                                        | Outcome |
| :--------- | :------ | :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------ |
| 2026-11-12 | v2.0.0  | Windows 11 (Node 22, Chromium) + GitHub Ubuntu 24.04 CI                        | 37 unit tests + 8 Playwright E2E routes + live Pages smoke                                                                                                                                                                                                                                                                                                                            | PASS    |
| 2026-11-21 | v2.2.0  | Windows 11 + GitHub Ubuntu 24.04 CI                                            | 40 unit tests + strict `style-src 'self'` CSP + all-route Playwright smoke                                                                                                                                                                                                                                                                                                            | PASS    |
| 2026-11-25 | v3.0.0  | Windows 11 + GitHub Actions (`ubuntu-24.04`, `macos-latest`, `windows-latest`) | 50 Node tests, 8/8 mutants, 54/54 60-digit oracle, TinyStories 9-shard eval, 4/4 stats `p_holm ≤ 0.0008`, 59 Lean decls + 6-kernel `lake comparator --paranoid` (CI `#45748904789`, Rekor `4117264287`), zero-warning PDF & Pages                                                                                                                                                     | PASS    |
| 2026-11-26 | v3.1.0  | Windows 11 + GitHub Actions (`ubuntu-24.04`, `macos-latest`, `windows-latest`) | 75/75 constructive Lean 4.35.0 decls (**0 `Classical.choice`**) + 10 Palomar targets + 6-kernel `lake comparator --paranoid` + live negative kernel/comparator rejection (CI `#45804914051`, Rekor `4124262738`), 9/9 Playwright (incl. strict-CSP `/blueprint/`), 12/12 live DOIs (0 retractions), DigiCert RFC 3161 + OTS, SWH `swh:1:snp:06ad26ff598cf7d592768bdef08d9de7616cd4e0` | PASS    |
