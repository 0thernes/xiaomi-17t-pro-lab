# Measurements and their limits

## Timers

Chrome’s explicit timers are about 100 µs when the page is not cross-origin isolated, and about 5 µs when it is. Those two numbers are **cited** from Chrome’s documentation (`specs.browser` in `specs.json`). The lab also **measures** the smallest positive `performance.now()` delta on this load and prints both.

The dev server sends:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

GitHub Pages cannot set those headers. `coi-serviceworker.js` rewrites responses to add them. It is not registered on a normal visit, because a reload loop is hostile. The CPU page has **Tighten timers**, which registers the worker, sets `sessionStorage`, and reloads once. If the reload is still not isolated, it does not reload again.

Pointer-chase trials run until the elapsed time clears many quanta (about 24 ms). The reported uncertainty is `resolution / sqrt(12) / steps`, converted to nanoseconds per load. A knee is “the largest step between these two working sets,” not “L3 latency = N cycles.”

L1 capacity is UNKNOWN, so the chart does not draw an L1 line. Official markers are L2 512 KB (C1-Pro), 1 MB (C1-Premium), 2 MB (C1-Ultra), SLC 10 MB, and L3 16 MB. The SLC is smaller than the L3, so a CPU chase often has no separate SLC shelf. That is stated on the page.

## STREAM

Copy, scale, add, and triad follow McCalpin’s byte counts. The page runs the triad on Float64 arrays and reports GB/s as browser memory bandwidth. It is not LPDDR5X bandwidth. Theoretical DRAM GB/s is UNKNOWN without a channel width.

## WASM SIMD

`src/sim/kernels.wat` is the source. `kernels.wasm` is produced by `wat2wasm` (the command is in the WAT comment). Each SIMD iteration is four `f32x4.add` operations. The scalar kernel does four `f32.add` operations. The ratio is a software ceiling on whatever core the browser thread got. It is not SME2 and not SVE.

## GPU

WebGPU compute writes C = A B for N = 32 and maps the buffer back. The clock measurement includes that readback; it is not a Mali timestamp. WebGL2 does the same product in a fragment shader into an `R32F` target (`EXT_color_buffer_float`) and `readPixels` it back. Both paths compare against a Float64 CPU product. `?webgl=1` forces the fallback. N above 128 is rejected on the WebGL2 path because the shader loop is bounded.

The official peak formula is `12 × 256 × f` FP32 ops/s, FMA counted as two. f stays symbolic unless the listener moves an illustrative slider.

The binning picture counts axis-aligned boxes of random triangles into a grid. It is not Deferred Vertex Shading and not a firmware trace. Warp width 16 and 2048 threads are cited Arm counter-reference figures, not a measurement of that drawing.

## NPU

`navigator.ml` is reported if present. The matmuls do not use it. INT8 uses a symmetric scale `max(|x|)/127`. The 1.58-bit path is absmean ternarization: `clip(round(W / mean|W|), -1, 1)`, and `log2(3)` is the bits per weight. RMSE is against the FP32 product of the same matrices. A context slider computes `tokens × 256 × 2` bytes and does not allocate a 128K buffer. TOPS and tokens/s stay UNKNOWN. MT6990 versus MT6993Z is shown as an unresolved conflict.

## Lithography

`CD = k1 · λ / NA` with λ = 13.5 nm. k1 = 0.25 gives about 10.23 nm at NA 0.33 and 6.14 nm at NA 0.55. ASML’s published 13 nm and 8 nm figures imply a higher practical k1; both are shown.

The aerial image is an equal-weight 1D Abbe sum. For each source frequency, mask spectrum bins outside `|f − f_s| ≤ NA/λ` are zeroed, the field is inverse-transformed, and intensities add. A clear field returns intensity 1. A fine grating whose first order misses the coherent pupil goes flat; a coarse grating keeps contrast. This is not a TSMC OPC deck. High-NA is not claimed for N3P. N3P pitches are UNKNOWN, so N3’s 45 nm CPP is not copied onto them.

## Transistor

The infinite well uses a three-point Laplacian in eV and nm. Jacobi eigenvalues are compared with `n² π² ħ² / (2 m L²)`. ħ and m_e are CODATA 2018. The well width is a slider, not a fin width.

Kronig–Penney uses the Dirac comb `cos(ka) = cos(αa) + P sin(αa)/(αa)`. P = 0 is free. At αa = π the right-hand side is −1. Above that, a large P opens a gap. The period is the NIST silicon lattice parameter used as a model spacing, not a MediaTek TEM.

The FinFET sketch uses `λ = sqrt(ε_si t_si t_ox / (2 ε_ox))` with textbook relative permittivities 11.7 and 3.9. Thicknesses are illustrative. The real high-k stack, fin height, and fin count are UNKNOWN. GAA nanosheets are mentioned only as the TSMC N2 contrast.

## Quality tier

`src/quality.js` draws a few fullscreen fragments, calls `gl.finish`, and records the median. SwiftShader, llvmpipe, and a slow probe select **low** (no PMREM, no bloom, pixel ratio 1, less metallic shading so the body is still visible). A fast discrete GPU on a fine pointer can select **ultra**, still capped at pixel ratio 2. `matchMedia("(max-width)")` and orientation are not inputs. `?tier=high` forces a tier for checks.

## What a browser cannot see

C1 decode width, ROB size, pipeline depth, `PMMIR_EL1.SLOTS`, Mali CSF queue occupancy, the 32 KB cache hit rate, NPU 990 dispatch, and the boot chain. The A64 decoder only accepts documented encodings.
