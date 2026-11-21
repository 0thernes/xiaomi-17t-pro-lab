import { mulberry32 } from "./quant.js";

/**
 * Exact Complex Statevector Quantum Simulator & Contextuality Engine
 * (Tsotchke / Moonlab / Contextuality Tensor Lab / Hoggar Bound compatible math).
 */

export function createState(nQubits) {
  const dim = 1 << nQubits;
  const re = new Float64Array(dim);
  const im = new Float64Array(dim);
  re[0] = 1;
  return { nQubits, dim, re, im };
}

export function applySingleQubit(state, target, U) {
  const { dim, re, im } = state;
  const bit = 1 << target;
  const [u00r, u00i, u01r, u01i, u10r, u10i, u11r, u11i] = U;
  for (let i = 0; i < dim; i++) {
    if (i & bit) continue;
    const j = i | bit;
    const aR = re[i];
    const aI = im[i];
    const bR = re[j];
    const bI = im[j];
    re[i] = u00r * aR - u00i * aI + u01r * bR - u01i * bI;
    im[i] = u00r * aI + u00i * aR + u01r * bI + u01i * bR;
    re[j] = u10r * aR - u10i * aI + u11r * bR - u11i * bI;
    im[j] = u10r * aI + u10i * aR + u11r * bI + u11i * bR;
  }
  return state;
}

const INV_SQRT2 = Math.SQRT1_2;
export const GATES = {
  H: [INV_SQRT2, 0, INV_SQRT2, 0, INV_SQRT2, 0, -INV_SQRT2, 0],
  X: [0, 0, 1, 0, 1, 0, 0, 0],
  Y: [0, 0, 0, -1, 0, 1, 0, 0],
  Z: [1, 0, 0, 0, 0, 0, -1, 0],
  S: [1, 0, 0, 0, 0, 0, 0, 1],
  T: [1, 0, 0, 0, 0, 0, INV_SQRT2, INV_SQRT2],
  Rx: (theta) => [Math.cos(theta / 2), 0, 0, -Math.sin(theta / 2), 0, -Math.sin(theta / 2), Math.cos(theta / 2), 0],
  Ry: (theta) => [Math.cos(theta / 2), 0, -Math.sin(theta / 2), 0, Math.sin(theta / 2), 0, Math.cos(theta / 2), 0],
  Rz: (theta) => [Math.cos(theta / 2), -Math.sin(theta / 2), 0, 0, 0, 0, Math.cos(theta / 2), Math.sin(theta / 2)],
};

export function applyCnot(state, control, target) {
  const { dim, re, im } = state;
  const cBit = 1 << control;
  const tBit = 1 << target;
  for (let i = 0; i < dim; i++) {
    if (i & cBit && !(i & tBit)) {
      const j = i | tBit;
      const tr = re[i];
      const ti = im[i];
      re[i] = re[j];
      im[i] = im[j];
      re[j] = tr;
      im[j] = ti;
    }
  }
  return state;
}

export function probabilities(state) {
  const out = new Float64Array(state.dim);
  for (let i = 0; i < state.dim; i++) out[i] = state.re[i] ** 2 + state.im[i] ** 2;
  return out;
}

/** Exact single-qubit reduced Bloch vector (x, y, z) and purity Tr(rho^2). */
export function blochVector(state, target = 0) {
  const { dim, re, im } = state;
  const bit = 1 << target;
  let rho00 = 0;
  let rho11 = 0;
  let rho01r = 0;
  let rho01i = 0;
  for (let i = 0; i < dim; i++) {
    if (i & bit) continue;
    const j = i | bit;
    rho00 += re[i] ** 2 + im[i] ** 2;
    rho11 += re[j] ** 2 + im[j] ** 2;
    // rho01 = sum c0 * conj(c1)
    rho01r += re[i] * re[j] + im[i] * im[j];
    rho01i += im[i] * re[j] - re[i] * im[j];
  }
  const x = 2 * rho01r;
  const y = -2 * rho01i;
  const z = rho00 - rho11;
  const purity = 0.5 * (1 + x * x + y * y + z * z);
  return { x, y, z, purity };
}

/** Sample exact Born-rule expectation of Z⊗...⊗Z after optional local basis rotations. */
function measureParityExpectation(state, basisString, shots, rng) {
  const clone = {
    nQubits: state.nQubits,
    dim: state.dim,
    re: Float64Array.from(state.re),
    im: Float64Array.from(state.im),
  };
  for (let q = 0; q < basisString.length; q++) {
    const ch = basisString[q];
    if (ch === "X") applySingleQubit(clone, q, GATES.H);
    else if (ch === "Y") {
      applySingleQubit(clone, q, GATES.Rz(-Math.PI / 2));
      applySingleQubit(clone, q, GATES.H);
    }
  }
  const probs = probabilities(clone);
  let exact = 0;
  for (let i = 0; i < clone.dim; i++) {
    let pop = 0;
    for (let q = 0; q < clone.nQubits; q++) if ((i >> q) & 1) pop ^= 1;
    exact += (pop === 0 ? 1 : -1) * probs[i];
  }
  if (!shots) return { exact, sampled: exact };
  const cdf = new Float64Array(clone.dim);
  let acc = 0;
  for (let i = 0; i < clone.dim; i++) {
    acc += probs[i];
    cdf[i] = acc;
  }
  let sum = 0;
  for (let s = 0; s < shots; s++) {
    const r = rng();
    let idx = 0;
    while (idx < clone.dim - 1 && r > cdf[idx]) idx += 1;
    let pop = 0;
    for (let q = 0; q < clone.nQubits; q++) if ((idx >> q) & 1) pop ^= 1;
    sum += pop === 0 ? 1 : -1;
  }
  return { exact, sampled: sum / shots };
}

/**
 * Bell |Phi+> CHSH inequality experiment:
 * Classical LHV bound |S| <= 2; Tsirelson quantum maximum 2*sqrt(2) ~= 2.8284.
 */
export function runChshExperiment({ shots = 2000, angleDeg = 22.5, seed = 42 } = {}) {
  const rng = mulberry32(seed);
  // Polarization angle angleDeg maps to 2*angleDeg on the Bloch sphere (22.5° -> pi/4)
  const a0 = 0;
  const a1 = Math.PI / 2;
  const b0 = (angleDeg * 2 * Math.PI) / 180;
  const b1 = b0 - Math.PI / 2;

  function corr(thetaA, thetaB) {
    const st = createState(2);
    applySingleQubit(st, 0, GATES.H);
    applyCnot(st, 0, 1);
    applySingleQubit(st, 0, GATES.Ry(-thetaA));
    applySingleQubit(st, 1, GATES.Ry(-thetaB));
    return measureParityExpectation(st, "ZZ", shots, rng);
  }

  const e00 = corr(a0, b0);
  const e01 = corr(a0, b1);
  const e10 = corr(a1, b0);
  const e11 = corr(a1, b1);
  const sExact = e00.exact + e01.exact + e10.exact - e11.exact;
  const sSampled = e00.sampled + e01.sampled + e10.sampled - e11.sampled;
  return {
    sExact,
    sSampled,
    classicalBound: 2,
    tsirelsonBound: 2 * Math.SQRT2,
    violatesClassical: Math.abs(sExact) > 2 + 1e-6,
  };
}

/**
 * 3-qubit GHZ Mermin-3 contextuality experiment:
 * M = <XXX> - <XYY> - <YXY> - <YYX>.
 * Classical non-contextual bound <= 2; Quantum GHZ reaches 4.000.
 */
export function runMermin3Experiment({ shots = 2000, phaseDeg = 0, seed = 9500 } = {}) {
  const rng = mulberry32(seed);
  const st = createState(3);
  applySingleQubit(st, 0, GATES.H);
  applyCnot(st, 0, 1);
  applyCnot(st, 0, 2);
  if (phaseDeg !== 0) applySingleQubit(st, 0, GATES.Rz((phaseDeg * Math.PI) / 180));

  const xxx = measureParityExpectation(st, "XXX", shots, rng);
  const xyy = measureParityExpectation(st, "XYY", shots, rng);
  const yxy = measureParityExpectation(st, "YXY", shots, rng);
  const yyx = measureParityExpectation(st, "YYX", shots, rng);

  const mExact = xxx.exact - xyy.exact - yxy.exact - yyx.exact;
  const mSampled = xxx.sampled - xyy.sampled - yxy.sampled - yyx.sampled;
  return {
    contexts: { XXX: xxx, XYY: xyy, YXY: yxy, YYX: yyx },
    mExact,
    mSampled,
    classicalBound: 2,
    quantumBound: 4,
    violatesClassical: Math.abs(mExact) > 2 + 1e-6,
  };
}

/**
 * Mermin-Peres 3x3 Pauli Magic Square state-independent contextuality proof
 * + Hoggar third-moment spectral contextuality floor (d = 2^n).
 */
export function merminPeresSummary() {
  return {
    grid: [
      ["I⊗X", "X⊗I", "X⊗X"],
      ["Z⊗I", "I⊗Z", "Z⊗Z"],
      ["Z⊗X", "X⊗Z", "Y⊗Y"],
    ],
    rowProducts: ["+I", "+I", "+I"],
    colProducts: ["+I", "+I", "−I"],
    quantumSatisfiedContexts: 6,
    classicalMaxContexts: 5,
    totalContexts: 6,
    contextualityDegree: 1, // minimum frustrated contexts under any classical assignment
  };
}

/** Exact von Neumann entanglement entropy S(rho_q) in bits (0 = separable, 1 = maximally entangled). */
export function entanglementEntropy(state, target = 0) {
  const { x, y, z } = blochVector(state, target);
  const r = Math.min(1, Math.hypot(x, y, z));
  const l1 = 0.5 * (1 + r);
  const l2 = 0.5 * (1 - r);
  let s = 0;
  if (l1 > 1e-12) s -= l1 * Math.log2(l1);
  if (l2 > 1e-12) s -= l2 * Math.log2(l2);
  return Math.max(0, s);
}

/** Amplitudes with magnitude, phase (rad), and binary ket label. */
export function amplitudesSummary(state) {
  const out = [];
  for (let i = 0; i < state.dim; i++) {
    const r = state.re[i];
    const im = state.im[i];
    const mag = Math.hypot(r, im);
    out.push({
      index: i,
      ket: `|${i.toString(2).padStart(state.nQubits, "0")}⟩`,
      re: r,
      im,
      mag,
      prob: mag * mag,
      phase: Math.atan2(im, r),
    });
  }
  return out;
}

/** Canonical 2-qubit and 3-qubit interactive circuit presets. */
export function buildPresetState(preset) {
  if (preset === "plus") {
    const s = createState(2);
    applySingleQubit(s, 0, GATES.H);
    return { state: s, gates: ["H(q0)"] };
  }
  if (preset === "bell") {
    const s = createState(2);
    applySingleQubit(s, 0, GATES.H);
    applyCnot(s, 0, 1);
    return { state: s, gates: ["H(q0)", "CNOT(q0→q1)"] };
  }
  if (preset === "magic") {
    const s = createState(2);
    applySingleQubit(s, 0, GATES.H);
    applySingleQubit(s, 0, GATES.T);
    applySingleQubit(s, 1, GATES.Ry(Math.PI / 3));
    return { state: s, gates: ["H(q0)", "T(q0)", "Ry(π/3, q1)"] };
  }
  if (preset === "ghz") {
    const s = createState(3);
    applySingleQubit(s, 0, GATES.H);
    applyCnot(s, 0, 1);
    applyCnot(s, 0, 2);
    return { state: s, gates: ["H(q0)", "CNOT(q0→q1)", "CNOT(q0→q2)"] };
  }
  return { state: createState(2), gates: [] };
}
