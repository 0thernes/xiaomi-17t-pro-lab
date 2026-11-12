# Xiaomi 17T Pro Lab — deep dive (materials, lithography, bare metal, teardown, visualizations)

**Compiled:** 12 November 2026, America/Los_Angeles  
**Companion:** [`specs-dossier.md`](specs-dossier.md), [`specs.json`](specs.json), [`cpu-gpu-npu-deep.md`](cpu-gpu-npu-deep.md), [`taxonomy.json`](taxonomy.json).  
**Rule:** cited values only; unpublished items are **UNKNOWN** or **UNCONFIRMED**. Do not treat Dimensity 9500 / TSMC **N3P** as GAA — TSMC’s official 3 nm family is **FinFET**; **nanosheet GAA** is official on **N2**.

The taxonomy zoom model is a **floor of about 10 levels, not a cap**. Branches follow real structure: some CPU/GPU/NPU paths go deeper (ISA → µarch → ports → SRAM/standard cell → lithography → band structure); others stop when published evidence stops. No filler levels.

---

## 1. Materials science

### 1.1 Silicon and the transistor architecture of this SoC

| Topic | What is known | Source | Status |
| :--- | :--- | :--- | :--- |
| Foundry / node | MediaTek: Dimensity 9500 uses **TSMC N3P**. Xiaomi: “3 nm process.” | [MediaTek D9500 product page](https://www.mediatek.com/products/smartphones/mediatek-dimensity-9500); [Xiaomi specs](https://www.mi.com/global/product/xiaomi-17t-pro/specs/) | confirmed |
| Device architecture | TSMC: in 2022 it moved **3 nm FinFET (N3)** into HVM. N3E and **N3P** are later members of that FinFET family. **N2** is TSMC’s **first-generation nanosheet** (GAA) technology (HVM 4Q25 per TSMC). | [TSMC 3 nm](https://www.tsmc.com/english/dedicatedFoundry/technology/logic/l_3nm); [TSMC logic / N2](https://www.tsmc.com/english/dedicatedFoundry/technology/logic) | confirmed |
| N3P vs N3E | TSMC: “**N3P is an optical shrink of N3E**,” with added performance/power/density, and “compatible with N3E’s design rules.” 2023 symposium PR: vs N3E, +5% speed at same leakage, 5–10% lower power at same speed, 1.04× chip density; HVM scheduled 2H 2024. | [TSMC smartphone tech](https://www.tsmc.com/english/dedicatedFoundry/technology/platform_smartphone_tech_advancedTech); [TSMC PR 26 Apr 2023](https://pr.tsmc.com/english/news/3021) | confirmed |
| High-k / metal gate stack | Not disclosed for N3P on TSMC’s public 3 nm pages. HKMG has been used on TSMC logic since much older nodes, but the **exact dielectric (e.g. HfO₂) and work-function metals for N3P are UNKNOWN**. | TSMC public N3 pages | unknown (N3P stack) |
| GAA vs FinFET on this phone | **FinFET.** Do not draw GAA nanosheets for the Dimensity 9500 die. GAA belongs on an N2 (or later) branch of the taxonomy, as a contrast node, not as this SoC. | TSMC 3 nm / N2 pages | confirmed |

### 1.2 Interconnects, low-k, packaging

| Topic | What is known | Source | Status |
| :--- | :--- | :--- | :--- |
| BEOL metals (Cu, Co, Ru) | Not published for N3P by TSMC or MediaTek. Historical TSMC SoC BEOL is copper-based (TSMC’s public 0.13 µm page already advertised a low-k copper SoC process). Whether N3P uses Co or Ru liners/vias is **UNKNOWN officially**. SemiAnalysis commentary on IEDM 2022 N3E “believes” a Ru liner — **UNCONFIRMED**, not used as a fact in the app. | TSMC public pages; treat forum/analyst liner guesses as unconfirmed | unknown (N3P metals) |
| Low-k dielectrics | IEDM 2022 N3 paper (as reported by SemiWiki) discussed **low-k spacers** vs air-gap for contacted-gate-pitch scaling on **N3**, not a published N3P stack recipe. N3P spacer/ILD chemistry: **UNKNOWN**. | [SemiWiki, IEDM 2022 TSMC 3 nm](https://semiwiki.com/semiconductor-manufacturers/tsmc/322688-iedm-2022-tsmc-3nm/) | unconfirmed for N3; unknown for N3P |
| Package of this phone | Xiaomi and MediaTek do not publish the 17T Pro’s AP package type. **InFO is not evidenced.** TechInsights (13 Feb 2026) describes a **package-on-package (PoP)** with **MT6993Z** and a **Samsung LPDDR5X** memory package — on **Vivo X300 Pro and OPPO Find X9 Pro**, not the Xiaomi 17T Pro. Do not assume the same memory vendor on Xiaomi. | [TechInsights APQ](https://www.techinsights.com/blog/mediatek-dimensity-9500-advanced-packaging-quick-look) | unknown for this phone; PoP confirmed on other D9500 devices |
| Part number | Google LiteRT lists Dimensity 9500 as **MT6990**. TechInsights uses **MT6993Z**. Official MediaTek pages fetched for this dossier did not settle the marking. **Conflict / unconfirmed.** | [LiteRT MediaTek](https://developers.google.com/edge/litert/next/mediatek); TechInsights | unconfirmed |

### 1.3 Display, glass, frame, battery

| Topic | What is known | Source | Status |
| :--- | :--- | :--- | :--- |
| Panel | Official: 6.83" **AMOLED**, flat, flexible, on-cell. Supplier, TFT backplane (LTPO vs non-LTPO), and emitter chemistry: **UNKNOWN**. PWM 3840 Hz is GSMArena-only (**UNCONFIRMED** officially). | Xiaomi spec / FAQ | partial |
| Cover glass | **Corning Gorilla Glass 7i.** Corning PI sheet: density 2.41 g/cm³, Young’s modulus 77 GPa, Poisson 0.22, typical thickness 0.50–0.70 mm, refractive index 1.51 (590 nm), ≥90.5% transmission at 0.6 mm. Compared by Corning to competitive **lithium aluminosilicate** glasses; exact Corning melt recipe is not published. | [Corning GG7i PI sheet](https://www.corning.com/microsites/csm/gorillaglass/PI_Sheets/Corning_Gorilla_Glass_7i_PI%20Sheet.pdf) | confirmed (datasheet properties) |
| Rear glass / frame | Official spec names GG7i for the display. **Rear GG7i glass + aluminum-alloy frame** are stated by GSMArena (spec and review). Not on the official Xiaomi spec sheet. | GSMArena | outlet-confirmed; official-sheet silent |
| Battery | Official: **7000 mAh typ / 6830 mAh rated**, **silicon-carbon**, **lithium polymer**, **dual-cell**, suppliers **ATL** and **LIWINON**, high-voltage **4.58 V**. Si/C anode mass fraction, cathode chemistry (NCM/NCA/LFP, etc.): **UNKNOWN**. | Xiaomi spec + FAQ | confirmed (official wording); details unknown |

**Generic crystal physics (not a MediaTek disclosure):** ideal Si diamond-cubic lattice parameter *a* = 5.431 020 511(89) × 10⁻¹⁰ m in vacuum at 22.5 °C (NIST/CODATA 2018 X-ray constants). [NIST PDF](https://physics.nist.gov/cuu/pdf/xray_2018.pdf). Indirect Si band gap ≈ 1.12 eV at 300 K is the standard textbook value (e.g. Sze, *Physics of Semiconductor Devices*) — use as background physics, not as a process-kit parameter.

---

## 2. Lithography

| Topic | Value / statement | Source | Status |
| :--- | :--- | :--- | :--- |
| Rayleigh criterion | **CD = k₁ · λ / NA**. Physical limit k₁ = 0.25. | [ASML, Rayleigh criterion](https://www.asml.com/en/technology/lithography-principles/rayleigh-criterion) | confirmed |
| EUV wavelength | **13.5 nm** | [ASML EUV systems](https://www.asml.com/en/products/euv-lithography-systems) | confirmed |
| 0.33-NA EUV (NXE) | NA = **0.33**; ASML: prints features at **13 nm** resolution; used by chipmakers for foundation layers of **7 nm, 5 nm and 3 nm** nodes. Tin-drop LPP source, multilayer mirrors, 4× reduction, vacuum. | ASML EUV systems | confirmed |
| High-NA EUV (EXE) | NA = **0.55**; ASML: **8 nm** resolution; platform “will support HVM in 2025–2026,” “starting at the **2 nm Logic** node.” | ASML EUV systems | confirmed (tool); **not** a claim that N3P uses High-NA |
| Is N3P High-NA? | **UNKNOWN / not claimed.** ASML associates NXE 0.33-NA with 3 nm-class layers and High-NA with 2 nm-class and beyond. Do not assert High-NA on Dimensity 9500. | ASML EUV systems | unknown (N3P mask set) |
| Worked k₁-limit numbers (computed, not an ASML “N3P pitch”) | λ=13.5 nm, k₁=0.25: NA 0.33 → CD_min ≈ **10.23 nm**; NA 0.55 → CD_min ≈ **6.14 nm**. ASML’s published 13 nm / 8 nm figures imply more conservative practical k₁. | Derived from ASML equation + λ, NA | confirmed as arithmetic; not a TSMC ground rule |
| Multipatterning | TSMC’s public smartphone page notes EUV reduced mask-layer complexity from N7+ onward. N3E is widely reported (Tom’s Hardware summarizing TSMC) as using **fewer EUV layers than N3 and avoiding EUV double patterning**. N3P-specific mask counts: **UNKNOWN**. | TSMC smartphone tech; Tom’s Hardware 16 May 2024 (secondary) | partial |
| Pitches (CPP, M0/M1) | IEDM 2022 **N3** paper disclosed **contacted gate / poly pitch (CPP) of 45 nm** (SemiWiki report of the TSMC paper). SemiAnalysis reports **N3E M0 pitch 23 nm**. **N3P pitches are not officially published.** Because N3P is an “optical shrink” of N3E that remains “design-rule compatible,” do not copy 45 nm / 23 nm onto N3P as facts. | SemiWiki IEDM 2022; SemiAnalysis IEDM notes | N3/N3E as reported; **N3P UNKNOWN** |

---

## 3. Bare metal and machine code

### 3.1 ISA, exception levels, MMU

Dimensity 9500’s cores are official **Arm C1-Ultra / C1-Premium / C1-Pro**, **Armv9.3** with **SME2** (MediaTek product page; Arm C1-Ultra page: **Armv9.3-A**, SVE2, SME2).

From Arm’s **C1-Pro Software Optimization Guide** (issue 05, 109879_0102_05_en, 2025-09-10, Non-Confidential) and the **C1-Ultra TRM feature list**:

- AArch64 at **EL0–EL3**; 40-bit PA, 48-bit VA; MMU; GIC CPU interface; SVE with **128-bit vector length** and **SVE2**.
- C1-Pro: SME/SME2 are **optional** via a shared **C1-SME2** unit in the **C1-DSU**, and are **required if the cluster includes a high-performance core**. This SoC includes a C1-Ultra, so SME2 is expected to be present, matching MediaTek’s SME2 marketing.
- Rename-slot count is discoverable in hardware via **PMMIR_EL1.SLOTS** (C1 telemetry specs). Numeric decode width / ROB depth are **not published** as integers in the documents retrieved for this dossier (telemetry text says “N-slot wide decode”).

**A64 encodings** are fixed 32-bit little-endian words ([Arm A-profile ISA](https://developer.arm.com/documentation/ddi0602)):

| Mnemonic | Encoding (hex) | Notes |
| :--- | :--- | :--- |
| `NOP` | `D503201F` | Hint space |
| `RET` | `D65F03C0` | `RET X30` |
| `SVC #0` | `D4000001` | Exception to higher EL |
| `ADD X0, X1, X2` | `8B020020` | `sf=1`, shifted-register ADD |

These illustrate the ISA; they are not Xiaomi firmware dumps.

### 3.2 Boot chain

**The Xiaomi 17T Pro / Dimensity 9500 boot chain is not published** in the official Xiaomi or Dimensity 9500 materials used here. **UNKNOWN** for this device.

Do **not** paste MediaTek **Genio / IoT Yocto** boot (BootROM → TF-A BL2 → BL31 / OP-TEE BL32 / U-Boot BL33 → Linux) onto this phone — that flow is documented for a different MediaTek product line ([IoT Yocto boot](https://genio.mediatek.com/doc/iot-yocto/latest/sw/yocto/boot.html)). Historical MediaTek **Android** phones often used BootROM → **Preloader** → **LK** → TEE/kernel, but that is a family pattern, not a 17T Pro citation.

What *can* be taught, with caveats:

- Arm exception model: Reset into a high EL, then EL3 (secure monitor / TF-A *if present*), EL2 (optional hypervisor), EL1 (HyperOS / Android 16 kernel), EL0 (apps / the Lab in Chrome).
- Android Verified Boot and TrustZone are industry-standard expectations; **vendor-specific key hierarchy and partition layout are UNKNOWN**.
- Storage boot media is UFS 4.1 (device official). Boot-from-UFS details: UNKNOWN.

### 3.3 Memory map

Physical map, DRAM base, I/O holes, and reserved regions for this phone: **UNKNOWN** (no public Xiaomi/MediaTek memory map). Architectural facts: 48-bit VA / 40-bit PA on C1-Pro SOG; stage-1 (and optionally stage-2) translation; caches L1 (size UNKNOWN) / L2 as published per core / 16 MB L3 / 10 MB SLC.

### 3.4 GPU command submission

Official Arm Mali G1 counter reference (applies to G1-Ultra/Premium/Pro): the driver writes a **command stream**; the **Command Stream Front-end (CSF)** interprets it, updates render state, and enqueues work onto hardware queues. Arm 5th Gen is **tile-based**; **Deferred Vertex Shading (DVS)** splits a render pass into a **Binning** phase (bin primitives) and a **Main** phase (shade tiles). Queues include Binning, Main, Compute, and a **Neural** queue for data-graph/neural work. See [`cpu-gpu-npu-deep.md`](cpu-gpu-npu-deep.md).

---

## 4. Teardown / exploded-view breakdown

No official Xiaomi 17T Pro board-level teardown was used in this research. The following is a **block list suitable for exploded 3D**, mixing **confirmed** presence with **UNKNOWN** geometry. Do not invent connector pinouts or IC markings.

**Chassis / thermal (exploded outside-in)**

1. Cover glass (GG7i) + oleophobic layer  
2. AMOLED module (polarizer / touch / OLED / backplane) — stack details UNKNOWN  
3. Mid-frame / aluminum-alloy frame (outlet-confirmed) + buttons, SIM tray  
4. Rear glass (outlet-confirmed GG7i) + camera island / Leica Summilux decoration  
5. Xiaomi **3D IceLoop** thermal path — vapor chamber geometry UNKNOWN  
6. Graphite / foam / shields — UNKNOWN  
7. In-screen fingerprint module (principle UNKNOWN officially)

**Main board (logical, not a traced PCB)**

8. Application processor **Dimensity 9500** (likely PoP with LPDDR5X, by analogy to other D9500 phones — **UNCONFIRMED on this board**)  
9. UFS 4.1 package (vendor UNKNOWN; 2- vs 4-lane UNKNOWN)  
10. PMIC(s) — part numbers UNKNOWN  
11. Charging front-end for 100 W PPS / 50 W wireless — UNKNOWN  
12. RF front-ends / PAs / LNAs / filters for the published band lists — ICs UNKNOWN  
13. Antenna array (cellular, Wi-Fi 7 2×2, BT, GNSS, NFC) — placement UNKNOWN  
14. Wi-Fi/BT (on-SoC MAC + unknown FEM)  
15. USB-C connector / USB mux — SuperSpeed generation unconfirmed officially  
16. Audio codec / amps / dual speakers  
17. Front 32 MP + rear 50/50/12 camera modules, OIS actuators, flicker/color-temperature sensors  
18. IR blaster, X-axis linear motor  
19. Dual-cell Si-C battery + flexes  
20. 3-mic array  

**SoC floorplan (logical blocks for a die illustration — not a measured die shot)**

- C1-DSU cluster: 1× C1-Ultra + 3× C1-Premium + 4× C1-Pro, 16 MB L3, shared C1-SME2 unit  
- 10 MB SLC / Dynamic Cache  
- Mali-G1 Ultra MC12 (12 shader cores, RTUv2, CSF, L2 slices)  
- NPU 990 + CIM Super Efficient NPU  
- Imagiq 1190 ISP + video codec  
- Rel-17 5G modem (FR1)  
- LPDDR5X PHY, UFS 4.1 4-lane controller, Wi-Fi 7 / BT 6.0, MiraVision display, GPIOs  

Third-party die-size or “30 billion transistor” figures are **UNCONFIRMED** and must not be engraved on the 3D die as facts.

---

## 5. Visualization plan (what each layer should become)

| Layer / subject | Recommended medium | Why |
| :--- | :--- | :--- |
| Phone-in-hand, exploded chassis, IceLoop, camera island | **three.js** (reuse predecessor WebGL2 pipeline; add WebGPU path if `navigator.gpu` exists) | Real 3D, cutaway, X/Y/Z slicer already proven in computer-evolution-lab |
| Board / SoC block diagram, boot-flow timeline, memory-map explorer | **HTML/CSS/SVG** | Click-to-cite boxes; no fake traces |
| CPU pipeline, cache hierarchy, pointer-chase, roofline | **p5.js** (2D) | Interactive; pairs with live measurements |
| ISA decode of a 32-bit A64 word | **HTML** + small JS | Bit-field inspector; official encodings only |
| GPU tiling / DVS binning vs main, CSF queues | **p5.js** + optional three.js tiles | Schematic animation, not a closed-source driver |
| WebGPU / WebGL2 matmul GFLOPS, bandwidth streams | **WebGPU** with WebGL2 fallback | Genuinely measurable on-device (see cpu-gpu-npu-deep) |
| Lithography: Rayleigh, NA 0.33 vs 0.55, k₁ slider | **p5.js**; optional **Python precompute** of CD tables | Exact ASML equation; do not pretend to simulate a TSMC OPC deck |
| Si lattice, band structure (E-k), FinFET cross-section vs N2 nanosheet contrast | **three.js** or p5; band plots **Python-precomputed** (numpy) | Textbook/NIST constants; clearly labeled “generic Si / TSMC public node contrast,” not a D9500 TEM |
| Battery dual-cell / charge curve | **HTML** + CSS; no invented electrochemistry | Official mAh/V/W only |
| Taxonomy navigator (the app’s spine) | **HTML/CSS** tree bound to `taxonomy.json` | One source of truth for zoom levels |

COOP/COEP (or equivalent isolation) is required if the Lab uses `SharedArrayBuffer`, WASM threads, or tight `performance.now()` loops (Chrome: 100 µs vs 5 µs). Feature-detect WebGPU; Mali-G1 Ultra class support is likely but **unconfirmed specifically**.

---

## 6. Taxonomy summary (navigation model)

[`taxonomy.json`](taxonomy.json) is the app’s navigation model. It contains:

1. **`device_taxonomy`** — major hardware branches (SoC CPU, GPU, NPU, ISP, modem, memory, storage, display, battery/PMIC, cameras, RF/antennas, board/PCB, chassis/thermal). Zoom follows real structure from the phone in hand down to materials and quantum/electronic effects. Facets at each node: structure, function, materials, dimensions/scale, physics, data/signal paths, design trade-offs, failure modes, manufacturing. Official numbers are attached where they exist; otherwise `status: unknown`.

2. **`cpu`, `gpu`, `npu`** — dedicated deep stacks (see [`cpu-gpu-npu-deep.md`](cpu-gpu-npu-deep.md)). Default spine: software/API → driver/runtime → ISA/command format → cluster/core complex → core microarchitecture → pipeline/functional unit → circuit (SRAM, adders, flops) → standard cell / **FinFET** transistor (N3P) → materials/lithography → quantum/electron transport. **Extra sub-branches** are included where citable structure exists (e.g. C1-SME2 unit, cache hierarchy L2/L3/SLC, Mali CSF queues and RTUv2, dual NPU 990 vs CIM eNPU). Depth is not padded; N3P is never labeled GAA.

Generic physics (Si lattice, Rayleigh, CMOS energy \(E=\alpha CV^{2}\)) uses NIST/ASML/textbook citations and is labeled as such, not as MediaTek lab data.
