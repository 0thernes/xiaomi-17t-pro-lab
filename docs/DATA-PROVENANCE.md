# Data provenance

`data/specs.json` is the only source of hardware numbers in the UI. Every leaf has `value`, `unit`, `source`, and `status` of `confirmed`, `unconfirmed`, or `unknown`.

Rules enforced by `src/sim/validate-specs.js` and `npm test`:

- `confirmed` requires a non-empty value and a source string.
- `unknown` requires `value: null`. The app must not invent a fill-in.
- `unconfirmed` may carry a value, and then it must carry a source.

`data/taxonomy.json` is the zoom tree. A facet with a `source` URL is badged **CITED**. A facet whose status is confirmed but which has no URL of its own is badged **CONFIRMED** and says the taxonomy has no separate URL. Unknown facets are **UNKNOWN**.

Badges in the UI:

| Badge       | Meaning                                                                |
| ----------- | ---------------------------------------------------------------------- |
| MEASURED    | Timed or feature-detected in this browser, on this load                |
| CITED       | Copied from a leaf that has a source                                   |
| COMPUTED    | Arithmetic from a formula printed beside the badge                     |
| UNKNOWN     | The dossier’s value is null, or a symbol in the formula is unpublished |
| UNCONFIRMED | A source exists and the dossier does not treat it as official          |

Computed examples that do not invent missing inputs:

- PPI = hypot(width, height) / diagonal, from cited pixels and inches.
- P(Ultra) / P(Pro) = 4.21 / 2.7, because α, C, and V cancel.
- GPU FP32 rate = 12 × 256 × f. If f is null, the result is UNKNOWN. A slider may supply an illustrative f; the badge stays COMPUTED and the label says it is not a measurement.
- DRAM bandwidth is UNKNOWN because the channel width is unpublished. The code path that would multiply rate by width returns null when width is null, and the UI does not substitute 64 bits.

Conflicts in `specs.json` (color depth, DCI-P3, USB PD, the FAQ’s “Hexagon” wording, the MT6990 / MT6993Z part number, and the rest) are preserved. The hub computes 2^(12×3) versus 2^(8×3) so the 8-bit versus 68-billion-color clash is visible as arithmetic.

Cluster clocks in `src/sim/constants.js` are checked by a test against the official cluster string, so a silent edit of 4.21 GHz fails CI.
