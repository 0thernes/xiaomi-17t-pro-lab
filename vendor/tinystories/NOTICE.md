# TinyStories-8M (Vendored Float16 Checkpoint — Deterministically Sharded)

- Source model: `roneneldan/TinyStories-8M` (`refs/pr/1` `model.safetensors`), converted from F32 to F16 via `tools/pack-tinystories.mjs`.
- License: MIT (see Hugging Face model card).
- Storage format (v3.0.0+): Deterministically split into 9 byte-exact shards under `shards/model.f16.safetensors.part00` through `part08` (each `<= 4,500,000` bytes so every tracked file stays under the 5 MiB Build Standard A24 limit).
- Reassembled full checkpoint SHA-256 (`39,417,097` bytes): `9999a42aa4cb668c19760c02448ab97b0458c89871013fa8d0c5cae2a569c28f` (see `shards.json` and `SHA256.txt`).
- Browser runtime: `src/workloads/safetensors.js` (`fetchShardedSafetensors`) fetches all 9 shards in parallel, verifies byte lengths and SHA-256 via WebCrypto (`crypto.subtle.digest`), and runs CPU JS inference (never dispatched to MediaTek NPU 990).
