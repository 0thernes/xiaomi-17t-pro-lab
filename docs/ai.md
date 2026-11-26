# AI Model Provenance, Evaluation, and Resource Budget (`docs/ai.md`)

Build Standard v1.2.0 **A40** and **B34** documentation for the embedded neural language model shipped with `xiaomi-17t-pro-lab`.

## 1. Pinned Model Artifact

- **Model:** `roneneldan/TinyStories-8M` (8.3M-parameter GPT-Neo: 8 layers, 16 heads, `d = 256`, alternating global / 256-token local attention, `gelu_new`, vocab 50,257), converted from upstream F32 to F16 via `tools/pack-tinystories.mjs`.
- **Storage & Pinning:** Deterministically split into 9 byte-exact shards under `vendor/tinystories/shards/model.f16.safetensors.part00..part08` (each `≤ 4,500,000` bytes < 5 MiB A24 limit).
- **Cryptographic Hash:** Full reassembled checkpoint (`39,417,097` bytes) SHA-256 = `9999a42aa4cb668c19760c02448ab97b0458c89871013fa8d0c5cae2a569c28f` (`vendor/tinystories/shards.json` and `vendor/tinystories/SHA256.txt`), verified in-browser via WebCrypto `crypto.subtle.digest("SHA-256", ...)` and in Node tests.
- **Execution Boundary:** Runs strictly client-side on the visitor's JavaScript CPU thread (`src/workloads/gpt-neo.js`). **Never** calls external APIs, **never** sends prompts over the network, and **never** claims execution on MediaTek NPU 990.

## 2. Deterministic Evaluation Suite (`evals/run_tinystories_eval.mjs`)

Run via `node evals/run_tinystories_eval.mjs` (or `just evals`):

- Verifies every shard's byte length and SHA-256 plus reassembled full-file SHA-256;
- Evaluates 5 canonical narrative prompts (8 greedy tokens each), pinning bit-exact token IDs for `"Once upon a time"` → `[11, 612, 373, 257, 1310, 2576, 3706, 20037]` (`", there was a little girl named Lily"`);
- Checks exact full-vocabulary (50,257-token) Shannon entropy finiteness (`0 < H < 16` bits);
- Verifies Neuralese intervention sensitivity: ablating layer `h.4` shifts next-token entropy by `ΔH = 0.519` bits (`> 0.05` bit threshold).
- Writes structured JSON telemetry to `results/tinystories-eval.json`.

## 3. Resource, Network, and Latency Budget

- **Zero Financial / API Cost Budget:** `\$0.00` per invocation (100% static local/browser inference, zero third-party inference API keys or metered calls).
- **Network Transfer Budget (First Load on `#/work/llm` only):** `39.4 MB` weights (9 parallel HTTP/2 shards, lazy-loaded ONLY when the user presses _Stream Generate_ — `0 B` transferred on all other 18 routes) + `1.25 MB` tokenizer (`vocab.json` + `merges.txt`).
- **RAM Expansion Budget:** `~85 MB` peak browser heap when unpacking F16 → Float32Array weights in `src/workloads/safetensors.js` (cached once per tab session).
- **Compute Latency Budget:** Target `≤ 15 s` cold parse + `≤ 500 ms/token` greedy CPU decode on desktop Node 22 (measured in `results/tinystories-eval.json`).
