# ADR 005 — The NPU page does not run the NPU

## Status

Accepted for v0.1.0.

## Context

MediaTek NPU 990 and the CIM Super Efficient NPU are not exposed to a web origin. WebNN, when present, does not identify this block. Publishing a “TOPS” number from a JS loop would repeat the predecessor’s habit of labeling a software model as the machine.

## Decision

The route is named as concepts. INT8 and BitNet-style ternary matmul run in JS, with an int8 dot in WASM for a second rate. Both are badged MEASURED and the copy says they are not on the 990. RMSE versus FP32 is COMPUTED. Official TOPS, tokens/s, and the MAC array are UNKNOWN. The part-number conflict (LiteRT MT6990 versus TechInsights MT6993Z) is shown and not resolved. Relative marketing claims (“2× tokens”) are quoted as relative, never converted into tokens/s.

## Consequences

The page is slower and less glamorous than a fake accelerator gauge. A future native helper could read real counters; this site will not invent them.
