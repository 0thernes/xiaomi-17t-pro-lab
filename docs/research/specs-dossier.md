# Xiaomi 17T Pro & MediaTek Dimensity 9500 — cited hardware spec dossier

**Compiled:** 12 November 2026, America/Los_Angeles  
**Role:** factual foundation for the Xiaomi 17T Pro Lab web app.  
**Rule:** every figure is traced to an official source (Xiaomi, MediaTek, Arm, TSMC, JEDEC/MIPI/KIOXIA, ASML, NIST/CODATA, Khronos, Google Chrome) or a named reputable outlet. If a number is unpublished, rumored, or only repeated by aggregator sites, it is marked **UNKNOWN** or **UNCONFIRMED** and is not guessed. Official product pages are preferred over reviews. Conflicts are listed in [Conflicts](#conflicts) and each is classified as exactly one of: bug, error, issue, problem, dilemma, conflict.

Confidence in the tables: **high** = official primary page/spec/FAQ/press; **medium** = reputable secondary (GSMArena, Notebookcheck, TechInsights, SemiWiki reporting of IEDM, Khronos registry); **low** = aggregator sites or unverified teardowns, recorded only as UNCONFIRMED.

## Primary sources

| ID | Source | URL |
| :--- | :--- | :--- |
| XIAOMI-SPEC | Xiaomi Global official specs | https://www.mi.com/global/product/xiaomi-17t-pro/specs/ |
| XIAOMI-FAQ | Xiaomi UK official FAQ | https://www.mi.com/uk/support/faq/details/KA-704973/ |
| XIAOMI-LAUNCH | Xiaomi Global May 2026 launch event | https://www.mi.com/global/event/2026/xiaomi-launch-may-2026/ |
| MTK-PHONE | MediaTek Dimensity 9500 smartphone product page | https://www.mediatek.com/products/smartphones/mediatek-dimensity-9500 |
| MTK-HUB | MediaTek Dimensity 9500 marketing hub | https://www.mediatek.com/dimensity-9500 |
| MTK-TAB | MediaTek Dimensity 9500 tablet product page (same SoC spec block) | https://www.mediatek.com/products/laptops-and-tablets/tablets/mediatek-dimensity-9500 |
| MTK-PR | MediaTek press release, 22 Sep 2025 | https://www.mediatek.com/press-room/mediatek-dimensity-9500-unleashes-best-in-class-performance-ai-experiences-and-power-efficiency-for-the-next-generation-of-mobile-devices |
| MTK-INFO | MediaTek D9500 infographic PDF | https://www.mediatek.com/hubfs/MediaTek%20Assets/Pdfs/Infographics/D9500%20Infographic-%2019th%20September.pdf?hsLang=en |
| ARM-C1U | Arm C1-Ultra product page | https://www.arm.com/products/silicon-ip-cpu/c1-ultra |
| ARM-C1U-TRM | Arm C1-Ultra Core Technical Reference Manual (feature list) | https://support.arm.com/documentation/108014/0101/The-C1-Ultra--core/C1-Ultra--core-features |
| ARM-G1U | Arm Mali G1-Ultra product page | https://www.arm.com/products/silicon-ip-multimedia/gpu/mali-g1-ultra |
| ARM-GPU-PDF | Arm Mali GPU core-features comparison sheet | https://documentation-service.arm.com/static/68c168ab8a337a2bc6645afb |
| KHRONOS-VK | Khronos Vulkan conformant products | https://www.khronos.org/conformance/adopters/conformant-products/vulkan |
| TSMC-N3 | TSMC 3nm technology page | https://www.tsmc.com/english/dedicatedFoundry/technology/logic/l_3nm |
| TSMC-SMART | TSMC smartphone advanced technologies (N3P as optical shrink of N3E) | https://www.tsmc.com/english/dedicatedFoundry/technology/platform_smartphone_tech_advancedTech |
| TSMC-PR-2023 | TSMC 2023 North America Technology Symposium PR | https://pr.tsmc.com/english/news/3021 |
| JEDEC-UFS | JEDEC UFS 4.1 press release, 8 Jan 2025 | https://www.jedec.org/news/pressreleases/jedec%C2%AE-announces-updates-universal-flash-storage-ufs-and-memory-interface |
| KIOXIA-UFS | KIOXIA UFS 4.1 product page | https://americas.kioxia.com/en-us/business/memory/ufs/other.html |
| GSMA | GSMArena Xiaomi 17T Pro specifications | https://www.gsmarena.com/xiaomi_17t_pro-14651.php |
| NBC | Notebookcheck launch article, 28 May 2026 | https://www.notebookcheck.net/Xiaomi-launches-new-flagship-smartphone-with-Leica-tuned-cameras-and-Dimensity-9500-chipset.1308049.0.html |
| GSMA-REV | GSMArena review, design/build page | https://www.gsmarena.com/xiaomi_17t_pro-review-2965p2.php |
| CORNING-7I | Corning Gorilla Glass 7i product information sheet | https://www.corning.com/microsites/csm/gorillaglass/PI_Sheets/Corning_Gorilla_Glass_7i_PI%20Sheet.pdf |
| TI-PKG | TechInsights Dimensity 9500 packaging quick look, 13 Feb 2026 | https://www.techinsights.com/blog/mediatek-dimensity-9500-advanced-packaging-quick-look |
| CHROME-WG | Chrome 121 WebGPU-on-Android blog | https://developer.chrome.com/blog/new-in-webgpu-121 |
| GPUWEB | WebGPU implementation-status wiki | https://github.com/gpuweb/gpuweb/wiki/Implementation-Status |
| CHROME-TIMER | Chrome cross-origin-isolated timers blog | https://developer.chrome.com/blog/cross-origin-isolated-hr-timers |
| ASML-RAY | ASML Rayleigh criterion | https://www.asml.com/en/technology/lithography-principles/rayleigh-criterion |
| ASML-EUV | ASML EUV lithography systems | https://www.asml.com/en/products/euv-lithography-systems |
| CODATA-SI | NIST/CODATA 2018 X-ray constants (Si lattice) | https://physics.nist.gov/cuu/pdf/xray_2018.pdf |

---

## 1. Xiaomi 17T Pro device

### 1.1 Identity, launch, regions, OS

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Product name | Xiaomi 17T Pro | — | XIAOMI-SPEC | high | confirmed |
| Launch date | 28 May 2026 | date | XIAOMI-FAQ Q1; XIAOMI-LAUNCH (“Vienna \| 28.05.2026 \| 14:00 GMT+2”) | high | confirmed |
| Global launch venue | Vienna, livestream 14:00 GMT+2 | — | XIAOMI-LAUNCH | high | confirmed |
| Europe launch / pricing context | Official European launch coverage; launch MSRP from €899.90 (12+256), €999.90 (12+512), €1,099.99 (12+1TB) | EUR | NBC (2026-05-28; cites Xiaomi pre-released material) | medium | confirmed (MSRP as reported) |
| Official regional product pages observed | Global, UK, Singapore, Taiwan, Indonesia | — | mi.com / mi.co.id product URLs | high | confirmed (pages exist) |
| Complete official country roster | Not published as a single official list | — | — | — | unknown |
| India launch date | Reported 4 June 2026 by secondary outlets; not confirmed on a Xiaomi product/PR page in this research | — | — | — | unconfirmed |
| Colors (official spec names) | Black, Deep Violet, Deep Blue | — | XIAOMI-SPEC | high | confirmed |
| Colors (FAQ wording) | Black, Blue, and Purple | — | XIAOMI-FAQ | high | confirmed (same SKUs, different names; see conflicts if treated as literal) |
| OS at first batch | Xiaomi HyperOS 3 (Android 16) | — | XIAOMI-SPEC (HyperOS 3); XIAOMI-FAQ (“first batch … HyperOS 3 (Android 16)”) | high | confirmed |
| Model number | 2602EPTC0G listed by GSMArena | — | GSMA | medium | unconfirmed officially |
| Update policy (years of OS/security) | Notebookcheck reports five major Android updates “Android 17–22” and security patches until 2032; wording is internally inconsistent (six version numbers as “five”). No official Xiaomi update-policy page cited here. | — | NBC | low | unconfirmed / see conflicts |

### 1.2 Dimensions and build

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Height | 162.2 | mm | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Width | 77.5 | mm | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Thickness | 8.25 | mm | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Weight | 219 | g | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Front cover glass | Corning Gorilla Glass 7i (FAQ: “GG7i”) | — | XIAOMI-SPEC, XIAOMI-FAQ, CORNING-7I | high | confirmed |
| Rear cover | Glass, Gorilla Glass 7i (not stated on XIAOMI-SPEC; stated by GSMArena and the GSMArena review) | — | GSMA, GSMA-REV | medium | confirmed by reputable outlet; not on official spec sheet |
| Frame | Aluminum / aluminum alloy (not stated on XIAOMI-SPEC) | — | GSMA, GSMA-REV | medium | confirmed by reputable outlet; not on official spec sheet |
| Ingress protection | IP68, IEC 60529:1989+A1:1999+A2:2013; lab test: static freshwater 1.5 m, 30 min, ΔT ≤ 5 °C | — | XIAOMI-SPEC | high | confirmed |
| Cooling (named system) | Xiaomi 3D IceLoop System | — | XIAOMI-SPEC | high | confirmed |
| Cooling materials / vapor-chamber geometry | — | — | — | — | unknown |
| In-screen fingerprint | Yes (“In-screen fingerprint sensor”) | — | XIAOMI-SPEC | high | confirmed |
| Fingerprint sensing principle | Official page does not say optical vs ultrasonic. GSMArena: under-display **optical**. PhoneArena (secondary) has said ultrasonic. | — | GSMA vs PhoneArena | medium | conflict (see below) |

### 1.3 Display

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Type | AMOLED, eye-care, flat, flexible, full lamination (on-cell) | — | XIAOMI-SPEC; XIAOMI-FAQ (flat, flexible, on-cell, AMOLED) | high | confirmed |
| Diagonal | 6.83 | in | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Aspect ratio | 19.49:9 (FAQ); GSMArena lists 19.5:9 | — | XIAOMI-FAQ; GSMA | high / medium | confirmed (FAQ); slight rounding on GSMA |
| Resolution | 2772 × 1280 (stated “1.5K”) | px | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Pixel density | 447 | PPI | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Refresh rates | Up to 144; FAQ enumerates 30 Hz (AOD), 60, 120, 144 | Hz | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Touch sampling | Up to 480; 3500 instantaneous in Game Turbo | Hz | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Color depth (spec page) | 12-bit, 68 billion colors | — | XIAOMI-SPEC | high | confirmed (prefer spec page; FAQ conflicts) |
| Color gamut (spec page) | 100% DCI-P3 | % | XIAOMI-SPEC | high | confirmed (prefer spec page; FAQ conflicts) |
| Brightness typ / HBM / peak | 600 typ; 2000 HBM; 3500 UHBM @ APL 25% | nits | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Minimum brightness | 1 | nit | XIAOMI-FAQ | high | confirmed |
| Contrast | 5,000,000:1 | — | XIAOMI-FAQ | high | confirmed |
| HDR | HDR10+, Dolby Vision; Pro HDR; Original color PRO | — | XIAOMI-SPEC | high | confirmed |
| Dimming | DC dimming (default, FAQ) | — | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Screen-to-body (FAQ) | 95.2 | % | XIAOMI-FAQ | high | confirmed (official); conflicts with GSMA 91.1% |
| PWM dimming frequency | 3840 Hz listed only by GSMArena | Hz | GSMA | medium | unconfirmed officially |
| Panel supplier / OLED emitter chemistry | — | — | — | — | unknown |
| Wet-touch marketing name | Spec page: Wet Touch Technology **2.0**; FAQ: wet hand touch **3.0** | — | XIAOMI-SPEC vs XIAOMI-FAQ | high | conflict |

### 1.4 Memory and storage (device configuration)

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| RAM capacity (official SKUs) | 12 only | GB | XIAOMI-SPEC; XIAOMI-FAQ | high | confirmed |
| Official storage SKUs | 12+256, 12+512, 12+1TB | GB | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| RAM type / data rate (this phone) | LPDDR5X, 9600 | Mbps | XIAOMI-SPEC | high | confirmed |
| Storage interface (this phone) | UFS 4.1 | — | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| microSD / expandable physical storage | No | — | XIAOMI-FAQ | high | confirmed |
| Memory-extension (software) | Yes; 12+256 default +4 GB (options 4/6/8/12); 12+512 and 12+1TB default +6 GB | GB | XIAOMI-FAQ | high | confirmed (software feature, not extra DRAM) |
| 16 GB RAM SKU | Listed by GSMArena as 512 GB + 16 GB RAM; not on official Global/UK spec or FAQ | — | GSMA | medium | unconfirmed officially / conflict with official 12 GB-only SKUs |
| DRAM vendor in this phone | — | — | — | — | unknown |
| UFS vendor / 2-lane vs 4-lane in this phone | SoC supports 4-lane UFS 4.1 (MediaTek). Whether Xiaomi enabled 4-lane on this handset is not stated on XIAOMI-SPEC. | — | MTK-PHONE | high (SoC); device lane count unknown | unknown (device) |

### 1.5 Battery and charging

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Typical capacity | 7000 | mAh | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed |
| Rated capacity | 6830 | mAh | XIAOMI-FAQ | high | confirmed |
| Construction | Dual-cell | — | XIAOMI-FAQ | high | confirmed |
| Chemistry (official wording) | Silicon-carbon battery (spec); lithium polymer (FAQ) | — | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed (both official; Si-C describes the anode system, Li-polymer the cell format) |
| Cell suppliers | ATL and LIWINON | — | XIAOMI-FAQ | high | confirmed |
| High-voltage cell | 4.58 | V | XIAOMI-FAQ | high | confirmed |
| Wired charge | 100 W HyperCharge; 100 W PPS; USB-C | W | XIAOMI-SPEC | high | confirmed |
| USB PD (spec page) | PD3.0 / PD2.0 | — | XIAOMI-SPEC | high | confirmed (FAQ omits PD3.0; see conflicts) |
| Wireless charge | 50 W wireless Hyper Charge; charger sold separately | W | XIAOMI-SPEC, XIAOMI-FAQ Q8 | high | confirmed |
| Wired reverse | 22.5 | W | XIAOMI-SPEC | high | confirmed |
| Wireless reverse | FAQ: up to 5 W. Not listed on XIAOMI-SPEC. | W | XIAOMI-FAQ Q9 | high (FAQ) | conflict vs official spec sheet |
| Full-charge time (lab) | About 48 | min | XIAOMI-FAQ (Xiaomi Internal Labs) | high | confirmed (vendor lab) |
| In-box adapter | No power adapter in the box; 100 W Xiaomi adapter recommended | — | XIAOMI-SPEC | high | confirmed |
| Included cable data spec | USB 2.0, Type-C 2.0 | — | XIAOMI-FAQ | high | confirmed (cable, not necessarily the phone’s SuperSpeed capability) |
| Phone USB data role | Official spec: “USB-C charging port” only. GSMArena: USB Type-C 2.0, OTG. | — | XIAOMI-SPEC; GSMA | medium | unconfirmed officially beyond USB-C |
| PMIC part number / count | — | — | — | — | unknown |
| Si/C anode mass fraction, cathode chemistry | — | — | — | — | unknown |

### 1.6 Cameras

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Branding | Leica Summilux; VARIO-SUMMILUX 1:1.67-3.0/15-115 ASPH. | — | XIAOMI-SPEC | high | confirmed |
| Main | 50 MP Light Fusion 950, 2.4 μm 4-in-1 Super Pixel, f/1.67, OIS, 23 mm equiv. | — | XIAOMI-SPEC | high | confirmed |
| Periscope tele | 50 MP, f/3.0, OIS, 115 mm equiv. (5×) | — | XIAOMI-SPEC | high | confirmed |
| Ultra-wide | 12 MP, f/2.2, 15 mm equiv., 120° FOV | — | XIAOMI-SPEC | high | confirmed |
| Front | 32 MP in-display, f/2.2, 21 mm equiv., 90° FOV | — | XIAOMI-SPEC | high | confirmed |
| Rear video (device) | 8K 30 fps (7680×4320); 4K 120 fps; 4K HDR10+ 60/30; Log 4K 30/60 | — | XIAOMI-SPEC | high | confirmed |
| Sensor optical formats / native pitch (e.g. 1/1.31", 1.2 μm) | Given by GSMArena, not by Xiaomi official spec | — | GSMA | medium | unconfirmed officially |
| Main aperture rounding | Official f/1.67; GSMArena f/1.7 | — | XIAOMI-SPEC vs GSMA | — | issue (rounding) |

### 1.7 Connectivity (device)

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SIM | Dual SIM: nano+nano, or nano+eSIM, or eSIM+eSIM | — | XIAOMI-SPEC | high | confirmed |
| 5G SA bands | n1/2/3/5/7/8/12/20/25/26/28/34/38/39/40/41/48/66/71/75/77/78 | — | XIAOMI-SPEC | high | confirmed (region/carrier may trim) |
| 5G NSA bands | n1/2/3/5/7/8/20/28/38/40/41/66/71/75/77/78 | — | XIAOMI-SPEC | high | confirmed |
| Wi-Fi | Wi-Fi 7 capability; 2×2 MIMO, Wi-Fi Direct | — | XIAOMI-SPEC | high | confirmed |
| Bluetooth | 6.0, Dual-Bluetooth | — | XIAOMI-SPEC | high | confirmed |
| NFC | Yes | — | XIAOMI-SPEC | high | confirmed |
| GNSS | GPS L1+L5, GLONASS G1, BDS B1I+B1C+B2a+B2b, Galileo E1+E5a+E5b, NavIC L5, QZSS L1+L5, A-GPS | — | XIAOMI-SPEC | high | confirmed |
| Audio | Dual stereo speakers, Dolby Atmos, Hi-Res & Hi-Res Wireless | — | XIAOMI-SPEC | high | confirmed |
| IR blaster / X-axis linear motor | Yes | — | XIAOMI-SPEC | high | confirmed |

---

## 2. MediaTek Dimensity 9500 SoC

MediaTek announced the SoC on 22 September 2025 (MTK-PR). Xiaomi 17T Pro officially uses this chip (XIAOMI-SPEC). The phone’s CPU clocks match MediaTek’s published cluster. The phone’s DRAM is LPDDR5X **9600 Mbps**, which is below the SoC maximum of LPDDR5X **10667** — a device bin, not a contradiction.

### 2.1 Process, identity, caches (official SoC)

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SoC name | MediaTek Dimensity 9500 | — | MTK-PHONE, XIAOMI-SPEC | high | confirmed |
| Process (Xiaomi wording) | 3 nm | — | XIAOMI-SPEC, XIAOMI-FAQ | high | confirmed (node family) |
| Process (MediaTek official) | TSMC N3P | — | MTK-PHONE, MTK-TAB (“latest TSMC N3P process”) | high | confirmed |
| Transistor architecture of N3/N3P | FinFET (not GAA). TSMC: “3nm FinFET (N3)”; N3P is an enhanced member of that family / “optical shrink of N3E”. GAA/nanosheet is official on **N2**, not N3. | — | TSMC-N3, TSMC-SMART | high | confirmed (node family) |
| Transistor count | Not published on MediaTek official pages. TechInsights and heise have used “about 30 billion”; a third-party teardown PDF also quotes 30 billion then calculates ~27 billion. | transistors | secondary only | low | unconfirmed |
| Die size | Not official. Third-party teardown figures exist (see deep-dive) and are not used as confirmed. | mm² | — | — | unknown officially |
| Package type for this phone | Not published by Xiaomi or MediaTek. TechInsights describes a PoP (MT6993Z + Samsung LPDDR5X) on Vivo X300 Pro / OPPO Find X9 Pro — **not** a Xiaomi 17T Pro teardown. InFO: not evidenced. | — | TI-PKG | medium (other devices) | unknown for this phone; PoP is confirmed on other D9500 phones |
| CPU cluster | 1× Arm C1-Ultra up to 4.21 GHz, 2 MB L2; 3× Arm C1-Premium up to 3.5 GHz, 1 MB L2; 4× Arm C1-Pro up to 2.7 GHz, 512 KB L2 | — | MTK-PHONE; clocks also XIAOMI-SPEC | high | confirmed |
| ISA | Armv9.3 (MediaTek: “Leading Armv9.3 support with new SME2”). Arm C1-Ultra page: Armv9.3-A, SVE2, SME2. FAQ says only “Armv9” (incomplete, not contradictory). | — | MTK-PHONE, ARM-C1U | high | confirmed |
| Shared L3 | 16 | MB | MTK-PHONE | high | confirmed |
| System-level cache (SLC) | 10 | MB | MTK-PHONE | high | confirmed |
| L1 I/D sizes | MediaTek only states “100% bigger L1 cache” vs previous gen, not absolute kilobytes. Arm C1-Ultra TRM pages exist but were HTTP 403 from this environment. Aggregators repeat “192 KB L1” without a primary citation used here. | KB | MTK-PHONE (relative only) | — | unknown (absolute) |
| Scheduling | 2nd-gen Dimensity Scheduling Engine | — | MTK-PHONE, MTK-HUB | high | confirmed |

### 2.2 GPU

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Name | Arm Mali-G1 Ultra MC12 (Xiaomi: “Mali G1-Ultra”; MediaTek: 12-core / MC12) | — | MTK-PHONE, ARM-G1U, XIAOMI-SPEC | high | confirmed |
| Architecture | 5th Gen Arm GPU; shader cores scalable 10–24 in the IP (this SoC is 12) | — | ARM-G1U | high | confirmed |
| Ray tracing | Arm RTUv2 in each shader core (Ultra always has RT); Vulkan `VK_KHR_ray_tracing_pipeline`; MediaTek: upgraded RT pipeline, 2× RT engine vs previous, “world’s 1st 120 FPS raytraced mobile gaming” (vendor claim) | — | ARM-G1U, MTK-PHONE | high | confirmed (hardware + API); 120 fps is a MediaTek lab/marketing claim |
| Vulkan | MediaTek: “Latest Vulkan 1.4”. Khronos: Mali-G1-Ultra Vulkan 1.4 conformant, Arm Limited, 2025-12-19, CTS 1.4.1.3. Arm comparison PDF still lists “Vulkan 1.0–1.3” for the Mali G1 column (stale sheet; see conflicts). | — | MTK-PHONE, KHRONOS-VK, ARM-GPU-PDF | high | confirmed (Vulkan 1.4) |
| OpenGL ES | 1.1–3.2 for Mali G1 (Arm comparison sheet) | — | ARM-GPU-PDF | high | confirmed (IP); driver exposure on this phone unstated |
| OpenCL | OpenCL 3.0 marked for Mali G1 on the Arm sheet | — | ARM-GPU-PDF | high | confirmed (IP) |
| GPU clock | Not published by MediaTek, Arm, or Xiaomi. Notebookcheck GPU page leaves clocks as “?”. Aggregators (NanoReview and others) list 1716 MHz — not treated as confirmed. | MHz | — | — | unknown officially; 1716 MHz unconfirmed |
| Peak TFLOPS | Depends on unpublished clock; not calculated here | — | — | — | unknown |

### 2.3 NPU 990, ISP, modem, memory, storage (SoC)

| Field | Value | Unit | Source | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| NPU name | MediaTek NPU 990, 9th generation, Generative AI Engine 2.0; plus a Super Efficient CIM-based NPU (compute-in-memory) for always-on / light models | — | MTK-PR, MTK-PHONE, MTK-HUB | high | confirmed |
| TOPS (absolute) | **Not stated** on MediaTek official pages or the official infographic. Secondary outlets (TechInsights, Counterpoint, NanoReview) repeat “100 TOPS.” | TOPS | secondary only | low | unconfirmed |
| Precisions | Official: BitNet 1.58-bit models; integer and floating-point compute “doubled” vs previous gen. No official TOPS-per-precision table (INT8/FP16/FP8, etc.). | — | MTK-PR, MTK-HUB | high (BitNet 1.58-bit); remainder unknown | partial |
| LLM tokens/s (absolute) | Official relative claims only: “100% faster 3 billion parameter LLM output,” “Over 2x faster token generation speed,” 128K-token long context. No official tokens/s figure. | token/s | MTK-PR, MTK-PHONE | high (relative) | unknown (absolute) |
| ISP | MediaTek Imagiq 1190 | — | MTK-HUB, MTK-PR, MTK-PHONE | high | confirmed |
| ISP highlights | RAW-domain engine; up to 200 MP capture (SoC); 30 fps NPU-assisted AF tracking; 4K60 cinematic portrait; 4K120 with EIS / Dolby Vision (SoC capability — the phone lists 8K30 / 4K120, not all SoC camera maxima) | — | MTK-PR, MTK-PHONE | high | confirmed (SoC) |
| Max sensor / encode (SoC) | Max sensor 320 MP; 8K60 capture listed in SoC table; 8K60 10-bit decode (HEVC/AVC/VP9/AV1); 8K30 10-bit encode (HEVC/AVC); 8K60 8-bit HEVC encode | — | MTK-PHONE | high | confirmed (SoC, not all exposed on this phone) |
| 8K pixel count typo | SoC page writes “8K60 (7690 × 4320)”. Standard 8K UHD is 7680 × 4320, and Xiaomi uses 7680 × 4320. | px | MTK-PHONE vs XIAOMI-SPEC | — | error (MediaTek typo) |
| Modem | 3GPP Release-17 5G, Sub-6 GHz (FR1) only in the published table; 5CC-CA, up to 7.4 Gbps DL; UL 2CC 200 MHz; DSDA; SA & NSA | Gbps | MTK-PHONE | high | confirmed |
| mmWave / FR2 | Not listed | — | MTK-PHONE | high | unknown / not claimed |
| Modem product name (e.g. a separate “M-series” brand) | Not published on the pages cited | — | — | — | unknown |
| SoC memory max | LPDDR5X 10667 | Mbps | MTK-PHONE | high | confirmed (SoC cap) |
| Channel width / rank | Not published by MediaTek | bit | — | — | unknown |
| Theoretical DRAM bandwidth | Cannot be confirmed without official channel width. A 64-bit (4×16) bus at 10667 Mbps would be 85.336 GB/s, and at the phone’s 9600 Mbps 76.8 GB/s — **derived, unconfirmed** (aggregators assume 4×16). | GB/s | — | — | unknown (official); derived figures unconfirmed |
| Storage (SoC) | UFS 4.1, 4-lane; “1st with support for 4-lane UFS 4.1”; “100% faster sequential” vs previous (2-lane) | — | MTK-PHONE, MTK-PR | high | confirmed |
| UFS 4.1 standard peak (typical 2-lane wording) | JEDEC JESD220G UFS 4.1 uses MIPI M-PHY 5.0 + UniPro 2.0 and “enable[s] up to ~4.2 GB/s for read and write traffic.” KIOXIA: HS-G5 theoretical **23.2 Gbps/lane** or **46.4 Gbps/device** (2-lane), product max data rate 4640 MB/s. | GB/s or Gbps | JEDEC-UFS, KIOXIA-UFS | high | confirmed (standard 2-lane) |
| 4-lane theoretical raw rate | 4 × 23.2 Gbps = 92.8 Gbps ≈ 11.6 GB/s raw if all lanes are used — **derived** from KIOXIA’s per-lane rate × MediaTek’s 4-lane claim, not a JEDEC-published 4-lane peak. | GB/s | derived | medium | unconfirmed as a standard figure |
| Wi-Fi / BT (SoC) | Wi-Fi 7, TBTC, peak 7.3 Gbps; Bluetooth 6.0 dual engine, peak 12 Mbps | — | MTK-PHONE | high | confirmed (SoC) |
| Display engine (SoC) | MiraVision; WQHD+ 180 Hz; tri-port MIPI (SoC capability; this phone is 144 Hz 1.5K) | — | MTK-PHONE | high | confirmed (SoC) |

---

## 3. Browser-exposed capabilities on this phone

These matter because the Lab will run in Chrome (and other browsers) **on the Xiaomi 17T Pro’s Mali-G1 Ultra**, and microbenchmarks will be distorted if isolation and timer limits are ignored.

| Topic | What is known | Source | Status |
| :--- | :--- | :--- | :--- |
| WebGL 2.0 | WebGL2 is the baseline on current Chrome/Edge/Firefox/Safari Android and is the predecessor lab’s required GPU API. There is no reason to expect WebGL2 to be absent on a 2026 flagship Mali device, but this dossier did not run an on-device report. | Predecessor README; Khronos WebGL 2 is ubiquitous on modern Android Chrome | confirmed as platform-standard; device smoke-test still recommended |
| WebGPU in Chrome Android | Enabled by default in Chrome 121+ on Android 12+ for **Qualcomm and ARM GPUs** (Chrome blog). The 2026 gpuweb wiki table: Android ✅ “ARM/Qualcomm/Intel, Android 12+: 121”; Imagination Android 16+/Chrome 139; Samsung Xclipse and “Others” still TBD. Mali-G1 Ultra is an Arm GPU (vendor 0x13B5 in typical Chrome blocklists). **This exact GPU is not separately named** as certified in those docs, so ship-status on 17T Pro should be verified on-device (`navigator.gpu`). | CHROME-WG, GPUWEB | confirmed for Arm GPUs as a class since Chrome 121; **unconfirmed for Mali-G1 Ultra specifically** |
| Firefox Android WebGPU | Wiki: behind a flag; Mozilla expected Android work “in 2026.” | GPUWEB | unconfirmed / not default as of the wiki text fetched |
| SharedArrayBuffer | Requires cross-origin isolation (COOP + COEP, or equivalent). Same isolation gate as high-resolution timers. | CHROME-TIMER | confirmed (platform rule) |
| Timer resolution | Chrome 91+: explicit timers (`performance.now()` and other `DOMHighResTimestamp` APIs) coarsened to **100 μs** unless the page is cross-origin isolated, which relaxes resolution to **5 μs** on all platforms, including Android. Other browsers may be as coarse as 1 ms. This dominates microbenchmark noise on-device. | CHROME-TIMER | confirmed |
| WebGPU timestamp queries | Available only if the adapter exposes the `"timestamp-query"` feature and the app requests it; values are quantized in some Chrome versions. Do not treat GPU timestamps as given on Mali without a feature check. | CHROME-WG (Chrome 121 timestamp-query section; also Chrome 120 quantization notes) | confirmed as a capability check, not a guarantee |
| Implication for the Lab | Serve the Lab with COOP/COEP (or a documented isolation method) if SharedArrayBuffer, WASM threads, or tight `performance.now()` loops are used. Feature-detect WebGPU and fall back to WebGL2. Never publish nanosecond-style JS timings from a non-isolated page. | — | engineering requirement |

---

## 4. Conflicts

Each item is classified as exactly one of: bug, error, issue, problem, dilemma, **conflict**.

1. **Color depth (error).** XIAOMI-SPEC: “12bit, 68 billion colors.” XIAOMI-FAQ: “68.7 billion with **8-bit** color depth.” 68.7×10⁹ colors is 2³⁶, i.e. 12 bits per channel, not 8-bit (which is ~16.7 million). Prefer the spec page; treat the FAQ’s “8-bit” as an **error**.

2. **DCI-P3 gamut (conflict).** XIAOMI-SPEC: **100%** DCI-P3. XIAOMI-FAQ: **94%** DCI-P3. Two official Xiaomi pages disagree. Prefer the product spec page until Xiaomi corrects one of them, and surface both in the app.

3. **Wet Touch version (conflict).** XIAOMI-SPEC: Wet Touch Technology **2.0**. XIAOMI-FAQ: wet hand touch **3.0**. Official vs official.

4. **“Hexagon” co-processor (error).** XIAOMI-FAQ SoC Q8: “The co-processor of the Xiaomi 17T Pro is the **Hexagon** processor.” Hexagon is Qualcomm’s DSP brand. This is almost certainly a copy-paste **error** from a Snapdragon FAQ. No MediaTek Hexagon exists on this chip.

5. **USB PD version (conflict).** XIAOMI-SPEC: PD3.0 / PD2.0 and 100 W PPS. XIAOMI-FAQ charging protocols for the phone: “BC1.2, PD2.0, and PPS” (no PD3.0). Prefer the spec page.

6. **Reverse wireless charging (conflict).** XIAOMI-SPEC lists 22.5 W **wired** reverse only. XIAOMI-FAQ Q9 lists reverse **wireless** up to 5 W. FAQ Q4 also says the phone “does not support the wireless charging protocol” while Q8 says it supports 50 W wireless — internal FAQ inconsistency (**error** in Q4 wording, plus a **conflict** with the spec sheet on reverse wireless).

7. **16 GB RAM SKU (conflict).** Official Global/UK specs and FAQ: 12 GB only. GSMArena lists an additional **512 GB + 16 GB** configuration. Not adopted as confirmed.

8. **Screen-to-body ratio (conflict).** XIAOMI-FAQ: 95.2%. GSMArena: ~91.1%. Different measurement methods are likely; official FAQ wins for the “official” number, with GSMA as an alternate calculation.

9. **Thickness rounding (issue).** Official 8.25 mm; GSMArena 8.3 mm. Presentation rounding, not a different product.

10. **Main aperture rounding (issue).** Official f/1.67; GSMArena f/1.7.

11. **MediaTek 8K resolution typo (error).** MTK-PHONE: “8K60 (7690 × 4320).” Should be 7680 × 4320 (Xiaomi’s figure).

12. **Vulkan 1.3 vs 1.4 on Arm’s comparison PDF (issue).** Arm’s Mali GPU comparison sheet still ticks “Vulkan 1.0–1.3” for Mali G1, while MediaTek and the Khronos Vulkan 1.4 registry (Mali-G1-Ultra, 2025-12-19) document Vulkan 1.4. Stale datasheet, not a silicon split. Prefer Khronos + MediaTek.

13. **Fingerprint sensing (conflict).** Official: “in-screen” only. GSMArena: optical. PhoneArena (secondary) has listed ultrasonic. Leave the principle UNKNOWN officially and flag the outlet disagreement.

14. **Wireless-charging “protocol” FAQ Q4 (error).** Contradicts both the official 50 W wireless spec and FAQ Q8. Likely a translation/template failure (possibly meaning a named standard such as Qi, which Xiaomi does not state).

LPDDR5X 9600 (phone) vs 10667 (SoC max) is **not** a conflict: the handset is binned below the SoC ceiling.

---

## 5. Unknowns and unconfirmed items (do not invent in the app)

Absolute L1 I/D sizes per core; GPU clock and TFLOPS; NPU TOPS by precision; absolute LLM tokens/s; transistor count; D9500 die size (official); Xiaomi 17T Pro package type / InFO vs PoP / DRAM vendor; memory channel width and therefore official theoretical bandwidth; whether this phone’s UFS is 4-lane; PMIC identity; battery Si/C ratio and cathode chemistry; display panel supplier, OLED materials, official PWM frequency; frame/back materials on the official spec sheet (aluminum + GG7i back are outlet-confirmed only); mmWave; official complete launch-country list; 16 GB RAM SKU; fingerprint optical vs ultrasonic; phone USB SuperSpeed generation (beyond the included USB 2.0 cable); device-specific boot chain, memory map, and GPU firmware clocks; High-NA EUV use on N3P (see `deep-dive.md`); Cu/Co/Ru interconnect stack for N3P; exact high-k dielectric and work-function metals for N3P; N3P CPP / M0 / M1 pitches (N3/N3E figures are not automatically N3P).

Aggregator repeats of **1716 MHz GPU**, **100 TOPS**, **192 KB L1**, **4×16-bit 85.3 GB/s**, and **~30 billion transistors** stay **UNCONFIRMED** unless a primary source appears later.

---

## 6. Companion files

- Machine-readable fields: [`specs.json`](specs.json)
- Materials, lithography, ISA/boot, teardown list, visualization plan, taxonomy summary: [`deep-dive.md`](deep-dive.md)
- App navigation model: [`taxonomy.json`](taxonomy.json)
- Predecessor repo survey: [`predecessor-notes.md`](predecessor-notes.md)
