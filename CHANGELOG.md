# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-12

Rebuild after v0.1 was rejected. The verified solvers stay. The shell, the models, and the spec leaves do not.

### Added

- Phone-first shell: Unbounded and Source Sans 3, 48 px targets, bottom dock, side rail from 960 px, safe areas, reduced motion.
- One WebGL subject at a time. PBR materials, a procedural studio HDRI, ACES plus a grade pass on tiers above low. Quality still comes from the fill probe. Ultra pixel ratio stays capped at 2.
- CC0 Metal Plate maps (Rob Tuytel, Poly Haven) on the frame. Procedural PCB and screen maps are original.
- Exploded phone from the cited body and the repair-manual stack. Die floorplan uses Kurnal’s areas and is labeled a reconstruction. Reference photographs are not in the repo.
- Zoom rail: phone, die, FinFET pitch (48 nm gate, 23 nm metal, NA 0.33), silicon lattice with the NIST nearest-neighbor distance.
- CPU, GPU, and NPU rails walk the taxonomy. The chase, a five-stage pipeline, a software tile rasterizer, and an INT8 matmul are live. 1716 MHz and 100 TOPS render as unconfirmed.
- Workloads: instanced stress scene, vendored TinyStories-8M (float16) greedy decode, vendored Glitchling play sim, RK4 and Dormand–Prince, a local-page browser shell.
- Specs page lists the nine still-open leaves and conflicts 16–20.
- `data/specs.json` replaced with the 2026-11-12 pass, including `confidence` where that pass recorded it.

### Fixed

- The high tier no longer opens on a black viewport. SSAO was the first post pass and only multiplied occlusion onto an empty buffer, so the product was black on every machine that measured a fast fill. The scene is drawn first. If a later pass still returns black, the page drops the chain and says so on the canvas.

### Changed

- iPhone Geekbench 6.7 stays on its own row. It is Notebookcheck, not the PhoneArena table, and it is not divided into the Xiaomi score.
- The phone body is an extruded rounded slab (9 mm plan radius, reconstructed), with transmission glass, a camera plateau, side buttons, and a USB-C port. The hero starts assembled and fills the stage. Tiers above medium add the vendored three.js SSAO pass.
- Open findings are tracked as GitHub issues, not as pull requests: [#2](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/2), [#3](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/3), [#4](https://github.com/0thernes/xiaomi-17t-pro-lab/issues/4).
- The hero and the die view can show a Real vs model card. Copyrighted product, repair, Kurnal, and TechInsights photographs are linked from [CREDITS.md](CREDITS.md) and are not in the repo. `refs/` is gitignored for local modeling copies.

## [0.1.0] - 2026-11-12

First public lab slice for the Xiaomi 17T Pro and Dimensity 9500.

### Added

- Phone hub, zoom taxonomy, CPU chase, GPU matmul, NPU-concepts matmul, lithography, transistor solvers, head-to-head, provenance badges, tests, and CI.

[0.2.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v0.2.0
[0.1.0]: https://github.com/0thernes/xiaomi-17t-pro-lab/releases/tag/v0.1.0
