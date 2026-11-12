# Review 0.2.0

Each finding is one class. Fixed items are closed. Open items stay open on purpose.

## Closed

| Class | Finding | What changed |
| --- | --- | --- |
| bug | The Poly Haven Metal Plate diffuse map is a rusty floor. Multiplied onto the frame, the phone read as a rust slab. | The frame keeps that asset’s normal and roughness maps and a sand-blasted aluminum color. The diffuse file stays vendored and credited. |
| bug | Focusing the new heading on each route drew a box around the title in screenshots. | `focus({ focusVisible: false })`, and the ring is only on `:focus-visible`. |
| bug | The phone camera sat inside the body, so the stage showed a crop of one face. | The phone dolly is 420 mm for a 162.2 mm body. |
| error | A tile test expected the last bin to be empty. The triangle’s bounds touch that tile; the pixel test already showed it was not shaded. | The test expects the bin and an unshaded corner. |
| issue | v0.1 hardcoded L1, GPU clock, and NPU TOPS as unknown after the spec pass filled them. | Views read `specs.json`. 1716 MHz and 100 TOPS stay unconfirmed. |

## Open

| Class | Finding | Why it stays |
| --- | --- | --- |
| dilemma | CQM creatures, including a search for Asmodenius, are not in this tree. | Asmodenius is absent at `b0dcf15`. The Super Creature sources are TypeScript under the Cosmogonic non-commercial license. Copying them into this MIT repo would relicense them or leave a second license on files that do not run in the browser. Glitchling’s JS play sim does run, and its missing upstream license is recorded in `vendor/glitchling/NOTICE.md`. |
| issue | The score is original synthesis, not a sampled orchestra. | No CC0 or CC-BY instrument file was found whose credit text matched the bytes. The help dialog says that. It does not name a sample that is not in the repo. |
| conflict | Nine spec leaves are still open, and conflicts 16–20 disagree. | They are listed on the Specs page with the search note from the leaf. The page does not pick a winner. |
