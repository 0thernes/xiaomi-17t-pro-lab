# Contributing

The lab is a static site about one phone. Changes should keep that focus.

## Setup

```bash
npm install
npm start
npm test
npm run lint
```

Node 22 or newer. Playwright uses system Chrome locally and its own Chromium in CI (`CI=true`).

## Rules for numbers

- Do not type a hardware figure into a view. Read it from `data/specs.json`, or compute it from values that come from that file, and show the formula.
- If `status` is `unknown`, render UNKNOWN. Do not substitute a blog’s number.
- TSMC N3P stays FinFET. Do not draw nanosheets for this SoC.
- 1716 MHz and 100 TOPS are unconfirmed. Do not restyle them as official. The nine open leaves on the Specs page stay open until `specs.json` says otherwise.
- A new measurement must say what it actually timed (include readback if you waited on the GPU) and what it cannot see.
- The NPU route must keep the sentence that the math is not running on NPU 990.

## Code

- ES modules, readable names, no minified authored source. Vendored libraries stay in `vendor/` with their licenses.
- Lazy-load scenes. Do not import three.js from the CPU or lithography modules.
- Do not choose a graphics tier from viewport width or orientation.
- Touch targets stay at least 44 px. Honor `prefers-reduced-motion`.
- The dev server’s path check must keep using `path.relative`, not a string prefix.

## Before a PR

```bash
npm test
npm run lint
npm run test:smoke
```

`VERSION`, `package.json`, and `CHANGELOG.md` move together.

## Commits

Describe the behavior a reader of the lab gains. The history of this repo is small; keep commits separable.
