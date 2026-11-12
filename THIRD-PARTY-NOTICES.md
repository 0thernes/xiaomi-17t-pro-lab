# Third-party notices

The lab’s own source is MIT (see `LICENSE`). The following are vendored unmodified.

## three.js r170

- Path: `vendor/three/`
- Copyright 2010-2024 Three.js Authors
- License: MIT (`vendor/three/LICENSE`)
- <https://github.com/mrdoob/three.js>

The postprocessing and environment helpers under `vendor/three/examples/jsm/` are part of the same project and the same MIT license. `RoomEnvironment` is adapted upstream from the Google model-viewer environment scene, also distributed with three.js.

## p5.js 1.11.3

- Path: `vendor/p5/p5.min.js`
- License: LGPL-2.1 (`vendor/p5/license.txt`)
- <https://p5js.org/>

The file is the official minified build so a phone does not parse the multi-megabyte unminified source. It is not authored code of this lab. Modifications to p5 itself would need to follow the LGPL; this repo does not modify it.

## Literata and Outfit

- Path: `vendor/fonts/`
- License: SIL Open Font License 1.1 (`vendor/fonts/LITERATA-LICENSE`, `vendor/fonts/OUTFIT-LICENSE`)
- Distributed via Fontsource

## Research dossiers

`docs/research/` and `data/*.json` quote published specifications. Those facts stay with their cited publishers. The compilation in this repo is part of the MIT-licensed project; it does not relicense Xiaomi, MediaTek, Arm, Apple, Samsung, ASML, or NIST materials.

## Service worker

`coi-serviceworker.js` is original to this repo (MIT). The COOP/COEP reload pattern is the well-known approach used by static hosts that cannot set headers.
