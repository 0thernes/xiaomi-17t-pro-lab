# ADR 007 — Launch design system

## Status

Accepted for v0.2.0.

## Context

v0.1 was rejected for typography, hit targets, and a wireframe that did not look like a product.

## Decision

Unbounded for display, Source Sans 3 for text, IBM Plex Mono for figures. Tokens live in `styles/lab.css`. Targets are at least 48 px. The dock sits in the thumb zone and becomes a 220 px rail at 960 px. Orange on near-black is the launch color. Screens were wireframed in `docs/design/` before the views were written.

## Consequences

Literata and Outfit stay in `vendor/fonts` unused. New UI does not reference them.
