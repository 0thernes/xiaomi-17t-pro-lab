# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-11-25

Hardening sweep over the v2.0.0 tree. The product stays on 2.x because `main` was already 2.0.0; a drop to 0.3.0 would have been a semver regression. The audit write-up is [docs/audit/REVIEW-0.3.0.md](docs/audit/REVIEW-0.3.0.md).

### Fixed

- The thermal throttle chart integrates the minutes printed on its axis. It had been stepping 0.6 s while the labels said 20 minutes.
- Battery energy no longer uses an unpublished 3.88 V to claim 27.16 Wh, and the wired-charge callout uses the cited 100 W instead of 90 W. Nominal watt-hours stay unpublished.
- A Content-Security-Policy is on the page and the dev server. Glitchling loads as a module instead of `new Function`.
- Playwright checks every route for console errors and a non-black canvas when the route has one.
- The README workloads row is a single table cell again.

## [2.0.0] - 2026-11-21

Major custom GLSL shaders, interactive 3D raycast inspection, live PDE/TDSE/2D-FFT physics, and quantum circuit composer release.

### Added

- **Dedicated Thermal PDE & 3D IceLoop Lab (`#/thermal`)**: Real-time 2D explicit FDTD silicon heat solver (`∂T/∂t = α∇²T + q_dyn + q_leak(T) − hΔT`) running live across Kurnal's `140.57 mm²` Dimensity 9500 floorplan, mapped onto a custom GLSL FLIR Ironbow shader & toggleable 3D `5,500 mm²` IceLoop copper vapor chamber, with click-to-inject hotspots and 20-minute throttling vs `7,000 mAh` Si-C discharge curves.
- **Custom WebGL2 GLSL Shaders & Microfacet PBR (`src/graphics/shaders.js`, `src/graphics/pbr-maps.js`)**: Physical optical thin-film interference shader on the silicon die, live FLIR Ironbow isothermal contour shader, volumetric quantum wave shader, and procedural brushed aluminum & frosted AG glass normal/roughness maps.
- **Interactive 3D Raycast Component Inspector (`src/graphics/view.js`)**: Hover any 3D phone layer, Leica optic, FCC mainboard IC, Kurnal die block, or FinFET dielectric to lock on with a wireframe reticle & live spec HUD; click to smoothly fly the camera onto that component (`R` resets framing).
- **Live 60 FPS Unitary Crank–Nicolson TDSE Quantum Tunneling (`src/sim/tdse.js`)**: Real complex wave-packet solver conserving probability norm `∫|ψ|²dx = 1.000000` to `< 1e-8`, supporting single HfO₂ gate barriers and Resonant Double-Barrier Diodes with phase-colored `arg(ψ)` rendering, plus live slider-driven 3D FinFET geometry rebuilding.
- **Live 2D Fourier Optics EUV Mask-to-Wafer Simulator + OPC (`src/sim/litho-2d.js`)**: Separable 64×64 radix-2 2D FFT imaging of `6T SRAM`, `L-Bend Corner`, `Via0 Contacts`, and `48 nm Line/Space` layouts with interactive **OPC Hammerhead Serifs**, 2D pupil diffraction spectrum, Zernike defocus, and wafer resist IoU fidelity.
- **Interactive 3D Quantum Bloch Sphere & Live Circuit Composer (`#/work/sci`)**: Real-time gate composer (`H, X, Y, Z, S, T, Ry, CNOT`, presets `|00⟩, |+0⟩, Bell |Φ⁺⟩, Magic T, GHZ-3`) driving a 3D Bloch sphere vector, complex amplitude phase wheels `|α|e^(iφ)`, purity `Tr(ρ²)`, and von Neumann entanglement entropy `S(ρ₀)`.
- **Upgraded Operational Workloads (`#/work/*`)**: 6K instanced PBR stress arena with dynamic point lights & P50/P95/P99 frametime scope; Neuralese 1-click intervention presets + 8-layer residual norms + Shannon entropy/perplexity; Glitchling bioluminescent scent aura + scrolling metabolic homeostasis sparkline; GigaChad interactive 80-agent 2D stigmergic pheromone grid with click-to-drop task attractors & Guardian threat interception.
- **Spotlight Command Palette (`Ctrl+K`) & Scientific WebAudio Sonifier (`src/shell.js`, `src/audio.js`)**: Instant keyboard/topbar search jumping to any lab, workload, or FCC component, plus opt-in WebAudio telemetry sonification.
- **New Unit & E2E Tests (`tests/v2-engines.test.mjs`, `tests/e2e/smoke.spec.js`)**: Verifies Crank–Nicolson TDSE unitarity, 2D FDTD thermal cooling delta, 2D FFT lithography/OPC fidelity, Bloch/Bell entanglement entropy, `#/thermal` non-black canvas, and `Ctrl+K` navigation.

## [1.0.0] - 2026-11-21

Major visual, ergonomics, physics, and operational workload overhaul.

### Added

- **Precision Instrument UI/UX & Typography**: Replaced `Unbounded` and muddy brown palettes with vendored variable fonts (`Space Grotesk`, `Inter`, `JetBrains Mono`), aerospace obsidian graphite surfaces, custom tactile sliders with live fill progress, KPI readout grids, scale-exponent left rail (`10⁻¹ m → 10⁻¹⁵ m`), and cross-origin timer status pill.
- **Dedicated Memory & Storage Lab (`#/memory`)**: Live 3D MT6993Z PoP + SK hynix H58GG6AV9H LPDDR5X-9600 (76.8 GB/s) & HN8T271EJK UFS 4.1 (3,021.5 MB/s) showcase, live browser STREAM Triad + 16 MB copy benchmark, log-log CS Roofline plot, and interactive LLM memory-wall decode calculator.
- **"Mad Scientist" EUV Lithography Lab (`#/litho`)**: Live 3D 13.5 nm reflective optical column + Sn LPP plasma source, 2×2 transfer-matrix 40-pair Mo/Si Bragg multilayer reflectivity spectrum, defocus-aware Abbe aerial image with Conventional/Annular/Dipole illuminators, and live 2D Poisson EUV photon shot-noise & 3σ Line-Edge Roughness resist simulator.
- **Atomic, FinFET/GAA, Tunneling & Dirac e⁻/e⁺ Lab (`#/transistor`)**: 3D FinFET vs N2 GAA & WKB tunneling / Dirac field switcher, finite-difference Schrödinger eigenstates `|ψ₁..₃|²`, WKB oxide gate-leakage cliff, Kronig–Penney crystal bands, Varshni/Sze thermal carrier density `n_i(T)`, and relativistic Dirac electron-positron dispersion (`2mₑc² = 1.022 MeV`).
- **Operational Real-Time Workloads (`#/work/*`)**:
  - Gaming PBR stress arena with live 60-frame frametime oscilloscope (100–4,000 instances).
  - Neuralese live weight-hacked TinyStories-8M (editable prompt, streaming generation, live 16-head Layer-7 attention heatmap, Top-6 softmax probability bars, MLP/Attention gain, layer ablation, and weight perturbation sliders).
  - Glitchling 272-neuron 14-region foraging arena with click-to-drop snacks, live 4-flaw injection toggles, and live neural firing raster.
  - Tsotchke scientific differential computing (live 3D RK4 Lorenz attractor + DOPRI54 stiff Robertson / Van der Pol) and exact complex statevector quantum contextuality engine (Bell CHSH `S = 2√2`, 3-qubit GHZ Mermin-3 `⟨M⟩ = 4.0`, Mermin–Peres 3×3 magic square).
  - GigaChad mobile sovereign browser shell with live 60 Hz 5-caste stigmergic swarm cortex and hardware/sandbox profiler.
- **Searchable Forensic Specs & Visual Versus**: Instant search & category filtering on `#/specs`; multi-metric normalized benchmark bar chart and cleaned labels on `#/compare`; 8-step Powers-of-Ten zoom (`#/zoom`) down to subatomic quantum scale.
- **New Unit Tests (`tests/v1-engines.test.mjs`)**: Verifies Bragg transfer-matrix reflectivity, EUV photon ratio, WKB tunneling, Dirac hyperbola, intrinsic silicon carriers, CS Roofline bounds, Bell CHSH `2√2`, GHZ Mermin-3 `4.0`, and Bloch purity.

### Fixed

- Removed broken `SAOPass` post-processing halo and muddy brown studio backdrop from `src/graphics/view.js`, replacing them with an obsidian calibration reticle turntable, 4-point optical softbox PMREM, selective UnrealBloom, and SMAA under ACES Filmic tone mapping.
- Replaced fake iOS lockscreen texture with a live HyperOS 3 Dimensity 9500 hardware telemetry OLED display and multi-element Leica Summilux triple-camera optics (including rectangular 5× periscope telephoto).
- Upgraded CPU/GPU/NPU 3D processor worlds with animated copper bus wave-packets, RTUv2 ray-tracing beams, and non-clipping callout labels.
- Formatted `data/specs.json` cleanly so `npm run lint` passes with zero warnings.

## [0.2.0] - 2026-11-12

### Changed

- The WebGL2 path is the look: AgX, a studio PMREM, bloom, SMAA, and a gentle SAO pass that multiplies onto the beauty pass only after it has been drawn. The hero turntable shows the full phone, then the Deep Violet back and camera plateau, then the exploded stack. CPU, GPU, and NPU views draw instanced SRAM, a scaled 48 nm fin row, a 23 nm metal stack, live pipeline packets, live tile bins, and a live INT8 MAC array.
- three.js r187 is vendored. p5.js is 2.4 and sketches use a high-DPI pixel density up to 2.
- The phone body is a 10 mm rounded profile (the published corner radius is still unpublished, so this radius is a reconstruction) with an anisotropic aluminum frame, AG clearcoat back, iridescent lenses, side buttons, and a USB-C port.

Rebuild after v0.1 was rejected. The verified solvers stay. The shell, the models, and the spec leaves do not.

### Added

- Phone-first shell: Unbounded and Source Sans 3, 48 px targets, bottom dock, side rail from 960 px, safe areas, reduced motion.
- One WebGL subject at a time. PBR materials, a procedural studio HDRI, ACES plus a grade pass on tiers above low. Quality still comes from the fill probe. Ultra pixel ratio stays capped at 2.
- CC0 Metal Plate maps (Rob Tuytel, Poly Haven) on the frame. Procedural PCB and screen maps are original.
- Exploded phone from the cited body and the repair-manual stack. Die floorplan uses Kurnal’s areas and is labeled a reconstruction. Reference photographs are not in the repo.
- Zoom rail: phone, die, FinFET pitch (48 nm gate, 23 nm metal, NA 0.33), silicon lattice with the NIST nearest-neighbor distance.
- CPU, GPU, and NPU rails walk the taxonomy. The chase, a five-stage pipeline, a software tile rasterizer, and an INT8 matmul are live. 1716 MHz and 100 TOPS render as unconfirmed.
- Workloads: instanced stress scene, vendored TinyStories-8M (float16) greedy decode, vendored Glitchling play sim, RK4 and Dormand–Prince, a local-page browser shell.
- Specs page lists the leaves still open after pass 2, conflicts 16–22, and the parts, versions, issues, and supply-chain catalogs.
- `data/specs.json` replaced with the 2026-11-12 pass, then with pass 2. Pass 2 names the SK hynix DRAM and UFS, the MT6661/MT6667, MT6379, and MT6681 PMICs, the cameras, the radios, and the board parts. Positions on the model are a reconstruction. FCC photos are not shipped. Wild Life Extreme UL medians are 6209 for this phone and 8059 for the iPhone 18 Pro Max.

### Fixed

- The high tier no longer opens on a black viewport. SSAO was the first post pass and only multiplied occlusion onto an empty buffer, so the product was black on every machine that measured a fast fill. The scene is drawn first. If a later pass still returns black, the page drops the chain and says so on the canvas.

### Changed

- iPhone Geekbench 6.7 stays on its own row. It is Notebookcheck, not the PhoneArena table, and it is not divided into the Xiaomi score.
- The phone body is an extruded rounded slab (9 mm plan radius, reconstructed), with transmission glass, a camera plateau, side buttons, and a USB-C port. The hero starts assembled and fills the stage. Tiers above medium add the vendored three.js SSAO pass.
- Open findings are tracked as GitHub issues, not as pull requests: [#2](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/2), [#3](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/3), [#4](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/4).
- The hero and the die view can show a Real vs model card. Copyrighted product, repair, Kurnal, and TechInsights photographs are linked from [CREDITS.md](CREDITS.md) and are not in the repo. `refs/` is gitignored for local modeling copies.
- CPU, GPU, and NPU levels fly between 3D subjects. Package, floorplan, C1-Ultra ports, cache, SRAM, FinFET, BEOL, the live aerial image, the shader cores, the tile bins, and the MAC values are labeled reconstructions except where a leaf is cited. TSVs and hybrid bonding are not claimed. N2 GAA is a comparison only.

## [0.1.0] - 2026-11-12

First public lab slice for the Xiaomi 17T Pro and Dimensity 9500.

### Added

- Phone hub, zoom taxonomy, CPU chase, GPU matmul, NPU-concepts matmul, lithography, transistor solvers, head-to-head, provenance badges, tests, and CI.

[2.0.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v2.0.0
[1.0.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v1.0.0
[0.2.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v0.2.0
[0.1.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v0.1.0
