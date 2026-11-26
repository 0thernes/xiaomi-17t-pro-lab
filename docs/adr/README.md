# Architecture Decision Records (`docs/adr/`)

All foundational architectural decisions for `xiaomi-17t-pro-lab` (Build Standard v1.2.0 **A21**). Earlier root ADRs (`docs/ADR-001`..`007`) are preserved verbatim for link compatibility and indexed alongside the canonical `docs/adr/0001..0008` series below.

| ADR                                                                    | Title                                                                                          | Status   |
| :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- | :------- |
| [0001-zero-build.md](0001-zero-build.md)                               | Zero-Build Native ES Modules & Import Map                                                      | Accepted |
| [0002-provenance.md](0002-provenance.md)                               | Schema-Enforced Hardware Provenance & Explicit `UNKNOWN` Leaves                                | Accepted |
| [0003-quality-tier.md](0003-quality-tier.md)                           | Hardware-Capability Quality Tiers (Orientation-Independent)                                    | Accepted |
| [0004-timers.md](0004-timers.md)                                       | High-Resolution Timers & Opt-In Cross-Origin Isolation                                         | Accepted |
| [0005-npu.md](0005-npu.md)                                             | Honest Browser NPU 990 Boundary                                                                | Accepted |
| [0006-one-subject.md](0006-one-subject.md)                             | One Interactive Physical Subject Per Route                                                     | Accepted |
| [0007-design-system.md](0007-design-system.md)                         | Phone-First Accessible Design System & Strict `style-src 'self'` CSP                           | Accepted |
| [0008-sharded-weights-and-lean4.md](0008-sharded-weights-and-lean4.md) | Deterministic 9-Shard TinyStories Delivery (`≤ 4.5 MB`) & Zero-Mathlib Lean 4.35.0 Formal Core | Accepted |
