# ADR 004 — Timers and cross-origin isolation

## Status

Accepted for v0.1.0.

## Context

Cache-level pointer chases need a finer clock than a 100 µs quantum, and GitHub Pages cannot set COOP/COEP.

## Decision

If `crossOriginIsolated` is already true, use it and say so. Otherwise repeat each chase until the elapsed time is many quanta, and print `resolution / sqrt(12) / steps` as the uncertainty. Offer `coi-serviceworker.js` behind a button. The worker adds COOP/COEP and the button reloads once. The dev server sets the headers itself, so local and CI runs are isolated without the worker.

## Consequences

A Pages visitor who never presses the button gets coarser error bars, not a fake nanosecond. The worker is not installed by default, so the first paint does not depend on a controlling service worker. SharedArrayBuffer is not required for v0.1.
