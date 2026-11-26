/** Example 02: 20-minute (1,200 s) 2D FDTD silicon thermal PDE with vs. without 3D IceLoop VC. */
import { simulateSustainedThrottle } from "../src/sim/thermal-fdtd.js";

const pts = simulateSustainedThrottle({ minutes: 20, ambientC: 25, profileId: "gaming_nomad" });
const last = pts.at(-1);
console.log(
  `Simulated clock: ${last.simSec.toFixed(0)} s (${last.minute.toFixed(1)} min) across ${pts.length} samples`,
);
console.log(
  `With Xiaomi 3D IceLoop VC: peak = ${last.vcPeakC.toFixed(2)} C, sustained perf = ${last.vcPerfPct.toFixed(1)}%`,
);
console.log(
  `Without vapor chamber:     peak = ${last.noVcPeakC.toFixed(2)} C, sustained perf = ${last.noVcPerfPct.toFixed(1)}%`,
);
