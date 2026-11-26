/**
 * Exports canonical JS solver evaluations as JSON for differential cross-checking
 * by the independent 60-digit Python oracle (reference/physics_oracle.py).
 */
import {
  EUV_LAMBDA_NM,
  HBAR2_OVER_2M_EV_NM2,
  HBAR_EV_FS,
  HC_EV_NM,
  K1_PHYSICAL_LIMIT,
  NA_HIGH,
  NA_LOW,
} from "../src/sim/constants.js";
import { computedPpi, siliconNearestNeighbor, ultraToProPowerRatio } from "../src/sim/device-math.js";
import { diracDispersion, siliconIntrinsicCarriers, wkbTunnelTransmission } from "../src/sim/dirac-tunnel.js";
import { doubleGateScaleLength } from "../src/sim/finfet.js";
import { braggReflectivityAt, braggSpectrum, depthOfFocusNm, euvPhotonEnergyEv } from "../src/sim/litho-advanced.js";
import { MEMORY_PROFILES, rooflinePoint } from "../src/sim/memory-model.js";
import { ternarizeAbsMean } from "../src/sim/quant.js";
import {
  buildPresetState,
  entanglementEntropy,
  runChshExperiment,
  runMermin3Experiment,
} from "../src/sim/quantum-lab.js";
import { rayleighCd } from "../src/sim/rayleigh.js";
import { infiniteWellAnalyticEv } from "../src/sim/schrodinger.js";

const bragg = braggSpectrum({ pairs: 40 });
const braggSweep = {};
for (const lam of ["13.0", "13.3", "13.5", "13.7", "14.0"]) {
  braggSweep[lam] = braggReflectivityAt(Number(lam), { pairs: 40 });
}

const wkbCases = [
  { energyEv: 0.25, barrierEv: 3.1, thicknessNm: 0.6, effMassRatio: 0.5 },
  { energyEv: 0.25, barrierEv: 3.1, thicknessNm: 1.0, effMassRatio: 0.5 },
  { energyEv: 0.5, barrierEv: 2.5, thicknessNm: 1.4, effMassRatio: 0.26 },
  { energyEv: 1.2, barrierEv: 3.8, thicknessNm: 0.85, effMassRatio: 0.4 },
].map((c) => ({ ...c, transmission: wkbTunnelTransmission(c).transmission }));

const diracCases = [0, 0.25, 0.51099895, 1.0, 2.5, 10.0].map((pMeVc) => ({
  pMeVc,
  ...diracDispersion(pMeVc),
}));

const siliconCases = [250, 300, 350, 400, 450].map((tempK) => ({
  tempK,
  niCm3: siliconIntrinsicCarriers(tempK).niCm3,
}));

const finfetCases = [
  { epsSi: 11.7, tSi: 6, epsOx: 3.9, tOx: 1.2 },
  { epsSi: 11.7, tSi: 5, epsOx: 22.0, tOx: 1.8 },
  { epsSi: 11.7, tSi: 8, epsOx: 3.9, tOx: 0.9 },
].map((c) => ({ ...c, lambda: doubleGateScaleLength(c.epsSi, c.tSi, c.epsOx, c.tOx) }));

const bell = buildPresetState("bell").state;
const payload = {
  constants: {
    hbar2Over2mEvNm2: HBAR2_OVER_2M_EV_NM2,
    hbarEvFs: HBAR_EV_FS,
    hcEvNm: HC_EV_NM,
    siNearestNeighborM: siliconNearestNeighbor(),
  },
  litho: {
    cdLowNa: rayleighCd(K1_PHYSICAL_LIMIT, NA_LOW, EUV_LAMBDA_NM),
    cdHighNa: rayleighCd(K1_PHYSICAL_LIMIT, NA_HIGH, EUV_LAMBDA_NM),
    euvPhotonEv: euvPhotonEnergyEv(EUV_LAMBDA_NM),
    arfToEuvRatio: euvPhotonEnergyEv(EUV_LAMBDA_NM) / euvPhotonEnergyEv(193.3),
    dofLowNa: depthOfFocusNm(NA_LOW, 0.5, EUV_LAMBDA_NM),
    dofHighNa: depthOfFocusNm(NA_HIGH, 0.5, EUV_LAMBDA_NM),
    braggR135: bragg.rAt135,
    braggElevenT: bragg.elevenMirrorTransmission,
    braggSweep,
  },
  quantum: {
    wkbCases,
    diracCases,
    siliconCases,
    finfetCases,
    wellAnalytic: [1, 2, 3, 4].map((n) => infiniteWellAnalyticEv(3.0, n)),
  },
  memory: {
    bw9600: MEMORY_PROFILES.xiaomi17tPro.bwGBps,
    bw10667: MEMORY_PROFILES.d9500Max.bwGBps,
    ridgeAi: rooflinePoint({ ai: 10, peakGflops: 3840, bwGBps: MEMORY_PROFILES.xiaomi17tPro.bwGBps }).ridgeAi,
  },
  device: {
    ultraToProRatio: ultraToProPowerRatio(),
    ppi17tPro: computedPpi(1280, 2772, 6.83),
  },
  contextuality: {
    chshExact: runChshExperiment({ shots: 0, angleDeg: 22.5 }).sExact,
    mermin3Exact: runMermin3Experiment({ shots: 0, phaseDeg: 0 }).mExact,
    bellEntropy: entanglementEntropy(bell, 0),
  },
  quant: {
    ternaryBits: ternarizeAbsMean(new Float64Array([1, -1, 0.2])).bitsPerWeight,
  },
};

process.stdout.write(JSON.stringify(payload));
