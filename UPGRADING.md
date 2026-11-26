# Upgrading Guide

## Upgrading from v2.2.0 to v3.0.0

v3.0.0 introduces structural hygiene, input-validation, and formal-verification upgrades while keeping all 19 interactive hash routes (`#/` through `#/specs`) backward-compatible for browser users.

### Breaking Changes for Direct JS/Node Consumers

1. **Sharded TinyStories Checkpoint (`vendor/tinystories/`):**
   - The monolithic 39.4 MB `vendor/tinystories/model.f16.safetensors` file was replaced by 9 byte-exact shards (`vendor/tinystories/shards/model.f16.safetensors.part00..part08`, each `<= 4.5 MB`) plus `vendor/tinystories/shards.json` to comply with the Build Standard A24 5 MiB tracked-file ceiling.
   - **Migration:** In browsers use `fetchShardedSafetensors(baseUrl)` from `src/workloads/safetensors.js`. In Node scripts use `assembleShards(chunks, manifest.totalBytes)`. The reassembled bytes match the exact original SHA-256 (`9999a42aa4cb668c19760c02448ab97b0458c89871013fa8d0c5cae2a569c28f`).
2. **Strict Finite / Positive Input Validation (`B06`):**
   - Solvers (`euvPhotonEnergyEv`, `depthOfFocusNm`, `impliedK1`, `rooflinePoint`, `createState`, `wkbTunnelTransmission`, `createWavePacketSim`, `createDieThermalGrid`, `setAmbient`, `infiniteWellEnergies`, `infiniteWellAnalyticEv`, `maxAbsErr`, `parseSafetensors`, `parsePort`) now throw `RangeError` / `Error` on `NaN`, non-positive denominators, negative thicknesses, or malformed binary buffers rather than silently returning `NaN`/`Infinity`.
3. **Sub-Pixel Stochastic LER & Smooth DVFS Thermal Controller:**
   - `simulateStochasticResist` now interpolates sub-pixel falling-edge crossings around the nominal aerial edge (eliminating v2.2 low-dose pinhole inversion).
   - `createDieThermalGrid().step(dtSec)` sub-cycles closed-loop DVFS updates at `<= 0.5 s` intervals when `dtSec > 0.5`, eliminating the v2.2 30-second bang-bang sawtooth oscillation on uncooled runs.
4. **HTTP Server Contract (`tools/serve.mjs`):**
   - Rejects non-`GET`/`HEAD` requests with `405 Method Not Allowed`, adds `GET /healthz`, serves `.jpg`/`.jpeg` as `image/jpeg`, and catches stream errors with `500` instead of crashing.
