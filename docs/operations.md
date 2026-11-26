# Operations, Backups, Offsite Mirroring & Rollback (`docs/operations.md`)

Build Standard v1.2.0 **A35** & **A36** operational runbook for `xiaomi-17t-pro-lab`.

## 1. Deployment Architecture

- **Production Host:** GitHub Pages (`https://0thernes.github.io/xiaomi-17t-pro-lab/`), deployed automatically on push to `main` via `.github/workflows/pages.yml`.
- **Published Artifacts:** Static ES-module workbench (`index.html`, `styles/`, `src/`, `vendor/`, `assets/`, `data/`), interactive Lean 4.35.0 Proof Blueprint (`/blueprint/`), and frozen AMS-LaTeX white paper PDF (`/dist/Donahue_2026_Xiaomi_17T_Pro_Lab.pdf`).
- **Release Assets:** Pushing a `v*` semver tag triggers `.github/workflows/release.yml`, which re-verifies tests/oracle/checksums, publishes frozen artifacts + `SHA256SUMS` to GitHub Releases, and attaches SLSA build provenance via `actions/attest-build-provenance@v2`.

## 2. Data Persistence, Backups, and Offsite Mirrors

No user database or mutable server state exists. All data is immutable, version-controlled, and cryptographically pinned (`data/MANIFEST.sha256`, `CHECKSUMS.sha256`, `vendor/tinystories/SHA256.txt`).

- **Local Offline Git Bundle Backup:**
  ```bash
  git bundle create ../xiaomi-17t-pro-lab-$(git describe --tags --always).bundle --all
  git bundle verify ../xiaomi-17t-pro-lab-*.bundle
  ```
- **Master Research Archive Mirror:** Pinned as a git submodule with frozen PDF and SHA-256 verification inside [`0thernes/0thernes-research-archive`](https://github.com/0thernes/0thernes-research-archive) (`0TH-BUILD-010`).
- **Software Heritage Offsite Archival Mirror:** Triggered via Save Code Now for `https://github.com/0thernes/xiaomi-17t-pro-lab` on every major release tag so source, Lean proofs, and manifests remain permanently retrievable by SWHID independent of GitHub.

## 3. One-Command Rollback Procedure

Because history on `main` is strictly linear (no force-pushing), rollbacks use a clean forward `git revert`:

```bash
just rollback HEAD          # Reverts the latest commit on main and pushes -> GitHub Pages redeploys automatically
# Or target a specific commit hash:
just rollback <bad-sha>
```

Verify recovery via `curl -fsSI https://0thernes.github.io/xiaomi-17t-pro-lab/` and check the `Pages` GitHub Actions workflow run status.
