# Xiaomi 17T Pro Lab (v3.0.0) — Task Runner (Build Standard v1.2.0 A31/A36/B01)
set shell := ["bash", "-cu"]
set windows-shell := ["pwsh", "-NoLogo", "-NoProfile", "-Command"]

default:
    @just --list

setup:
    npm ci

serve port="47321":
    node tools/serve.mjs {{port}}

validate:
    npm run validate

test:
    npm run validate
    npm test
    node scripts/mutate.mjs

oracle:
    python reference/physics_oracle.py --check-checksums --json-out results/oracle-60digit.json

evals:
    node evals/run_tinystories_eval.mjs

bench:
    node scripts/bench.mjs

stats:
    node scripts/stats_eval.mjs

examples:
    node examples/01_euv_and_bragg.mjs
    node examples/02_thermal_fdtd_iceloop.mjs
    node examples/03_quantum_contextuality.mjs

lint:
    npm run lint

lean:
    cd lean && lake build XiaomiLabProofs Challenge Solution && lake env lean VerifyAxioms.lean
    python scripts/check_readme_axioms.py

paper:
    python scripts/package_dist.py

smoke:
    npm run test:smoke

audit:
    pwsh scripts/Audit-Repo.ps1 -Path .

reproduce:
    npm run validate
    npm test
    node scripts/mutate.mjs
    node examples/01_euv_and_bragg.mjs
    node examples/02_thermal_fdtd_iceloop.mjs
    node examples/03_quantum_contextuality.mjs
    python reference/physics_oracle.py --check-checksums --json-out results/oracle-60digit.json
    node evals/run_tinystories_eval.mjs
    node scripts/bench.mjs
    node scripts/stats_eval.mjs
    cd lean && lake build XiaomiLabProofs Challenge Solution && lake env lean VerifyAxioms.lean
    python scripts/check_readme_axioms.py
    python scripts/package_dist.py

# Safe forward-revert rollback of the latest main commit (preserves linear history, no force-push)
rollback target="HEAD":
    git revert --no-edit {{target}}
    git push origin main
