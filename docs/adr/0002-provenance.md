# ADR 002 — Provenance badges

## Status

Accepted for v0.1.0.

## Context

The predecessor review found claims that were wider than the code. This lab’s research dossier marks unknowns explicitly and records conflicts between official pages.

## Decision

Every hardware number on screen carries MEASURED, CITED, COMPUTED, or UNKNOWN. CITED requires a source on the specs leaf. COMPUTED requires the formula in the badge. A missing symbol (GPU clock, DRAM width, α, C, V) makes the result UNKNOWN rather than a guessed constant. Taxonomy prose with no URL is labeled CONFIRMED, not CITED.

Cluster constants in code are locked to `specs.soc.cpu_cluster` by a unit test.

## Consequences

Some panels are mostly UNKNOWN. That is the point. Illustrative sliders (GPU clock, fin thickness, well width) are allowed only when the result is marked COMPUTED and the control says it is not a measurement of this phone.
