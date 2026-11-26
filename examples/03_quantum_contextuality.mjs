/** Example 03: Bell |Phi+> CHSH, 3-qubit GHZ Mermin-3, Peres-Mermin 3x3 & von Neumann entropy. */
import {
  buildPresetState,
  entanglementEntropy,
  merminPeresSummary,
  runChshExperiment,
  runMermin3Experiment,
} from "../src/sim/quantum-lab.js";

const chsh = runChshExperiment({ shots: 2000, angleDeg: 22.5, seed: 42 });
const mermin = runMermin3Experiment({ shots: 2000, phaseDeg: 0, seed: 9500 });
const bell = buildPresetState("bell").state;
const pm = merminPeresSummary();

console.log(
  `CHSH exact S = ${chsh.sExact.toFixed(6)} (sampled ${chsh.sSampled.toFixed(4)}) vs classical bound ${chsh.classicalBound}`,
);
console.log(
  `Mermin-3 GHZ exact M = ${mermin.mExact.toFixed(6)} (sampled ${mermin.mSampled.toFixed(4)}) vs classical bound ${mermin.classicalBound}`,
);
console.log(`Bell |Phi+> reduced entanglement entropy S(rho_0) = ${entanglementEntropy(bell, 0).toFixed(6)} bits`);
console.log(
  `Peres-Mermin 3x3 magic square: ${pm.quantumSatisfiedContexts}/${pm.totalContexts} quantum vs max ${pm.classicalMaxContexts}/${pm.totalContexts} classical`,
);
