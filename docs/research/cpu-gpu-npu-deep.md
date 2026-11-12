# CPU, GPU, and NPU deep dive — Xiaomi 17T Pro / Dimensity 9500

**Companion to** [`specs-dossier.md`](specs-dossier.md), [`specs.json`](specs.json), [`deep-dive.md`](deep-dive.md), and the machine-readable stacks in [`taxonomy.json`](taxonomy.json) (`cpu`, `gpu`, `npu`).  
**Compiled 12 November 2026, America/Los_Angeles.**

Rules are the same as the dossier: official Arm / MediaTek / Xiaomi / Khronos / TSMC / NIST / ASML first; reputable silicon write-ups second; **UNKNOWN** when a number is unpublished. Depth follows real structure (ten zoom levels are a **floor**, not a cap). Extra branches are added only where there is something citable to hang on them. **TSMC N3P is FinFET**, not GAA; GAA/nanosheet is the public TSMC **N2** contrast, never this SoC.

---

## 0. What a browser can and cannot reveal

The Lab runs in a web page. That is a feature (zero-install, same origin as the visualizations) and a hard limit.

| Can measure or demonstrate in-page | Cannot honestly claim |
| :--- | :--- |
| Wall-time of WASM / JS kernels (`performance.now()`). With COOP/COEP (or equivalent isolation), Chrome’s timer resolution tightens from **100 µs** to **5 µs**. | C1 decode width, ROB size, pipeline depth, L1 hit cycles — Arm did not publish the numeric figures used in some Chinese-language blogs (10-wide / 23-pipe). Those stay **UNKNOWN**. |
| Pointer-chase and working-set curves that *suggest* cache-level knees. Knees can be labeled against official L2/L3/SLC **sizes** (2 MB / 1 MB / 512 KB L2, 16 MB L3, 10 MB SLC) but the mapping is inferential. | Exact cache hit latency in cycles (C1-Pro SOG §3.14 was not successfully extracted here). |
| WebGPU / WebGL2 compute throughput and copy bandwidth, feature-detected at run time. | Mali hardware counters (CSF queue occupancy, DVS bin cycles, 32 KB LS/tex hits). Those need Arm’s Counter DDK / a native app, not WebGPU. |
| A64 bit-field decoder for **documented** encodings only (e.g. `NOP` `D503201F`, `RET` `D65F03C0`, `SVC #0` `D4000001`, `ADD X0,X1,X2` `8B020020`). | Xiaomi’s actual boot chain, TF-A layout, or EL3 firmware. Genio/Yocto docs must not be pasted onto this phone. |
| WebNN / WASM SIMD / a JavaScript BitNet-style matmul as a **software model**. | MediaTek **NPU 990 TOPS**, tokens/s, or CIM array dimensions — unpublished in the sources used here. LiteRT listing a `MT6990` vs TechInsights `MT6993Z` is a documented conflict, not a performance number. |

Theoretical rooflines are shown as **formulas with unknowns left symbolic** (especially GPU clock, which is **UNKNOWN** on this device; aggregator “1716 MHz” is not used).

---

## 1. CPU — Arm C1-Ultra / C1-Premium / C1-Pro on Dimensity 9500

### 1.1 Official cluster (do not flatten into one core type)

MediaTek’s Dimensity 9500 phone page and Xiaomi’s spec page agree on the 1+3+4 C1 cluster, TSMC **N3P**, Armv9.3 + SME2:

| Core | Count | Official clock | Official private L2 | Role |
| :--- | ---: | ---: | ---: | :--- |
| Arm **C1-Ultra** | 1 | up to **4.21 GHz** | **2 MB** | Prime |
| Arm **C1-Premium** | 3 | up to **3.5 GHz** | **1 MB** | Performance |
| Arm **C1-Pro** | 4 | up to **2.7 GHz** | **512 KB** | Efficiency |

Shared: **16 MB L3**, **10 MB system-level cache (SLC)**. Sources: [MediaTek Dimensity 9500](https://www.mediatek.com/products/smartphones/mediatek-dimensity-9500), [Xiaomi 17T Pro specs](https://www.mi.com/global/product/xiaomi-17t-pro/specs/), [Arm C1-Ultra](https://www.arm.com/products/silicon-ip-cpu/c1-ultra).

L1 I/D **absolute** sizes are **UNKNOWN**. MediaTek only says “100% bigger L1 cache” versus the previous generation. Aggregator “192 KB L1” is not used. C1-Ultra TRM pages existed but returned HTTP 403 from this research environment; they are not treated as transcribed.

Chips and Cheese has **no** dedicated C1-Ultra / Dimensity 9500 microarchitecture article in the sources reviewed. A later C2-Ultra piece is only qualitative versus C1-Ultra and **must not** be used as C1 numbers. A C1-Ultra Software Optimization Guide URL in one fetch actually served **C2-Ultra** SOG content — those figures are discarded.

### 1.2 ISA, SME2, MMU (cited)

- **Armv9.3-A**, SVE2, SME2 ([Arm C1-Ultra](https://www.arm.com/products/silicon-ip-cpu/c1-ultra); MediaTek: “Leading Armv9.3 support with new SME2”). Xiaomi FAQ saying only “Armv9” is incomplete, not contradictory.
- C1-Pro Software Optimization Guide (document **109879_0102_05_en**, **2025-09-10**, [Arm 109879](https://developer.arm.com/documentation/109879)):
  - **13 issue pipelines**
  - **1 µOP/cycle** issue per pipeline (as stated in that SOG)
  - a macro-op (**MOP**) **may split into 2 µOPs**
  - SVE vector length **128-bit**
  - physical address **40-bit**, virtual address **48-bit**
  - exception levels **EL0–EL3**
  - **SME2 is required** if the cluster contains a high-performance core (this cluster does)
- C1-Premium public telemetry diagram (Arm): functional units drawn as **Branch, ALU×3, FADD×2, FMUL×2, IMAC, AGU, FDIV, plus SME2**. Decode is described as “**N-slot**”; the numeric width is exposed to software via **`PMMIR_EL1.SLOTS`** and is **UNKNOWN** as a published constant here. Do not substitute unverified “10-wide / 23-pipe” blog claims.
- C1-DSU (DynamIQ Shared Unit) is the official interconnect/L3 home for C1 clusters; per-phone snoop-filter / slice geometry for the 9500 is **UNKNOWN**.

### 1.3 CPU zoom stack (15 levels; facets at each)

Facets used throughout: **structure, dataflow, timing/latency, throughput, power/energy, materials, physics, ISA/software interface, design trade-offs**. Generic physics is labeled as such.

#### L1 — Software / API
- **Structure:** App process: Java/Kotlin (ART) and/or NDK (C/C++/Rust), libc, pthreads, Java executors, optional OpenMP. SME2/SVE2 reached from native via ACLE / compiler target options, not from Java.
- **Dataflow:** bytecode or ELF → interpreter / JIT / AOT → user-mode A64.
- **Timing:** request/response and frame times (ms), not cycle-accurate.
- **Throughput:** threads scheduled across the 1+3+4 cluster by CFS/Energy Model; which core a JS worker lands on is **not** exposed to the page.
- **Power:** Android power HAL / hints; app-visible APIs are coarse (`POWER_USAGE`, thermal status).
- **Materials / physics:** none at this layer.
- **ISA/software:** no raw MSR access from the browser; `PMMIR_EL1` is EL1+.
- **Trade-off:** portability vs SME2 use — a Web app will almost never hit SME2.

#### L2 — Driver / runtime / OS
- **Structure:** HyperOS 3 (Android 16) kernel, cpufreq/cpuidle, thermal, CMA, binder. Exact GKI version and Xiaomi tree: **UNKNOWN**.
- **Dataflow:** syscalls, binder, ion/dmabuf for camera/GPU, cgroup CPU sets.
- **Timing:** tick / hrtimer; DVFS dwell times unpublished.
- **Throughput / power:** Energy Aware Scheduling places work on C1-Pro first, then Premium/Ultra, subject to Xiaomi’s undisclosed tunables.
- **Trade-off:** sustained scores (see head-to-head Steel Nomad) depend as much on this policy and IceLoop cooling as on peak GHz.

#### L3 — ISA and exception model
- **Structure:** A64 fixed 32-bit encodings; SVE2 VL=128-bit on C1-Pro SOG; SME2 streaming/ZA arrays (ZA geometry for this implementation: **UNKNOWN** beyond “SME2 present”).
- **Dataflow:** fetch → decode MOP → (optional split to 2 µOPs) → issue.
- **Timing:** architected memory order; `DMB`/`DSB`/`ISB` as in Arm ARM. Cycle costs **UNKNOWN**.
- **ISA/software:** EL0 user, EL1 kernel, EL2 if used, EL3 firmware — all required by the SOG address/EL statement; firmware vendor image is **UNKNOWN**.
- **Physics:** none.
- **Trade-off:** 128-bit SVE is narrower than some server VLs; SME2 exists to recover outer-product throughput for matrix work.

#### L4 — Cluster / C1-DSU / SLC
- **Structure:** one DSU-hosted cluster, 8 cores, 16 MB L3, 10 MB SLC also serving GPU/NPU/ISP (MediaTek “system cache” wording). Slice count **UNKNOWN**.
- **Dataflow:** intra-cluster coherence via DSU; SLC as last on-die stop before LPDDR5X.
- **Timing / throughput:** L3 and SLC hit latency **UNKNOWN**; capacity is official.
- **Power:** shared L3/SLC leakage is a design reason not to oversize; official leakage numbers **UNKNOWN**.
- **Trade-off:** 10 MB SLC helps GPU/NPU working sets (MediaTek marketing) at the cost of die area — area not published.

#### L5 — Core types (Ultra vs Premium vs Pro)
- **Structure:** three different Arm C1 products, not a single µarch with clock bins. L2: 2 MB / 1 MB / 512 KB.
- **Dataflow:** big.LITTLE-style (more precisely DynamIQ) task migration.
- **Timing:** 4.21 / 3.5 / 2.7 GHz official caps — actual 17T Pro DVFS table **UNKNOWN**.
- **Throughput:** MediaTek does not publish a SPECrate-style official split.
- **Trade-off:** one prime at 4.21 GHz vs Samsung’s official 4.74 GHz Galaxy peak (see head-to-head) — different ISAs, not a single-thread proof.

#### L6 — Core microarchitecture (what is actually published)
- **Structure (C1-Pro SOG):** 13 issue pipelines; 1 µOP/cycle/pipeline; MOP may split to 2 µOPs.
- **Structure (C1-Premium diagram):** Branch, 3×ALU, 2×FADD, 2×FMUL, IMAC, AGU, FDIV, SME2.
- **Dataflow:** in-order vs out-of-order window sizes **UNKNOWN** (do not invent ROB entries).
- **Timing:** pipeline depth **UNKNOWN**.
- **Throughput:** bounded by the 13-pipe figure only in the sense Arm stated; width of the frontend is N-slot, not a public integer.
- **Trade-off:** document what is known, leave depth/ROB as lab measurements for a **native** perf-counter app, not the web Lab.

#### L7 — Frontend (predict / decode / rename)
- **Structure:** N-slot decode; `PMMIR_EL1.SLOTS` is the official discovery register. Predictor geometry **UNKNOWN**.
- **Dataflow:** instruction bytes from L1-I (size UNKNOWN) → decode.
- **ISA/software:** a user-mode app on the phone *could* read `PMMIR_EL1` from a privileged context only; the browser cannot.
- **Live-lab implication:** the Lab should display “read SLOTS on a native helper (optional), never guess 10.”

#### L8 — Execution pipelines / functional units
- **Structure:** as in the Premium telemetry list; Ultra/Pro FU diagrams were not independently fetched as a complete official graphic here — **do not copy Premium FUs onto Ultra as fact**.
- **Throughput:** integer vs FP vs SME2 issue slots are only partly specified.
- **Power:** FDIV and SME2 are the heavy units; no official pJ/op.
- **Physics (generic CMOS, not a MediaTek lab number):** dynamic energy \(E_{\mathrm{dyn}} \approx \alpha C V^{2}\) per toggle, power \(P_{\mathrm{dyn}} \approx \alpha C V^{2} f\), plus leakage \(P_{\mathrm{leak}} \approx I_{\mathrm{leak}} V\).

#### L9 — C1-SME2 unit (sub-branch, not filler)
- **Structure:** streaming SME2 datapath required in this cluster (SOG). ZA tile geometry, SME vector length, and number of outer-product pipes: **UNKNOWN** for the 9500 tapeout.
- **Dataflow:** matrix outer products and vector ops via SME2 instructions; memory through ZA and the ordinary load/store path.
- **ISA/software:** SME2 ACLE; Android/browser will typically not emit this from JS.
- **Trade-off:** SME2 vs the separate NPU 990 for LLM decode — MediaTek positions NPU/CIM for always-on and 1.58-bit models; SME2 is the CPU path. No official tokens/s for either is used here.

#### L10 — Cache / memory-side CPU path
- **Structure:** L1-I/D (UNKNOWN KB) → private L2 (official) → L3 16 MB → SLC 10 MB → LPDDR5X. Device DRAM is official **9600 Mbps**; SoC cap is **10667 Mbps**. That is a bin, not a dossier conflict.
- **Timing:** hit/miss cycles **UNKNOWN**.
- **Throughput:** theoretical DRAM bandwidth is **not** computed as a confirmed figure (channel count / width unpublished). Aggregator “4×16 85.3 GB/s” stays unconfirmed.
- **Experiment hook:** pointer-chase working-set sweep (below).

#### L11 — MMU / translation / exception entry
- **Structure:** 48-bit VA, 40-bit PA (C1-Pro SOG). Page-table format is architected (VMSAv8-64 / VMSAv9); Xiaomi’s granule and TCR values **UNKNOWN**.
- **Dataflow:** TLB (geometry UNKNOWN) → table walks in L2/L3/DRAM.
- **ISA/software:** `SVC #0` encoding `D4000001` is the canonical EL0→EL1 call; the Lab can decode it, not trace it on-device from JS.
- **Failure modes:** translation faults, permission faults; no device-specific errata catalog is cited here.

#### L12 — Circuit (SRAM bits, adders, flops)
- **Structure:** 6T (typical) SRAM for caches, CSA/Kogge-Stone-class adders, scan flops — **generic**, not a 9500 netlist.
- **Materials:** SRAM is still CMOS on the same N3P die; cell size **UNKNOWN** (do not reuse an older N3 paper’s bit-cell area as N3P).
- **Physics:** \(t_{\mathrm{CQ}}\) and bitline delay are not published.
- **Trade-off:** 16 MB L3 is a large SRAM tax; official Vmin **UNKNOWN**.

#### L13 — Standard cell / FinFET transistor (N3P)
- **Structure:** TSMC **N3P** enhanced 3 nm **FinFET** (TSMC public logic page / MediaTek). **Not GAA, not nanosheet.** TSMC **N2** is the public GAA contrast and must be labeled as such.
- **Materials:** HKMG / Cu-Co-Ru stack for this tapeout **UNKNOWN** (see deep-dive).
- **Dimensions:** do not copy N3 CPP 45 nm or N3E M0 23 nm onto N3P. N3P pitches **UNKNOWN** in the sources used.
- **Physics:** FinFET electrostatics (fin height, number of fins) unpublished for this product.
- **Manufacturing:** EUV 13.5 nm, Low-NA 0.33 typical of TSMC 3 nm-class public discussion; High-NA 0.55 is **not** claimed for N3P.

#### L14 — Materials / lithography
- **Physics (ASML, generic):** Rayleigh criterion \(\mathrm{CD} = k_1 \cdot \lambda / \mathrm{NA}\) with \(\lambda = 13.5\,\mathrm{nm}\). Low-NA \(\mathrm{NA}=0.33\); High-NA EXE \(\mathrm{NA}=0.55\) is a contrast, not this chip.
- **Trade-off:** multipatterning vs High-NA — relevant context, not a MediaTek process recipe.

#### L15 — Quantum / electron transport
- **Structure:** crystalline Si; NIST/CODATA lattice parameter \(a = 5.431020511(89)\times 10^{-10}\,\mathrm{m}\) (22.5 °C, vacuum) — [NIST](https://physics.nist.gov/cgi-bin/Star/comp.pl) / CODATA family citations as used in the deep-dive.
- **Physics:** band transport, ballistic mean free path, direct tunneling through gate dielectrics — textbook, **not** a 9500 measurement.
- **Trade-off:** why FinFET still works at N3P (gate control) vs why TSMC moved GAA at N2 (further scaling) — public foundry story, not a Xiaomi claim.

### 1.4 Live experiment (CPU) — pointer-chase + documented A64 decoder

**What we ship in the Lab (p5.js / WASM, isolation headers on):**

1. **Random pointer-chase** over working sets from 4 KB to >32 MB, recording ns/load (or the best `performance.now()` can do). Overlay official capacities: L2 512 KB / 1 MB / 2 MB, L3 16 MB, SLC 10 MB. Label knees “consistent with,” never “this is L3 latency = N cycles.”
2. **A64 encoding inspector** for the four official encodings above (and only further encodings copied from the Arm ARM). Show bit fields, not a full disassembler dump of system firmware.
3. Optional: scalar vs WASM SIMD integer sum roofline — a **software** ceiling, not SME2.

**Computed model:** \(P_{\mathrm{dyn}} = \alpha C V^{2} f\) with \(V, \alpha, C\) symbolic; slider for \(f\) up to the official 4.21 / 3.5 / 2.7 GHz caps.

**Fails if:** the page is not cross-origin isolated (timer 100 µs smears L2 vs L3), or if we pretend a JS loop measured decode width.

---

## 2. GPU — Arm Mali-G1 Ultra MC12

### 2.1 Official identity

- **Arm Mali-G1 Ultra**, 12 shader cores (**MC12**). Xiaomi spelling “Mali G1-Ultra”; MediaTek “12-core / MC12.” [Arm Mali-G1 Ultra](https://www.arm.com/products/silicon-ip-multimedia/gpu/mali-g1-ultra), [MediaTek](https://www.mediatek.com/products/smartphones/mediatek-dimensity-9500).
- 5th Gen Arm GPU architecture, **CSF** (Command Stream Frontend), **TBDR**, **DVS** (Deferred Vertex Shading) with binning + main passes, **RTUv2** ray-tracing unit (Arm public GPU materials).
- APIs: **Vulkan 1.4** (Khronos: Mali-G1-Ultra, Arm Limited, **2025-12-19**, CTS **1.4.1.3**), **OpenGL ES 3.2**, **OpenCL 3.0**. Arm’s comparison PDF still saying Vulkan 1.3 is a documented **issue** (stale sheet); prefer Khronos + MediaTek.
- Throughput per shader core, Arm GPU PDF: **256 FP32 ops/core/cycle** and **512 FP16 ops/core/cycle**, counting FMA as **2 ops**. Device **GPU clock is UNKNOWN** — theoretical GFLOPS = \(12 \times 256 \times f_{\mathrm{Hz}} / 10^9\) FP32, with \(f\) left symbolic. Do not insert 1716 MHz.
- Counter reference ([Arm libGPUCounters Mali-G1](https://arm-software.github.io/libGPUCounters/mali_g1_counter_reference.html)): CSF; DVS binning + main; queues **Binning / Main / Compute / Neural**; warp width **16**; **2048** threads; load-store and texture caches **32 KB/core**.

### 2.2 GPU zoom stack (16 levels)

#### L1 — Application / API
- **Structure:** Vulkan 1.4, GLES 3.2, OpenCL 3.0, Android Hardware Buffer, optionally **WebGPU** / WebGL2 in the Lab.
- **Dataflow:** command buffers / draw calls → driver.
- **ISA/software:** SPIR-V (Vulkan/WebGPU) or GLSL ES; WebGPU on Chrome Android is enabled as a class for **ARM GPUs since Chrome 121** (Android 12+). **Mali-G1 Ultra specifically is unconfirmed** — feature-detect `navigator.gpu`.
- **Trade-off:** WebGPU will not expose CSF queues or RTUv2 counters.

#### L2 — Driver / runtime (Mali DDK, GLES/Vulkan)
- **Structure:** Arm Mali user-mode + kernel driver in the Xiaomi tree. **DDK version UNKNOWN**.
- **Dataflow:** descriptor mapping, shader compiler (Bifrost/Valhall-family compiler lineage is historical; G1 compiler internals unpublished here), memory heaps.
- **Failure modes:** context lost, watchdog; no 17T-Pro-specific bug list cited.

#### L3 — Command format / CSF
- **Structure:** Command Stream Frontend; work is packed into CSF command streams rather than a Mali Midgard-style job chain (Arm public CSF docs).
- **Dataflow:** userspace submits streams; firmware/CSF walks them.
- **Timing:** submission latency unpublished.
- **Trade-off:** CSF was introduced to cut CPU overhead of job management — qualitative Arm story, not a µs number for this phone.

#### L4 — Queues (Binning, Main, Compute, Neural) — extra branch
- **Structure:** four official counter-visible queues.
- **Dataflow:** graphics splits binning vs main (DVS); compute and a **Neural** queue sit beside them. The Neural queue is **not** the NPU 990; do not conflate.
- **Throughput:** occupancy only via counters (native).
- **Trade-off:** GPU-side neural vs NPU 990 vs CIM — MediaTek documents all three; routing policy on 17T Pro is **UNKNOWN**.

#### L5 — Shader-core complex (MC12)
- **Structure:** 12 cores. On-die arrangement / number of slices **UNKNOWN**.
- **Throughput:** 12 × 256 FP32 ops/cycle at unknown \(f\).
- **Power:** clock/voltage rail **UNKNOWN** (MediaTek/Xiaomi do not list a GPU GHz on the pages used).

#### L6 — Tiler / DVS / TBDR
- **Structure:** Deferred Vertex Shading, binning pass then main pass (Arm). Tile size **UNKNOWN** for G1 Ultra (do not reuse Mali-G78 16×16 as fact).
- **Dataflow:** primitives binned to tiles in on-die tile memory, then shaded.
- **Trade-off:** TBDR saves memory bandwidth vs immediate-mode; bandwidth saved on this device **UNKNOWN**.

#### L7 — Warp / thread model
- **Structure:** warp **16**, **2048** threads per core (counter reference).
- **Dataflow:** 16-wide lockstep-style warps (Arm SIMT-like model); divergence cost is real but unquantified here.
- **Timing:** occupancy vs 2048-thread cap is a teaching model, not a measured 17T figure.
- **ISA/software:** SPIR-V subgroup size may or may not equal 16 — **verify on device**, do not assume.

#### L8 — Arithmetic pipelines (FMA / FP16 / INT)
- **Structure / throughput:** 256 FP32 / 512 FP16 ops per core per cycle (FMA=2). INT and tensor-on-GPU rates **UNKNOWN**.
- **Physics:** same \(P=\alpha C V^{2} f\) model, symbolic.
- **Trade-off:** FP16 twice the op-count of FP32 on this official ratio — useful for a Lab roofline toggle.

#### L9 — RTUv2 (ray tracing) — extra branch
- **Structure:** 5th Gen RT unit, version 2 (Arm public). Box/triangle intersection throughput **UNKNOWN** (no official MT/s used).
- **Dataflow:** acceleration-structure traversal on GPU, not CPU.
- **ISA/software:** Vulkan RT / SPV ray ops; WebGPU ray tracing on Android **unconfirmed** — feature-detect.
- **Trade-off:** mobile RT vs raster; PhoneArena Steel Nomad / Wild Life Extreme measure raster/path workloads, not a dedicated RT unit bench.

#### L10 — Load-store, texture, 32 KB caches
- **Structure:** 32 KB LS and 32 KB texture cache **per core** (counter docs).
- **Dataflow:** paths from shader core → LS/tex → SLC 10 MB → LPDDR5X 9600 (device).
- **Timing:** cache hit cycles **UNKNOWN**.
- **Experiment hook:** WebGPU streaming copy vs cache-resident FMAs.

#### L11 — Pixel / blend / display scan-out
- **Structure:** on-chip tile writeout, then Display (on-cell AMOLED, 2772×1280 @ up to 144 Hz official). Composition via SurfaceFlinger / HWC — versions **UNKNOWN**.
- **Throughput:** 2772×1280×144 ≈ 0.51 Gpix/s raw (computed from official resolution and refresh; not a vendor “pixel fill” rating).
- **Trade-off:** 144 Hz vs power; official typ brightness 600 nits vs UHBM 3500 @ APL 25%.

#### L12 — Circuit (shader ALUs, tile SRAM)
- Generic CMOS / SRAM, same caveats as CPU L12. Tile-memory size **UNKNOWN**.

#### L13 — Standard cell / FinFET
- Same N3P **FinFET** die as the CPU/NPU. Clock-domain crossing between CPU and GPU **UNKNOWN**.

#### L14 — Materials / lithography
- Same N3P / EUV / Rayleigh model as CPU L14.

#### L15 — Quantum / transport
- Same NIST Si constants; no GPU-specific band-structure claim.

#### L16 — Power / DVFS / thermal (extra, citable via the phone not the GPU TRM)
- **Structure:** 3D IceLoop (official Xiaomi cooling). GPU thermal cap **UNKNOWN**.
- **Dataflow:** performance → heat → skin temperature → DVFS.
- **Evidence:** PhoneArena Steel Nomad Light **Low 1871** on 17T Pro **beats** S26 Ultra **1498** despite a lower High (2476 vs 2761). That is a system-level cooling/policy result, not a shader-core win. See [`head-to-head.md`](head-to-head.md).

### 2.3 Live experiment (GPU) — WebGPU roofline + schematic DVS

1. Feature-detect `navigator.gpu`. If absent, WebGL2 fallback, labeled as such.
2. **Compute FMAs** in a storage buffer (FP16 and FP32 if both exist) vs a large streaming copy, for a roofline plot. Overlay the official formula \(12 \times 256 \times f\) with a **user-set** \(f\) slider clearly marked “clock not officially published — slider is not a measurement.”
3. **Schematic DVS animation** (p5.js): binning queue then main queue, 16-wide warps. This is a teaching model, not a trace of the Mali firmware.
4. Require COOP/COEP if using `SharedArrayBuffer` or tight timers.

**Cannot:** read the 32 KB cache hit rate; claim Vulkan 1.4 from the browser (the page is WebGPU/WebGL); treat a JS canvas FPS as a 3DMark result.

---

## 3. NPU — MediaTek NPU 990 + CIM Super Efficient NPU

### 3.1 Official, and what is not

Confirmed on [MediaTek Dimensity 9500](https://www.mediatek.com/products/smartphones/mediatek-dimensity-9500), the [hub](https://www.mediatek.com/dimensity-9500), and the [press room](https://www.mediatek.com/press-room/mediatek-dimensity-9500-unleashes-best-in-class-performance-ai-experiences-and-power-efficiency-for-the-next-generation-of-mobile-devices):

- **NPU 990**, 9th generation, **Generative AI Engine 2.0**
- plus a **Super Efficient CIM-based NPU** (compute-in-memory) for always-on / light models
- **BitNet 1.58-bit** support, **128K** context (MediaTek wording)
- relative claims: **“2× tokens”** and **“100% faster 3B LLM”** versus the previous generation — **relative only**, no official tokens/s or TOPS in the sources used
- Software: **NeuroPilot**, Android **NNAPI**, **LiteRT**

**UNKNOWN / do not invent:** NPU 990 TOPS, MAC-array dimensions, 990-specific INT4–FP16 peak table, CIM cell count, absolute tokens/s, clock, SRAM sizes. Generic older MDLA documents are **not** the 990.

**Conflict (already in specs.json #15):** LiteRT lists Dimensity 9500 as **MT6990**; TechInsights uses **MT6993Z**. Classification: **conflict**. Do not pick a winner in the Lab UI; show both.

Xiaomi’s FAQ mentioning a “Hexagon” coprocessor is a documented **error** (Qualcomm DSP name on a MediaTek phone).

### 3.2 NPU zoom stack (14 levels)

#### L1 — Application / framework APIs
- **Structure:** apps call NNAPI, LiteRT / TFLite, or MediaTek NeuroPilot SDK. On-device LLM apps may use a vendor runtime. The **browser** sees at most **WebNN** (if the UA enables it) or a WASM fallback.
- **Dataflow:** model graph (LiteRT / MLIR-like / vendor IR) → compile → device buffers.
- **ISA/software:** no public NPU ISA documentation used here.
- **Trade-off:** portability (NNAPI) vs vendor kernels (NeuroPilot). Web pages almost always miss the 990.

#### L2 — Runtime / driver (NeuroPilot, APU daemon)
- **Structure:** user-mode NeuroPilot + kernel APU driver. Versions on HyperOS 3: **UNKNOWN**.
- **Dataflow:** job queues to NPU 990 and/or CIM eNPU. Scheduling policy **UNKNOWN**.
- **Failure modes:** model rejected (unsupported op/dtype); undocumented here per-op.

#### L3 — Model IR / command buffers
- **Structure:** compiled command streams and weight blobs. Format **unpublished**.
- **Dataflow:** weights possibly resident in SLC (10 MB official system cache) or DRAM; placement **UNKNOWN**.
- **Trade-off:** 128K context (official) vs 10 MB SLC — long contexts will spill to LPDDR5X; no official spill model.

#### L4 — Dual-engine topology (990 + CIM eNPU)
- **Structure:** two officially distinct blocks. 990 = gen-AI class; CIM = always-on / light / efficient.
- **Dataflow:** MediaTek positions CIM for small/always-on; 990 for heavier generative work. Exact dispatch rules **UNKNOWN**.
- **Power:** CIM marketing is efficiency; no official mW used.
- **Trade-off:** two engines vs Apple’s Dual 16-core Neural Engine or Qualcomm Hexagon (S26 Ultra) — different products, no TOPS comparison here.

#### L5 — NPU 990 datapath
- **Structure:** 9th-gen NPU, Generative AI Engine 2.0. Internal PE array, tensor SRAM, and DMA: **UNKNOWN**.
- **Throughput:** official **relative** 2× tokens / 100% faster 3B LLM only.
- **Dtypes:** BitNet 1.58-bit confirmed as a supported mode; a full INT4/INT8/FP16 peak table is **UNKNOWN**.

#### L6 — CIM Super Efficient NPU (sub-branch)
- **Structure:** compute-in-memory. Cell technology (SRAM-CIM vs eNVM, bit-cell, levels) **UNKNOWN**.
- **Physics (generic, labeled):** CIM reduces data movement energy versus von Neumann NPU+SRAM, at the cost of analog/digital precision and array size. No MediaTek energy/bit is cited.
- **Dataflow:** light models stay on-CIM; how “light” is defined: **UNKNOWN**.

#### L7 — BitNet 1.58-bit and quantization path
- **Structure:** ternary-style 1.58-bit weights (MediaTek “BitNet 1.58-bit”). Activation dtype **UNKNOWN**.
- **Dataflow:** quantize off-device or in runtime; 128K context window official.
- **Throughput:** no tokens/s.
- **Trade-off:** quality vs memory; not measured in this dossier.

#### L8 — On-die interconnect to SLC / DRAM / CPU / ISP
- **Structure:** shared 10 MB SLC, Imagiq 1190 ISP (official), LPDDR5X. Bus widths **UNKNOWN**.
- **Dataflow:** camera → ISP → (optional) NPU for scene/AI; LLM weights → NPU.
- **Timing:** unpublished.

#### L9 — Memory-side / weight compression
- Official marketing mentions generative features and long context; **compression ratios unpublished**. Do not invent.

#### L10 — Circuit (MAC / CIM bit-cell / SRAM)
- Generic MAC array and SRAM-CIM diagrams only, clearly textbook. 990 floorplan **UNKNOWN**. Transistor counts (aggregator “~30B”) stay **unconfirmed**.

#### L11 — Standard cell / FinFET
- Same TSMC **N3P FinFET** die. Analog CIM (if any) vs digital standard-cell MACs: **UNKNOWN** mix.

#### L12 — Materials / lithography
- Same N3P / EUV / Rayleigh model. No special “NPU metal stack” citation.

#### L13 — Quantum / device physics
- For digital MACs: same Si transport as CPU. For CIM, if analog: conductance variation / noise — textbook only, **not** a MediaTek CIM paper cited here.

#### L14 — Safety / privacy / off-device (software facet)
- On-device vs cloud LLMs; no hardware number. Included because the Lab’s NPU chapter will be asked “can the page use the 990?” — answer: **not reliably from a web origin**.

### 3.3 Live experiment (NPU) — honest software model, not a fake 990 bench

1. Detect **WebNN** (`navigator.ml` or the then-current API). If present, run a tiny matmul/conv and label the **implementation backend the UA reports** (CPU / GPU / NPU). If the UA does not name the 990, **do not** title the result “NPU 990 TOPS.”
2. If WebNN is absent: a **JS/WASM BitNet-style** (ternary weight) matmul over a user-chosen context length up to a software 128K *token buffer* — a memory/time teaching model of MediaTek’s **128K context** claim, not a measurement of their accelerator.
3. Show MediaTek’s **relative** “2× tokens / 100% faster 3B LLM” as a quoted marketing ratio with the source URL, never as an absolute tokens/s on this phone.

**Computed model:** energy per transferred bit vs MAC (generic \(E = \alpha C V^{2}\)) to explain *why* CIM exists; constants symbolic.

**Fails if:** we scrape LiteRT “MT6990” as a performance score, or we display aggregator 100 TOPS.

---

## 4. Cross-engine notes the Lab UI should keep straight

- **One die, three clients of the 10 MB SLC:** CPU, Mali-G1 Ultra (including its Neural queue), NPU 990 / CIM. Bandwidth partitioning is **UNKNOWN**.
- **“Neural” is ambiguous:** Mali Neural queue ≠ NPU 990 ≠ CIM eNPU ≠ Apple Neural Engine ≠ Qualcomm Hexagon.
- **N3P FinFET everywhere on this SoC.** N2 GAA is a foundry contrast only.
- **Head-to-head context:** PhoneArena GB6 **2903 / 9145** (17T Pro) loses to S26 Ultra **3753 / 11259**; Steel Nomad Light Low **wins vs Ultra, loses vs iPhone 18 Pro Max**. Those are system results (cooling, DVFS, SoC), not a substitute for unpublished C1 ROB/decode numbers. See [`head-to-head.md`](head-to-head.md).

