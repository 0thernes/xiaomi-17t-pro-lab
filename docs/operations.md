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
- **Master Research Archive Mirror:** Pinned as a git submodule with frozen PDF and SHA-256 verification inside [`0thernes/0thernes-research-archive`](https://github.com/0thernes/0thernes-research-archive) (`0TH-BUILD-012`).
- **Software Heritage Offsite Archival Mirror:** Permanently archived at snapshot `swh:1:snp:06ad26ff598cf7d592768bdef08d9de7616cd4e0` (`v3.1.0` revision `swh:1:rev:1d8a87126258fa7691715ed753ee7a4f0609cc28`, visit `2026-11-26T10:54:12Z`, full status) so source, Lean proofs, and manifests remain independently retrievable by SWHID.

## 3. One-Command Rollback Procedure

Because history on `main` is strictly linear (no force-pushing), rollbacks use a clean forward `git revert`:

```bash
just rollback HEAD          # Reverts the latest commit on main and pushes -> GitHub Pages redeploys automatically
# Or target a specific commit hash:
just rollback <bad-sha>
```

Verify recovery via `curl -fsSI https://0thernes.github.io/xiaomi-17t-pro-lab/` and check the `Pages` GitHub Actions workflow run status.
