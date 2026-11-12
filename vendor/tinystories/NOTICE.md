# TinyStories-8M

- `model.f16.safetensors` is float16 packed from `roneneldan/TinyStories-8M` `refs/pr/1` `model.safetensors`.
- Pinned F32 sha256: `d40feb886ae2039dc1d2afffa63400acd0df65663c25eea2f6f554dce2d656aa` (Neuralese `tools/fetch-model.mjs`).
- F16 sha256 is `SHA256.txt` in this directory.
- `vocab.json` and `merges.txt` are the files on the model repo’s main branch.
- The forward pass in `src/workloads/gpt-neo.js` is this lab’s loop for that checkpoint. Neuralese (MIT, Alex Donahue) is the project that established the browser layout of the same weights.
- The F32 file is about 107 MB and is not committed.
