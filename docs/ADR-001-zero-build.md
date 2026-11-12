# ADR 001 — Zero-build static site

## Status

Accepted for v0.1.0.

## Context

The lab is hosted as GitHub Pages at `0thernes.github.io/xiaomi-17t-pro-lab/`. Pages serves files. It does not run a bundler. The site must also work when the path is not `/`.

## Decision

Author ES modules and load them from `index.html` with relative URLs. Vendor three.js and p5.js. Use a hash router. Ship `.nojekyll`. Keep Node tooling (tests, Prettier, Playwright, the loopback server) out of the runtime.

## Consequences

`file://` does not work in Chrome, because modules are blocked. A local HTTP server is the development path. There is no tree-shaking; lazy `import()` is how we avoid loading every lab at startup. p5 is the official minified file so the phone does not parse a 5 MB source; authored files stay readable.
