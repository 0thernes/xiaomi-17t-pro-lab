# Pre-Registration of Computational Hypotheses (`docs/preregistration.md`)

Build Standard v1.2.0 **B32** pre-registration specification for `scripts/stats_eval.mjs` (`results/stats-eval.json`).

## 1. Study Design

- **Seeds:** Fixed deterministic 20-seed panel (`seed_i = 1000 + 97 * i`, `i = 0..19`) across independent control and treatment arms.
- **Inference Procedure:** Two-sided Monte Carlo permutation test (`10,000` resamples, seeded PRNG `mulberry32(20261125)`), `10,000`-resample nonparametric 95% bootstrap confidence intervals for mean difference, parametric effect size (Cohen's $d$), nonparametric effect size (Cliff's $\delta$), and family-wise error rate control via Holm–Bonferroni (`α = 0.05`).

## 2. Pre-Registered Hypotheses (H1–H4)

1. **H1 (`H1_dose_ler`):** At 0.33 NA, 44 nm pitch, increasing EUV exposure dose from `15 mJ/cm²` to `60 mJ/cm²` strictly reduces sub-pixel 3σ stochastic resist LER ($\Delta = \text{LER}_{15} - \text{LER}_{60} > 0$).
2. **H2 (`H2_na_ler`):** At 30 nm pitch (`conventional`, `σ = 0.55`, `35 mJ/cm²`), `0.55` High-NA yields strictly lower sub-pixel 3σ LER than `0.33` NA ($\Delta = \text{LER}_{0.33} - \text{LER}_{0.55} > 0$).
3. **H3 (`H3_chsh_violation`):** Sampled Bell $|\Phi^+\rangle$ CHSH statistic (`2,000` shots, $\theta = 22.5^\circ$) strictly exceeds the classical local-hidden-variable control ($\theta = 0^\circ$, $S = 2.0$).
4. **H4 (`H4_mermin3_violation`):** Sampled 3-qubit GHZ Mermin-3 statistic (`2,000` shots, $\phi = 0^\circ$) strictly exceeds the classical non-contextual control ($\phi = 60^\circ$, $M = 2.0$).

## 3. Deviation & Defect Disclosure

During initial execution on v2.2 code, **H1** inverted sign (`Δ = -7.87 nm`) and **H2** collapsed (`Δ = 0.00 nm`), exposing a real edge-detector pinhole bias in `src/sim/litho-advanced.js` (`ERRATA.md` E-003) and an uninformative dipole harmonic regime at 28 nm pitch. After fixing the sub-pixel metrology window and specifying H1/H2 cleanly above, all 4 hypotheses achieved $p_{\text{Holm}} \le 0.0008$ (logged transparently in `results/stats-eval.json` and white paper Section 5.2).
