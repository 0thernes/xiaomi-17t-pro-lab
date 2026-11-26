# ADR 0008: Deterministic 9-Shard TinyStories Delivery & Zero-Mathlib Lean 4.35.0 Core

- **Date:** 2026-11-25
- **Status:** Accepted (v3.0.0)

## Context

1. Build Standard v1.2.0 (`A24`) forbids tracking single files larger than 5 MiB (`5,242,880` bytes), whereas `vendor/tinystories/model.f16.safetensors` is `39,417,097` bytes. Moving weights to an external host would break 100% self-hosted offline GitHub Pages operation.
2. Playbook v1.3 (`B22`) requires machine-checked formal verification of core mathematical invariants without brittle multi-gigabyte Mathlib caches, audited across six independent Lean 4.35.0 kernels via Palomar `module` isolation.

## Decision

1. **Deterministic Sharding (`vendor/tinystories/shards/`):** Split `model.f16.safetensors` into 9 byte-exact chunks (`≤ 4,500,000` bytes each) indexed by `vendor/tinystories/shards.json`. Reassemble in parallel in browsers via `fetchShardedSafetensors` with WebCrypto `SHA-256` verification against `9999a42aa4cb668c19760c02448ab97b0458c89871013fa8d0c5cae2a569c28f`.
2. **Pure Lean 4.35.0 Formal Core (`lean/`):** Formalize 59 declarations across 6 zero-Mathlib `module` libraries (`HardwareFloorplan`, `EuvLithography`, `QuantumTransport`, `ThermalFdtd`, `QuantumContextuality`, `AdversarialTests`) with isolated statement-only `Challenge.lean` and sorry-free `Solution.lean` checked by `lake comparator --config comparator.json --paranoid` in Linux CI.

## Consequences

- Every tracked repository file stays under 5 MiB (`A24 PASS`) while `#/work/llm` remains 100% offline/self-hosted and loads faster via parallel HTTP/2 fetches.
- Lean builds complete in `< 6 s` from scratch with zero external package downloads and full 6-kernel verification in GitHub Actions.
