/** Example 01: EUV 13.5 nm Rayleigh limits, 40-pair Mo/Si Bragg mirror & stochastic LER. */
import {
  aerialImageDefocus,
  braggSpectrum,
  depthOfFocusNm,
  euvPhotonEnergyEv,
  simulateStochasticResist,
} from "../src/sim/litho-advanced.js";
import { euvReference } from "../src/sim/rayleigh.js";

const ref = euvReference();
const bragg = braggSpectrum({ pairs: 40 });
const aerial = aerialImageDefocus({ na: 0.33, pitchNm: 36, sigma: 0.55 });
const resist = simulateStochasticResist({
  intensity1d: aerial.intensity,
  extentNm: aerial.extentNm,
  doseMjCm2: 30,
  seed: 42,
});

console.log(`EUV 13.5 nm photon energy: ${euvPhotonEnergyEv(13.5).toFixed(4)} eV`);
console.log(
  `Rayleigh k1=0.25 limit: 0.33 NA = ${ref.cdLimitLowNaNm.toFixed(3)} nm | 0.55 High-NA = ${ref.cdLimitHighNaNm.toFixed(3)} nm`,
);
console.log(
  `DOF (k2=0.5): 0.33 NA = ${depthOfFocusNm(0.33).toFixed(2)} nm | 0.55 High-NA = ${depthOfFocusNm(0.55).toFixed(2)} nm`,
);
console.log(
  `40-pair Mo/Si Bragg R(13.5 nm) = ${(bragg.rAt135 * 100).toFixed(2)}% | 11-mirror T = ${(bragg.elevenMirrorTransmission * 100).toFixed(2)}%`,
);
console.log(
  `Stochastic resist (30 mJ/cm^2, 36 nm pitch): 3-sigma LER = ${resist.ler3SigmaNm.toFixed(3)} nm, ArF/EUV photon ratio = ${resist.arfToEuvPhotonRatio.toFixed(2)}x`,
);
