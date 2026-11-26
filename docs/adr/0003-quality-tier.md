# ADR 003 — Quality tier from a measured probe

## Status

Accepted for v0.1.0.

## Context

Choosing a graphics tier from `max-width` promotes a phone in landscape to the desktop tier. That was a real bug in the predecessor: a 915 CSS-pixel landscape phone received a high pixel ratio, MSAA, and a large shadow map.

## Decision

`measureCapability` records `deviceMemory`, `hardwareConcurrency`, pointer coarseness, a WebGL2 fragment fill time, and the unmasked renderer string. SwiftShader and a slow fill select low. A fast discrete GPU with a fine pointer can select ultra, with pixel ratio still capped at 2. Reduced motion stops the turntable; it does not by itself pick the tier. `?tier=` can force a tier when checking the high path.

Low tier skips PMREM and bloom and lowers metalness, because a fully metallic material with no environment map renders as a black slab.

## Consequences

The same phone can land on different tiers as thermals and the browser change. The tier line on the hub lists the inputs so the choice can be audited. Orientation and viewport width are not among them.
