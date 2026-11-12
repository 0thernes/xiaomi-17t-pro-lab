# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-12

### Changed

- The transistor sliders reshape the FinFET drawing. Gate pitch defaults to the cited 48 nm and a reset restores it. Fin height, fin thickness, EOT, and gate length stay labeled as a drawing. The stress scene reports a live frame-time range. TinyStories lists each greedy token with its own loop time. Glitchling draws the positions `step()` just produced. Lorenz RK4 plots x versus z as the steps land; Robertson and Van der Pol run when that integral finishes.
- Audit pass: black silhouettes on thin meshes came from the SAO multiply and from transparent dielectrics. SAO is off. Bloom strength is 0.04 and the threshold is 0.985, so the metal rim no longer blooms into a white halo. Lithography and transistor routes are in the non-black canvas check. The lithography lede no longer calls the cited gate and metal pitches unknown. Unpublished fin height, high-k thickness, and the N3P metal deck above 23 nm are recorded as [issue #5](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/5).
- Frame and camera rings use a procedural brushed-metal normal and roughness. The back uses an AG-glass microfacet map. Launch colors Black, Deep Violet, and Deep Blue switch that glass; the RGB values are reconstructions of the names in specs.json. Zoom now descends die, block, cell, transistor, and lattice. The transistor shows source, drain, a high-k wrap, and a gate. BEOL is M0 at the cited 23 nm pitch plus wider reconstructed layers and vias. The lithography page adds an EUV scanner cutaway and a 3D resist surface from the live Abbe image.
- The WebGL2 path is the look: AgX, a studio PMREM, bloom, SMAA, and a gentle SAO pass that multiplies onto the beauty pass only after it has been drawn. The phone frame is a bevel-free rounded band with a Deep Violet back and readable LEICA and XIAOMI marks. CPU, GPU, and NPU cameras sit inside the block: fins and the metal stack at eye level, tile bins as a wall, MAC columns as towers, with fog and emissive packet streaks.
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

[0.2.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v0.2.0
[0.1.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v0.1.0
