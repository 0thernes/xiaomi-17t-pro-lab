# ADR 006 — One subject in the scene

## Status

Accepted for v0.2.0.

## Context

The museum this lab is measured against builds every machine up front. A review counted about 14.6 thousand draw calls before anyone had picked a machine.

## Decision

A route owns one renderer. It adds the subject for the level on screen and drops the previous one. The stress scene is a single instanced mesh. Ultra does not multiply the pixel ratio by four.

## Consequences

A zoom is a swap plus a dolly, not a metric camera that holds a phone and a lattice in one coordinate system. The caption says which length is cited.
