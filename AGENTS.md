# AGENTS.md — Canonical Agent Instructions for `xiaomi-17t-pro-lab`

This file is the single canonical source of project instructions for all coding and research agents (Codex, Claude Code, Gemini/Antigravity, Cursor). Keep under 32 KiB.

## 1. Mission & Epistemic Rules

- **Repository:** `xiaomi-17t-pro-lab` (zero-build static ES-module hardware lab + pure Lean 4.35.0 formal core + AMS-LaTeX white paper for the Xiaomi 17T Pro & MediaTek Dimensity 9500).
- **Author & Affiliation:** Alexander Stephen Donahue (`ORCID 0009-0006-8168-9648`), Independent Researcher, Spokane, WA, USA (`0_0@0thernes.art`). Do NOT assert `"0thernes LLC"` as affiliation or legal entity.
- **Provenance discipline:** Never invent unpublished Xiaomi 17T Pro or TSMC N3P values (nominal battery Wh, reverse-wireless watts, rear glass, device UFS lane count, GPU clock, N3P fin height/gate length stay `null` / `UNKNOWN`). Every leaf in `data/specs.json` must carry `source` and `status`.
- **Honest scope:** Browser workloads NEVER execute on MediaTek NPU 990; Glitchling A-Life is non-sentient; `0 / 1,900` grand open problems in `unsolved-problems-mega-atlas` are retired by this repository (`docs/mega-atlas-cross-reference.md`).

## 2. Hard Workflow Rules (Build Standard v1.2.0 R1–R8)

- Commit and push directly to `main` (no PRs, no feature branches, no PR templates, no `.github/copilot-instructions.md`).
- Never install git hooks or turn linters/SAST into blocking commit gates (report-only).
- Never track any file larger than 5 MiB (TinyStories-8M FP16 lives as 9 byte-exact shards <= 4.5 MB under `vendor/tinystories/shards/`).
- Classify every audit finding into exactly one of the 10 classes: `bug`, `error`, `issue`, `problem`, `concern`, `dilemma`, `conflict`, `gap`, `hole`, `blindspot`.

## 3. Key Commands (`justfile`)

- `just test` — runs `npm run validate`, `npm test` (50 Node unit/property/metamorphic/EIO/golden tests), and `node scripts/mutate.mjs` (8/8 mutants).
- `just oracle` — runs 60-digit independent Python oracle (`reference/physics_oracle.py --check-checksums`).
- `just evals` — runs deterministic TinyStories-8M regression & entropy eval (`evals/run_tinystories_eval.mjs`).
- `just lean` — builds `lean/XiaomiLabProofs`, `Challenge`, `Solution`, audits 59 axioms (`VerifyAxioms.lean`), and runs `leanchecker --fresh`.
- `just paper` — compiles zero-warning AMS-LaTeX PDF (`dist/Donahue_2026_Xiaomi_17T_Pro_Lab.pdf`) and verifies standalone `dist/arxiv_submission.tar.gz`.
- `just audit` — runs Build Standard v1.2.0 90-item repo audit (`scripts/Audit-Repo.ps1` / `scripts/audit-repo.sh`).
- `just reproduce` — runs the entire end-to-end verification pipeline from a clean clone.

## 4. Layout Quick Map

- `src/sim/*.js` — live physical, optical, quantum, thermal, memory, and hardware math solvers (single CODATA source: `src/sim/constants.js`).
- `src/workloads/*.js` — sharded safetensors loader (WebCrypto SHA-256), GPT-Neo forward pass, GPT-2 BPE tokenizer.
- `lean/` — pure Lean 4.35.0 (`module` headers, zero Mathlib) formal core + Palomar `Challenge.lean`/`Solution.lean`.
- `reference/physics_oracle.py` — independent 60-digit `Decimal`/`Fraction` differential oracle.
- `paper/` & `dist/` — AMS-LaTeX white paper, vector figures, frozen PDF, standalone arXiv tarball.
- `CLAIMS.md`, `LIMITATIONS.md`, `REPLICATION.md`, `VERIFICATION.md`, `HARDENING_LOG.md`, `docs/statement-fidelity.md`, `docs/mega-atlas-cross-reference.md`.
