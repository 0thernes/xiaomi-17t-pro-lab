# Unknowns resolved: Xiaomi 17T Pro / Dimensity 9500

Pass date: 2026-11-12 (America/Los_Angeles). Applies to `/workspace/xiaomi-lab/specs.json`; the original is saved at `/tmp/xr/specs.before.json` on the box.

Status rules used: **confirmed** means an official vendor document, a primary measurement or analysis (Arm TRM, die decap, lab test), or two independent primary sources. **unconfirmed** means the value is published but comes only from aggregators or secondary sources, or isn't specific to this phone. **unknown** means nothing is published after a real search. New keys added to each changed field: `confidence`, `resolved_on`, and `searched_2026_11_12` (for fields still open).

## Scorecard

- 38 fields were UNKNOWN or UNCONFIRMED before this pass.
- **29 now have a cited value**: 23 are confirmed, and 6 have a value but stay unconfirmed (GPU clock, NPU TOPS, memory channel width, derived memory bandwidth, PoP in this specific phone, Galaxy S26 Ultra process).
- **9 are still open**: 5 unknown (UFS lane count, DRAM vendor, PMIC, WebGPU-on-G1-Ultra, iPhone 3DMark in the same table) and 4 unconfirmed (rear glass grade, 5 W reverse wireless, and 2 Notebookcheck street prices, which are street prices by nature).
- **36 new cited fields** were added: per-core L1, decode and dispatch widths, SVE/SME vector lengths, TLBs, die block areas, NPU structure, part number, process pitches, EUV NA, VC area, cycle rating, and others.
- Conflicts #7, #13, and #15 are resolved; #16 to #20 are new.

## Most important new numbers

- Die: **140.57 mm²** (10.88 × 12.92 mm, 200 µm thick, die code BHJ11471B). Package: **MT6993Z HB-MUFPOP, 16.40 × 14.00 × 0.455 mm, 0.35 mm ball pitch** (Kurnal).
- Transistors: **~30 B** (TechInsights and the MediaTek briefing). Kurnal's own estimate is about 27.3 B.
- L1 cache: **C1-Ultra 64 KB I + 128 KB D; C1-Premium 64 + 64; C1-Pro 64 + 64** (the C1-Pro config is unconfirmed). Source: Arm TRMs.
- C1-Ultra front end: **10 MOPs/cycle decode/dispatch, 20 µOPs/cycle, 23 issue pipelines (6 × 128-bit FP/ASIMD)**, about 2K instructions in flight. **SVE VL 128 bits; SME2 streaming VL 512 bits.**
- GPU: **1716 MHz** (unconfirmed), which gives **5.27 TFLOPS FP32**. GPU block 24.23 mm², 2 MiB L2, 1.55 mm² per shader core.
- NPU 990: **4 × MDLA + 2 × MVPU, 4 MiB L2, 12.6 mm²**. The compiler uses `--num-mdla 4 --l1-size-kb 7168`. Rated **100 TOPS** (precision not stated). **Gemma 3n E2B: >1600 tok/s prefill, 28 tok/s decode** (Google with MediaTek).
- Phone: **TCL CSOT panel; optical FPS; USB 2.0 (23 MB/s measured); PWM 120 Hz + 3.84 kHz; 16% silicon battery, dual-cell; VC + graphite + graphite-copper foil; ~5500 mm² VC** (VC area unconfirmed).
- Process: N3E/N3P **CPP 48 nm, Mmin 23 nm**; **EUV NA 0.33** (High-NA is not used). The modem is **FR1 only** (no mmWave).
- Competitors: iPhone 18 Pro Max **12 GB, 5,391 mAh (EU label) or 5,567 mAh (eSIM), TSMC N2, GB6.7 4725/12575**, prices verified at $1,499/$1,899/$2,499. S26 Ultra **$1,299.99 at launch, $1,399.99 now; TSMC N3P (3 nm)**.

## Every change, before and after

| Field | Kind | Before | After | Source | Confidence |
|---|---|---|---|---|---|
| `device.model_number` | updated | 2602EPTC0G [unconfirmed] | 2602EPTC0G [confirmed] | https://www.mi.com/tw/product/xiaomi-17t-pro/specs/ | high |
| `device.rear_cover` | still-unconfirmed | Glass, Gorilla Glass 7i [unconfirmed] | Glass, Gorilla Glass 7i [unconfirmed] | https://www.gsmarena.com/xiaomi_17t_pro-14651.php | — |
| `device.frame` | updated | Aluminum alloy [unconfirmed] | Aluminum alloy (sand-blasted matte) [confirmed] | https://www.ithome.com/0/961/522.htm | medium-high |
| `device.cooling_materials` | updated | null [unknown] | Vapor chamber (VC heat sink) + graphite sheets + graphite-copper foil (front camera) + thermal grease applied to frame; marketed as Xiaomi 3D IceLoop [confirmed] | https://spare-parts.mi.com/cdn/shop/files/P12U_Xiaomi_17T_Pro_ERP_c1d3851e-b6a1-4622-b262-c160cb7fba23.pdf?v=18270098609428527401 | high |
| `device.cooling_vc_area_mm2` | added | —(new field) | 5500 mm^2 [unconfirmed] | https://www.huaweicentral.com/xiaomi-17t-series-debuts-in-china-for-first-time/ | medium |
| `device.pwm_hz` | updated | 3840 Hz [unconfirmed] | 3840 Hz [confirmed] | https://www.notebookcheck.net/A-flagship-that-makes-you-forget-its-price-Xiaomi-17T-Pro-Review.1352144.0.html | high |
| `device.panel_supplier` | updated | null [unknown] | TCL CSOT (TCL 华星) [confirmed] | https://www.ithome.com/0/961/658.htm | high |
| `device.ufs_lane_count_device` | still-unknown | null lanes [unknown] | null lanes [unknown] |  | — |
| `device.ram_sku_16gb` | updated | 512GB+16GB listed by GSMArena [unconfirmed] | 16GB+512GB exists in China (国行) only; global SKUs are 12GB only [confirmed] | https://www.ithome.com/0/961/562.htm | high |
| `device.dram_vendor` | still-unknown | null [unknown] | null [unknown] |  | — |
| `device.wireless_reverse_w` | still-unconfirmed | 5 W [unconfirmed] | 5 W [unconfirmed] | https://www.mi.com/uk/support/faq/details/KA-704973/ | — |
| `device.phone_usb_data` | updated | USB Type-C 2.0, OTG (GSMArena); official page says USB-C charging port only [unconfirmed] | USB 2.0 (USB Type-C, 480 Mb/s class), OTG, no DisplayPort video out [confirmed] | https://www.notebookcheck.net/A-flagship-that-makes-you-forget-its-price-Xiaomi-17T-Pro-Review.1352144.0.html | high |
| `device.pmic` | still-unknown | null [unknown] | null [unknown] |  | — |
| `device.battery_si_c_ratio` | updated | null [unknown] | 16 % silicon content (anode) [confirmed] | https://www.ithome.com/0/960/256.htm | high |
| `device.fingerprint` | updated | In-screen fingerprint sensor [confirmed] | In-screen optical fingerprint sensor [confirmed] | https://www.mi.com/prod/xiaomi-17t-pro/specs | high |
| `device.battery_cycle_rating` | added | —(new field) | ≥80% after 1600 cycles (Xiaomi CN claim); EU label: 1000 cycles [confirmed] | https://www.ithome.com/0/960/256.htm | medium-high |
| `soc.transistor_count` | updated | null transistors [unknown] | 30000000000 transistors [confirmed] | https://www.techinsights.com/blog/dimensity-9500-debuts-arm-c1-cores-and-dual-npu | medium-high |
| `soc.die_size_mm2` | updated | null mm^2 [unknown] | 140.57 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | high |
| `soc.package_this_phone` | updated | null [unknown] | PoP: MT6993Z SoC package (HB MUFPOP, 16.40 x 14.00 mm, 0.455 mm thick, 0.35 mm ball pitch) with LPDDR5X stacked on top — SoC-level design; the 17T Pro unit itself has not been torn down [unconfirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.l1_cache_bytes` | updated | null KB [unknown] | C1-Ultra: 64 KB L1I + 128 KB L1D; C1-Premium: 64 KB L1I + 64 KB L1D; C1-Pro: 64 KB L1I + 64 KB L1D (C1-Pro size configurable 32/64 KB — 64 KB in D9500 is unconfirmed) KB [confirmed] | https://support.arm.com/documentation/108014/0101/Technical-overview/Core-components | high (Ultra/Premium), medium (C1-Pro) |
| `soc.l1i_kb_c1_ultra` | added | —(new field) | 64 KB [confirmed] | https://support.arm.com/documentation/108014/0101/Technical-overview/Core-components | high |
| `soc.l1d_kb_c1_ultra` | added | —(new field) | 128 KB [confirmed] | https://support.arm.com/documentation/108014/0101/Technical-overview/Core-components | high |
| `soc.l1i_kb_c1_premium` | added | —(new field) | 64 KB [confirmed] | https://support.arm.com/documentation/109416/0101/Technical-overview/Core-components | high |
| `soc.l1d_kb_c1_premium` | added | —(new field) | 64 KB [confirmed] | https://support.arm.com/documentation/109416/0101/Technical-overview/Core-components | high |
| `soc.l1i_kb_c1_pro` | added | —(new field) | 64 KB [unconfirmed] | https://support.arm.com/documentation/107771/0103/Technical-overview/Core-components | medium |
| `soc.l1d_kb_c1_pro` | added | —(new field) | 64 KB [unconfirmed] | https://support.arm.com/documentation/107771/0103/Technical-overview/Core-components | medium |
| `soc.c1_ultra_frontend_width` | added | —(new field) | 10 MOPs/cycle decode/dispatch, up to 20 µOPs/cycle dispatch; 23 issue pipelines (3 branch, 6 int single-cycle, 2 int multi-cycle, 6 FP/ASIMD 128-bit, 2 load/store, 2 load, 2 store-data) [confirmed] | https://developer.arm.com/documentation/111079/3-0 | high |
| `soc.c1_premium_frontend_width` | added | —(new field) | 10 MOPs/cycle dispatch, up to 20 µOPs/cycle; 19 issue pipelines (only 2 FP/ASIMD vs 6 on Ultra) [confirmed] | https://jia.je/hardware/2025/09/10/arm-core-development/ | medium-high |
| `soc.c1_pro_frontend_width` | added | —(new field) | 5 MOPs/cycle dispatch, up to 10 µOPs/cycle; 13 issue pipelines; 2x 0-cycle BTB and 16x 1-cycle BTB capacity vs A725 [confirmed] | https://jia.je/hardware/2025/09/10/arm-core-development/ | medium-high |
| `soc.c1_ultra_inflight_instructions` | added | —(new field) | 2000 instructions (approx.) [confirmed] | https://www.computerbase.de/news/prozessoren/arm-lumex-css-platform-neue-c1-kerne-fuehren-sme2-fuer-ai-direkt-auf-der-cpu-ein.94179/ | medium-high |
| `soc.sve_vector_length_bits` | added | —(new field) | 128 bits [confirmed] | https://support.arm.com/documentation/108014/0101/The-C1-Ultra--core/C1-Ultra--core-features | high |
| `soc.sme2_streaming_vector_length_bits` | added | —(new field) | 512 bits [confirmed] | https://support.arm.com/documentation/107831/0103/The-C1-SME2--unit/C1-SME2--unit-features | high |
| `soc.c1_ultra_tlb` | added | —(new field) | L1 ITLB 128 entries, L1 DTLB 96 entries, L2 TLB 2048 entries 8-way [confirmed] | https://jia.je/hardware/2025/09/10/arm-core-development/ | high |
| `soc.gpu_clock_mhz` | updated | null MHz [unknown] | 1716 MHz [unconfirmed] | https://nanoreview.net/en/soc/mediatek-dimensity-9500 | medium |
| `soc.gpu_peak_fp32_tflops_derived` | added | —(new field) | 5.27 TFLOPS [unconfirmed] | https://nanoreview.net/en/soc/mediatek-dimensity-9500 | medium |
| `soc.gpu_l2_mb` | added | —(new field) | 2 MiB [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.npu_tops` | updated | null TOPS [unknown] | 100 TOPS [unconfirmed] | https://www.techinsights.com/blog/dimensity-9500-debuts-arm-c1-cores-and-dual-npu | medium |
| `soc.npu_llm_tokens_per_s` | updated | null token/s [unknown] | 28 token/s (decode) [confirmed] | https://developers.googleblog.com/mediatek-npu-and-litert-powering-the-next-generation-of-on-device-ai/ | high |
| `soc.npu_prefill_tokens_per_s` | added | —(new field) | 1600 token/s (prefill, Gemma 3n E2B, 4K ctx) [confirmed] | https://developers.googleblog.com/mediatek-npu-and-litert-powering-the-next-generation-of-on-device-ai/ | high |
| `soc.npu_structure` | added | —(new field) | NPU 990: 4x MDLA (MediaTek Deep Learning Accelerator) + 2x MVPU (vision/vector processing unit); 4 MiB NPU L2; ~1 MiB per-MDLA cache; NeuroPilot compiler targets --num-mdla 4 --l1-size-kb 7168 for MT6993 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.npu_precisions_documented` | added | —(new field) | a16w8 (FP16 activations + INT8 weights) used by Google's official MT6993 LLM bundles; BitNet 1.58-bit supported (MediaTek); INT and FP compute both "doubled" vs D9400 (MediaTek) [confirmed] | https://github.com/google-ai-edge/ai-edge-quantizer/issues/449 | medium-high |
| `soc.mmwave` | updated | null [unknown] | No — integrated modem is Sub-6 (FR1) only; 17T Pro band list has no n257/n258/n260/n261 [confirmed] | https://www.mediatek.com/products/smartphones/mediatek-dimensity-9500 | high |
| `soc.memory_channel_width_bits` | updated | null bit [unknown] | 64 bit [unconfirmed] | https://nanoreview.net/en/soc/mediatek-dimensity-9500 | medium |
| `soc.memory_theoretical_bandwidth_GBps` | updated | null GB/s [unknown] | 76.8 GB/s [unconfirmed] | https://www.mi.com/global/product/xiaomi-17t-pro/specs/ | medium |
| `soc.part_number` | added | —(new field) | MT6993 (package marking MT6993Z) [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | high |
| `soc.die_block_cpu_cluster_mm2` | added | —(new field) | 28.75 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_c1_ultra_core_mm2` | added | —(new field) | 3.259 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_c1_premium_core_mm2` | added | —(new field) | 1.91 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_c1_pro_core_mm2` | added | —(new field) | 1.131 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_gpu_mm2` | added | —(new field) | 24.232 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_gpu_shader_core_mm2` | added | —(new field) | 1.55 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_npu990_mm2` | added | —(new field) | 12.595 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_mdla_core_mm2` | added | —(new field) | 1.811 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_mvpu_core_mm2` | added | —(new field) | 0.62 mm^2 [confirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | medium-high |
| `soc.die_block_sme2_block_mm2_tentative` | added | —(new field) | 2.91 mm^2 [unconfirmed] | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | low |
| `soc.process_n3e_cpp_nm` | added | —(new field) | 48 nm [confirmed] | https://fuse.wikichip.org/news/7375/tsmc-n3-and-challenges-ahead/ | medium-high |
| `soc.process_n3e_min_metal_pitch_nm` | added | —(new field) | 23 nm [confirmed] | https://fuse.wikichip.org/news/7375/tsmc-n3-and-challenges-ahead/ | medium |
| `soc.euv_numerical_aperture` | added | —(new field) | 0.33 NA [confirmed] | https://www.reuters.com/technology/tsmc-says-asml-high-na-euv-machine-not-necessary-a16-node-2024-05-14/ | high |
| `soc.boot_chain_generic_mediatek` | added | —(new field) | BootROM (mask ROM) → Preloader (DRAM/PMIC init) → TF-A BL31 (EL3 secure monitor) + TEE (BL32) + GenieZone (EL2 hypervisor) → LK (BL33: fastboot/AVB) → Linux kernel [unconfirmed] | https://alanhc.github.io/til/docs/qualcomm-vs-mediatek-android-boot-flow | medium |
| `browser.webgpu_mali_g1_ultra_specific` | still-unknown | null [unknown] | null [unknown] | https://github.com/gpuweb/gpuweb/wiki/Implementation-Status | — |
| `competitors.xiaomi_17t_pro.price_us_msrp` | updated | null USD [unknown] | N/A — Xiaomi does not officially sell the 17T Pro in the US; grey-import listings ~$620–$777 [confirmed] | https://www.techradar.com/phones/xiaomi-phones/xiaomi-17t-pro-review | medium-high |
| `competitors.iphone_18_pro_max.foundry` | updated | null [unknown] | TSMC N2 (2 nm, gate-all-around) [confirmed] | https://www.techinsights.com/iphone-18-pro-max-idm-analysis | high |
| `competitors.iphone_18_pro_max.price_us_512gb` | updated | 1499 USD [unconfirmed] | 1499 USD [confirmed] | https://www.apple.com/shop/buy-iphone/iphone-18-pro | high |
| `competitors.iphone_18_pro_max.price_us_1tb` | updated | 1899 USD [unconfirmed] | 1899 USD [confirmed] | https://www.apple.com/shop/buy-iphone/iphone-18-pro | high |
| `competitors.iphone_18_pro_max.price_us_2tb` | updated | 2499 USD [unconfirmed] | 2499 USD [confirmed] | https://www.apple.com/shop/buy-iphone/iphone-18-pro | high |
| `competitors.iphone_18_pro_max.ram_gb` | updated | null GB [unknown] | 12 GB [confirmed] | https://www.macrumors.com/2026/09/10/iphone-18-pro-max-battery-capacities-ram/ | high |
| `competitors.iphone_18_pro_max.battery_typical_mah` | updated | null mAh [unknown] | 5391 mAh [confirmed] | https://www.macrumors.com/2026/09/10/iphone-18-pro-max-battery-capacities-ram/ | high |
| `competitors.iphone_18_pro_max.geekbench6_single` | updated | null score [unknown] | 4725 score [confirmed] | https://www.notebookcheck.net/Apple-iPhone-18-Pro-Max-gaming-performance-exceeds-official-40-sustained-performance-claim.1415112.0.html | medium-high |
| `competitors.iphone_18_pro_max.geekbench6_multi` | updated | null score [unknown] | 12575 score [confirmed] | https://www.notebookcheck.net/Apple-iPhone-18-Pro-Max-gaming-performance-exceeds-official-40-sustained-performance-claim.1415112.0.html | medium-high |
| `competitors.iphone_18_pro_max.3dmark_wle_high_phonearena` | still-unknown | null score [unknown] | null score [unknown] | https://www.phonearena.com/reviews/xiaomi-17t-pro-review_id7943 | — |
| `competitors.galaxy_s26_ultra.process` | updated | null [unknown] | TSMC N3P (3 nm) [unconfirmed] | https://www.techinsights.com/blog/qualcomm-snapdragon-8-elite-gen-5-advanced-packaging-quick-look | medium-high |
| `competitors.galaxy_s26_ultra.price_us_official_msrp` | updated | null USD [unknown] | 1299.99 USD [confirmed] | https://news.samsung.com/global/samsung-unveils-galaxy-s26-series-the-most-intuitive-galaxy-ai-phone-yet | high |
| `competitors.galaxy_s26_ultra.price_us_current_msrp_256` | added | —(new field) | 1399.99 USD [confirmed] | https://www.samsung.com/us/smartphones/galaxy-s26-ultra/buy/ | high |

### Notes per field

- `device.model_number`: Printed on Xiaomi Taiwan official spec page (產品型號：2602EPTC0G, NCC ID CCAF265G0140T0). Also GSMArena.
- `device.rear_cover`: Reputable outlet (GSMArena review also). Not stated on Xiaomi official spec sheet. Treated as outlet-confirmed in the dossier narrative; status unconfirmed officially. | 2026-11-12: Xiaomi lists Gorilla Glass 7i only under Display (front). IT之家 hands-on describes the back as AG matte glass; only GSMArena names GG7i for the back. Still single-source for the rear glass grade. **Searched:** Xiaomi Global/TW/CN spec pages, IT之家 review (ithome.com/0/961/522.htm), Notebookcheck review, GSMArena
- `device.frame`: Two independent hands-on sources: IT之家 review (铝合金材质, 雾面喷砂) and GSMArena (aluminum frame). Not on the Xiaomi spec sheet.
- `device.cooling_materials`: Xiaomi official repair manual (ERP, 53 pp): 'Lift the graphite sheet', 'Check that the VC heat sink is not wrinkled or deformed', 'apply thermal grease to the frame', 'Apply graphite copper foil to the front camera'. VC area: see cooling_vc_area_mm2.
- `device.cooling_vc_area_mm2`: China launch coverage (Huawei Central, citing Xiaomi launch imagery): 5500 mm² VC. Not on Xiaomi Global/TW spec text. A secondary claim of 4637 mm² (repair-parts blog) is unverified and conflicts.
- `device.pwm_hz`: Two independent measurements: GSMArena lists 3840 Hz PWM; Notebookcheck measured a 3,846 Hz component plus a 120 Hz base frequency at minimum brightness (15.5% amplitude) despite Xiaomi calling it DC dimming. Model/app should show both 120 Hz and ~3.84 kHz.
- `device.panel_supplier`: TCL CSOT publicly announced it supplies the Xiaomi 17T series displays (17T Pro: 6.83-in 144 Hz 2772x1280, 3500 nits). Xiaomi CN meta also states 新型红色发光主材 (new red emitter host material). Huawei Central calls the panel LTPS OLED. Exact OLED emitter stack (e.g. M-series code) not published.
- `device.ufs_lane_count_device`: 2026-11-12: Not stated by Xiaomi (Global/TW/CN), Notebookcheck, GSMArena, IT之家. Measured: Notebookcheck AndroBench seq read 3021.5 MB/s, seq write 2770 MB/s, 4K rand read 414 MB/s (512 GB unit) — below a 2-lane HS-G5 ceiling (~4.2 GB/s), so the measurement cannot discriminate 2- vs 4-lane. SoC supports 4-lane (MediaTek). Only a teardown/UFS device-descriptor dump would settle it. **Searched:** Xiaomi spec pages, NBC review AndroBench table, GSMArena, IT之家, web search for "17T Pro" 4-lane/2-lane
- `device.ram_sku_16gb`: IT之家: 国行 Pro adds 16GB+512GB; IT之家 review unit was 16GB+512GB; Huawei Central lists CN pricing 16+512 = ¥5099. Xiaomi Global/TW list 12GB SKUs only. Resolves conflict #7 (market-dependent, not an error).
- `device.dram_vendor`: 2026-11-12: No 17T Pro teardown/X-ray found (iFixit, TechInsights, Kurnal, PBK, JerryRig searched). Xiaomi repair manual does not name components. TechInsights found Samsung LPDDR5X stacked on MT6993Z in Vivo X300 Pro / OPPO Find X9 Pro only — not transferable. **Searched:** TechInsights, Kurnal, iFixit, Xiaomi ERP manual, web search "17T Pro LPDDR5X Samsung/Micron/SK hynix"
- `device.wireless_reverse_w`: FAQ only; not on official spec sheet. | 2026-11-12: Official spec sheets (Global, TW) list only 22.5 W WIRED reverse; GSMArena lists 22.5 W reverse wired only; Notebookcheck mentions no reverse wireless. 5 W reverse wireless rests solely on the UK FAQ (which also contains other errors). Treat as doubtful. **Searched:** Xiaomi Global/TW specs, UK FAQ, GSMArena, Notebookcheck
- `device.phone_usb_data`: Notebookcheck measured 23.16 MB/s copying to a Samsung T7 (USB 3.2 Gen 2) SSD and states USB 2.0 without video output; GSMArena: USB Type-C 2.0, OTG.
- `device.pmic`: 2026-11-12: No 17T Pro board-level teardown found. MediaTek MT6363/MT6373 SPMI PMICs are documented in upstream Linux for recent Dimensity platforms, but no source ties a specific PMIC to this phone. **Searched:** TechInsights, Kurnal, Linux dt-bindings (MT6363/MT6373), Xiaomi ERP, web search
- `device.battery_si_c_ratio`: Xiaomi official poster (via IT之家): 7000 mAh 小米金沙江电池, highest Xiaomi silicon content to date 16%, ≥80% capacity after 1600 cycles. Basis (wt% of anode active material vs whole anode) not specified. Dual-cell confirmed in repair manual. Cathode chemistry still unpublished.
- `device.fingerprint`: Xiaomi China official page meta lists 光学指纹 (optical fingerprint); Notebookcheck and GSMArena also say optical. Resolves conflict #13.
- `device.battery_cycle_rating`: Xiaomi CN poster via IT之家 (1600 cycles). EU energy label summary on GSMArena: Class A, 70:55h endurance, 1000 cycles, free-fall class B, repairability class C.
- `soc.transistor_count`: TechInsights: "packing 30 billion transistors"; MediaTek launch briefing via ZOL: 300亿+ (30B+). Kurnal die analysis lists 30B? and his own cell-library estimate of ~27.3B. Not on MediaTek public spec pages.
- `soc.die_size_mm2`: Kurnal decap measurement: 10.88 mm x 12.92 mm = 140.57 mm², die thickness 200 µm, die mark BHJ11471B (22 FEB 2025), 458 gross die per 300 mm wafer. Notebookcheck quotes ~140.79 mm² from the same die shot. TechInsights die code BHJ11471B matches.
- `soc.package_this_phone`: Kurnal (package analysis) and TechInsights (PoP with Samsung LPDDR5X in Vivo X300 Pro/OPPO Find X9 Pro). Dimensity 9500 ships as a PoP part, so PoP in the 17T Pro is highly likely, but DRAM vendor/stack in this phone is unverified.
- `soc.l1_cache_bytes`: C1-Ultra/C1-Premium L1 sizes are fixed in Arm TRMs (4-way, 64 B lines). C1-Pro is 32 or 64 KB per Arm TRM; aggregators list 64/64 for D9500. MediaTek "100% bigger L1" matches C1-Ultra L1D 64→128 KB vs Cortex-X925. NOTE: Arm's C1 comparison PDF says C1-Premium 64/128 KB, contradicting the C1-Premium TRM (64 KB L1D) — TRM preferred. Per-core fields added below.
- `soc.l1i_kb_c1_ultra`: Arm TRM: 4-way set-associative, 64-byte lines.
- `soc.l1d_kb_c1_ultra`: Arm TRM: 4-way set-associative, 64-byte lines.
- `soc.l1i_kb_c1_premium`: Arm TRM: 4-way set-associative, 64-byte lines.
- `soc.l1d_kb_c1_premium`: Arm TRM: 4-way set-associative, 64-byte lines.
- `soc.l1i_kb_c1_pro`: Arm C1-Pro TRM allows 32 or 64 KB (4-way, 64 B lines); 64 KB in D9500 per aggregators (NanoReview/HMC) and consistent with D9400 A720 config; not stated by MediaTek.
- `soc.l1d_kb_c1_pro`: Arm C1-Pro TRM allows 32 or 64 KB (4-way, 64 B lines); 64 KB in D9500 per aggregators (NanoReview/HMC) and consistent with D9400 A720 config; not stated by MediaTek.
- `soc.c1_ultra_frontend_width`: Arm C1-Ultra Software Optimization Guide (quoted by jia.je and the LLVM C1-Ultra scheduling model PR #182251). Arm Lumex briefing: stays "10-wide", out-of-order window +25%, up to ~2K instructions in flight, L1I fetch bandwidth +33%. Numeric ROB entry count and pipeline depth are NOT published; LLVM's 320-entry ROB value is explicitly copied from Neoverse V3, do not use.
- `soc.c1_premium_frontend_width`: From Arm C1-Premium Software Optimization Guide as compiled by jia.je.
- `soc.c1_pro_frontend_width`: From Arm C1-Pro SOG/TRM and Arm Lumex C1-Pro blog as compiled by jia.je.
- `soc.c1_ultra_inflight_instructions`: Arm Lumex briefing (ComputerBase): "bis zu ~2K Instruktionen in flight", OoO window +25% vs X925. Approximate, not a ROB entry count.
- `soc.sve_vector_length_bits`: Arm C1-Ultra TRM: SVE with 128-bit vector length + SVE2 (same 128-bit on C1-Premium/C1-Pro).
- `soc.sme2_streaming_vector_length_bits`: Arm C1-SME2 unit TRM: SME/SME2 and Streaming SVE with 512-bit vector length; shared unit in the DSU cluster. Kurnal identifies a 2.91 mm² block with 640 KiB cache in the D9500 CPU cluster as probably the SME2 unit (tentative).
- `soc.c1_ultra_tlb`: From Arm C1-Ultra TRM as compiled by jia.je.
- `soc.gpu_clock_mhz`: Consistent across aggregators (NanoReview, 91mobiles, c-gpu, spesification) and Kurnal die report ("Mali G1-Ultra MP12 @1.7GHz"). Not on MediaTek/Arm pages; no kernel DT/devfreq dump found. Derived peak FP32 = 12 cores x 256 ops/clk x 1.716 GHz = 5.27 TFLOPS (FMA counted as 2); FP16 = 10.54 TFLOPS.
- `soc.gpu_peak_fp32_tflops_derived`: Computed: 12 x 256 x 1.716e9. Inherits the unconfirmed clock.
- `soc.gpu_l2_mb`: Kurnal die analysis: "Have 2MiByte L2 Cache". (Arm Lumex reference platform used 4 MB with 14 cores.)
- `soc.npu_tops`: TechInsights: "AI capabilities scale to 100 TOPS"; Counterpoint (from MediaTek briefing): up to 100 TOPS. Precision (INT8 vs FP8/INT4) and whether CIM NPU/SME2 are included are NOT stated. Not on MediaTek public pages.
- `soc.npu_llm_tokens_per_s`: Google Developers Blog (with MediaTek), Dec 2025: Gemma 3n E2B on Dimensity 9500 NPU (Vivo X300 Pro) >1600 tokens/s prefill and 28 tokens/s decode at 4K context. Developer report on MT6993: Qwen3-0.6B a16w8 ~19 ms/token (~53 tok/s) with Google's official .litertlm (genio-community). Model-specific; not a universal number.
- `soc.npu_prefill_tokens_per_s`: ">1600 tokens/sec for prefill" — lower bound.
- `soc.npu_structure`: Kurnal die analysis (NPU990 12.595 mm² vs APU890 10.414 mm²; MDLA core 1.811 mm²; MVPU core 0.62 mm²; MVPU cache 512 KiB). Compiler flags from Google's official Qwen3-0.6B.mediatek.mt6993.litertlm (genio-community thread). Internal MAC-array dimensions still unpublished.
- `soc.npu_precisions_documented`: 990-specific INT4/FP8 throughput table still not published.
- `soc.mmwave`: MediaTek spec table lists Sub-6/FR1, 5CC-CA, 7.4 Gbps; Xiaomi Global/TW band lists contain FR1 bands only. MediaTek M90 (FR1+FR2) is a separate modem, not in D9500.
- `soc.memory_channel_width_bits`: 4 x 16-bit LPDDR5X channels per aggregators (NanoReview/PhoneBench/spesification). JEDEC LPDDR5X channels are x16; MediaTek does not publish the controller width.
- `soc.memory_theoretical_bandwidth_GBps`: Derived for the 17T Pro: 9600 MT/s x 64 bit / 8 = 76.8 GB/s (SoC max at 10667 MT/s = 85.3 GB/s). Inherits the unconfirmed 64-bit width.
- `soc.part_number`: Kurnal package photo (MEDIATEK ARM MT6993Z, date code 2521 = 2025 wk21), TechInsights (MT6993Z), Google LiteRT SDK target SocModel.MT6993 for Dimensity 9500. Google LiteRT doc page listing "MT6990" appears to be an error. Resolves conflict #15.
- `soc.die_block_cpu_cluster_mm2`: Kurnal: CPU cluster 28.75 mm² (a 25.84 mm² variant excluding some area also shown; 18.38% of die)
- `soc.die_block_c1_ultra_core_mm2`: Kurnal; incl. 2 MiB L2. Est. ~555M transistors.
- `soc.die_block_c1_premium_core_mm2`: Kurnal; incl. 1 MiB L2.
- `soc.die_block_c1_pro_core_mm2`: Kurnal; incl. 512 KiB L2.
- `soc.die_block_gpu_mm2`: Kurnal: Mali-G1 Ultra MP12, 17.24% of die.
- `soc.die_block_gpu_shader_core_mm2`: Kurnal: ~282M transistors per core (estimate).
- `soc.die_block_npu990_mm2`: Kurnal.
- `soc.die_block_mdla_core_mm2`: Kurnal.
- `soc.die_block_mvpu_core_mm2`: Kurnal.
- `soc.die_block_sme2_block_mm2_tentative`: Kurnal: "4 Core = 2.91 mm², 640 KiB cache, maybe SME?" — tentative identification.
- `soc.process_n3e_cpp_nm`: N3E contacted poly pitch 48 nm (WikiChip, IEDM 2022 data); N3P is an optical shrink of N3E with compatible design rules (TSMC). Kurnal: D9500 uses N3 "2-1" ultra-HD library (cell height 143 nm, 48 nm gate pitch) on non-CPU logic and "2-2" HD library (169 nm, 48/54 nm) on CPU/NPU/GPU/IO.
- `soc.process_n3e_min_metal_pitch_nm`: N3E minimum metal pitch 23 nm (WikiChip). N3P-specific BEOL metals (Cu vs Ru/Co liners) remain unpublished.
- `soc.euv_numerical_aperture`: TSMC says High-NA EUV is not needed even for A16 (Reuters 2024-05-14); 3 nm-class nodes use 0.33 NA NXE scanners. High-NA (0.55) is NOT used on N3P.
- `soc.boot_chain_generic_mediatek`: Generic, publicly documented MediaTek Android boot flow; Xiaomi 17T Pro device-specific chain, memory map and firmware clocks are not published.
- `browser.webgpu_mali_g1_ultra_specific`: Class-level ARM support is documented; this exact GPU is unconfirmed. | 2026-11-12: No per-GPU WebGPU confirmation found for Mali-G1 Ultra; gpuweb status and Chrome docs describe Android support at vendor/OS level only. The app's live WebGPU probe on the device is the only authoritative test. **Searched:** gpuweb Implementation-Status wiki, Chrome WebGPU release notes, web search
- `competitors.xiaomi_17t_pro.price_us_msrp`: No official US MSRP exists (TechRadar review, PhotoWorkout). Amazon US import listings 2026-11: ~$709.50 (12/256) and ~$775 (12/512) per Notebookcheck price widget; no US warranty.
- `competitors.iphone_18_pro_max.foundry`: Apple says "latest 2-nanometer process"; TechInsights preliminary teardown identifies A20 Pro on TSMC N2 with GAA.
- `competitors.iphone_18_pro_max.price_us_512gb`: Re-verified on live apple.com/shop (familyType iphone18promax) on 2026-11-12; 256 GB = $1,299.
- `competitors.iphone_18_pro_max.price_us_1tb`: Re-verified on live apple.com/shop (familyType iphone18promax) on 2026-11-12; 256 GB = $1,299.
- `competitors.iphone_18_pro_max.price_us_2tb`: Re-verified on live apple.com/shop (familyType iphone18promax) on 2026-11-12; 256 GB = $1,299.
- `competitors.iphone_18_pro_max.ram_gb`: Apple does not advertise RAM; MacRumors confirmed 12 GB from Xcode 27 device data.
- `competitors.iphone_18_pro_max.battery_typical_mah`: Apple EU energy label (SIM-tray models). eSIM-only models (incl. US) are larger: 5,567 mAh per teardown (PhoneArena).
- `competitors.iphone_18_pro_max.geekbench6_single`: Notebookcheck, Geekbench 6.7. Different lab/version than the Xiaomi GB6 row — label as cross-lab.
- `competitors.iphone_18_pro_max.geekbench6_multi`: Notebookcheck, Geekbench 6.7. Cross-lab caveat as above.
- `competitors.iphone_18_pro_max.3dmark_wle_high_phonearena`: Not in the 17T review same-table set used for Xiaomi vs Ultra. | 2026-11-12: Not found in PhoneArena's 17T Pro review table; using another lab would break same-table comparability. **Searched:** PhoneArena 17T review, PhoneArena A20 vs S26U article
- `competitors.galaxy_s26_ultra.process`: Qualcomm product brief: 3 nm. TechInsights identified TSMC N3P on the standard SM8850-AC (in Xiaomi 17 Pro Max). The "for Galaxy" bin was not separately analyzed in sources found.
- `competitors.galaxy_s26_ultra.price_us_official_msrp`: US launch MSRP 256 GB (Feb 25 2026). Samsung raised US prices in Oct 2026: live samsung.com/us on 2026-11-12 shows msrpPrice 1399.99 (256 GB), 1599.99 (512 GB), 1999.99 (1 TB).
- `competitors.galaxy_s26_ultra.price_us_current_msrp_256`: Live samsung.com/us msrpPrice after Oct-2026 increase (PhoneArena report).

## Still unknown: what was searched

| Field | Searched |
|---|---|
| UFS lane count (device) | Xiaomi Global/TW/CN specs, Notebookcheck AndroBench (3.02 GB/s seq read can't tell 2-lane from 4-lane), GSMArena, IT之家. Needs a teardown or a UFS descriptor dump (`/sys/devices/platform/*/ufshcd*` or similar on a rooted device). |
| DRAM vendor | TechInsights (covers Vivo X300 Pro and OPPO Find X9 Pro only), Kurnal, iFixit, Xiaomi ERP manual. No 17T Pro board teardown exists publicly. |
| PMIC | Linux MT6363/MT6373 bindings are platform-generic. No 17T Pro board photos with markings were found. |
| Numeric ROB / pipeline depth (C1-Ultra/Premium) | Arm TRMs, telemetry spec, SOG excerpts, the LLVM model (its ROB=320 is copied from V3), and the Arm Lumex briefing. Arm hasn't published either figure. |
| Official GPU clock | MediaTek and Arm pages, Notebookcheck, Kurnal (says "@1.7 GHz"). No devfreq/DT dump found. 1716 MHz stays unconfirmed. |
| NPU MAC dimensions, INT4/FP8 table | MediaTek PR, product pages, and infographic; NeuroPilot/LiteRT docs; Genio community; Kurnal. Not published. |
| Battery cathode | Xiaomi specs/FAQ, IT之家, Notebookcheck. Not published. |
| Device boot chain / memory map | Only the generic MediaTek chain is public (BootROM, Preloader, TF-A BL31/TEE/GenieZone, LK). Nothing specific to the 17T Pro. |
| N3P BEOL metals / HKMG stack | TSMC pages, WikiChip, TechInsights public summaries. Not public. |
| WebGPU on Mali-G1 Ultra | gpuweb status wiki, Chrome notes. The app's live probe is the only real test. |
| iPhone 18 Pro Max 3DMark WLE (PhoneArena same table) | PhoneArena 17T review and A20-vs-S26U article. Not in the same table. |

## Reference imagery for 3D component models (links only; nothing downloaded for redistribution)

| What | URL | License / terms | Use for |
|---|---|---|---|
| Kurnal D9500 die-shot report (55 pp: package, decap, metal layers, annotated die shot, block areas) | https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf | "Copyright @Kurnal", all rights reserved. Use it as a measurement reference only; don't redistribute the images. | Die floorplan proportions, block mm² values, package outline |
| Kurnal die-shot page (D9500) | https://kurnal-insights.com/dieshot/mediatek-dimensity-9500-mt6993/ | Same as above (copyright Kurnal) | Die aspect ratio 10.88 × 12.92 mm |
| Kurnal die-shot gallery (D9400/D9500 side by side) | https://kurnal-insights.com/en/dieshot/ | Copyright Kurnal | Generation-to-generation comparison |
| Notebookcheck die-shot news (reproduces Kurnal's X post) | https://www.notebookcheck.net/MediaTek-Dimensity-9500-die-shot-showcases-noticeably-larger-chip-and-incremental-upgrades-to-CPU-and-NPU.1128763.0.html | Notebookcheck/Kurnal copyright | Annotated block positions |
| TechInsights D9500 floorplan / packaging summaries | https://www.techinsights.com/blog/mediatek-dimensity-9500-digital-floorplan-analysis ; https://www.techinsights.com/blog/mediatek-dimensity-9500-advanced-packaging-quick-look | Proprietary (images behind a paywall) | PoP cross-section concept only |
| Xiaomi 17T Pro official repair manual (exploded parts list of 25 items, disassembly photos, VC/graphite placement) | https://spare-parts.mi.com/cdn/shop/files/P12U_Xiaomi_17T_Pro_ERP_c1d3851e-b6a1-4622-b262-c160cb7fba23.pdf?v=18270098609428527401 | Xiaomi copyright, published for repair. Reference only. | Layer stack: display module, antenna shell, mainboard, sub-board, dual-cell battery, VC, camera modules, battery cover |
| Xiaomi official product imagery and spec pages | https://www.mi.com/global/product/xiaomi-17t-pro/specs/ | Xiaomi copyright (press/marketing) | External dimensions 162.2 × 77.5 × 8.25 mm, camera layout |
| MediaTek D9500 infographic (PDF) | https://www.mediatek.com/hubfs/MediaTek%20Assets/Pdfs/Infographics/D9500%20Infographic-%2019th%20September.pdf?hsLang=en | MediaTek copyright, press material | Block labels and marketing claims |
| Arm C1-Ultra / C1-Pro TRMs and SOG (pipeline block diagrams) | https://support.arm.com/documentation/108014/0101/Technical-overview/Core-components ; https://developer.arm.com/documentation/111079/3-0 | Arm proprietary documentation (free to read, not redistributable) | Pipeline/unit topology for the CPU deep dive |
| Wikimedia Commons, MediaTek ICs category | https://commons.wikimedia.org/wiki/Category:MediaTek_integrated_circuits | CC-licensed per file, but **no Dimensity 9500 die shot exists there** | Only freely licensed option; nothing usable for D9500 |

There is no public iFixit, JerryRigEverything, PBK, or TechInsights teardown of the 17T Pro itself (searched 2026-11-12). The Xiaomi repair manual is the best phone-internals reference available.
