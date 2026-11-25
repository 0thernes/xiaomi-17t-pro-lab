# Why the Cosmogonic creatures are not in this tree

Checked against `0thernes/cosmogonic-quantum-mechalogodrom` at the default branch and at `b0dcf15`.

The repository license is the Cosmogonic License (non-commercial research and play). It allows the copyright holder, and other people for non-commercial use, to share the work if the license text and the attribution stay on the files. It is not an open-source license. Dropping those files into this MIT tree without that license would relicense them. Keeping the license would put a second license on files this site cannot execute.

The creature sources that do exist, including `src/sim/super-creature.ts`, are TypeScript. This lab is zero-build ES modules (`docs/ADR-001-zero-build.md`). Those files do not run in the browser here. A code search of that repository for `Asmodenius` returns no hits.

Loading the TypeScript from GitHub at runtime would still not execute it, and `script-src 'self'` would refuse a foreign script if a compiled bundle were hotlinked.

Glitchling stays. Its play sim is the JavaScript file already under `vendor/glitchling/`, with `NOTICE.md` recording the missing upstream license. It is not a Cosmogonic creature and it is not renamed into one.

This item stays open as a dilemma. There is no browser-runnable Cosmogonic creature that can be shared without either a build step or a license strip.
