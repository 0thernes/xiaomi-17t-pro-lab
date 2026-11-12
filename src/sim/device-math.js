import {
  CLUSTER,
  GPU_FP16_OPS_PER_CORE_PER_CYCLE,
  GPU_FP32_OPS_PER_CORE_PER_CYCLE,
  GPU_SHADER_CORES,
  SI_LATTICE_M,
  SI_LATTICE_UNC_M,
} from "./constants.js";

/** PPI from a pixel grid and a diagonal in inches. */
export function computedPpi(widthPx, heightPx, diagonalIn) {
  if (!(diagonalIn > 0)) return null;
  return Math.hypot(widthPx, heightPx) / diagonalIn;
}

export function parseResolution(value) {
  if (Array.isArray(value) && value.length === 2) {
    return { width: Number(value[0]), height: Number(value[1]) };
  }
  if (typeof value === "string") {
    const m = value.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (m) return { width: Number(m[1]), height: Number(m[2]) };
  }
  return null;
}

/** Raw pixel rate at a refresh, in pixels per second. */
export function pixelRate(widthPx, heightPx, hz) {
  if (hz == null) return null;
  return widthPx * heightPx * hz;
}

/** Colors represented by `bits` bits per channel, three channels. */
export function colorsForBitsPerChannel(bits) {
  return 2 ** (bits * 3);
}

/**
 * At fixed α, C, and V, dynamic power scales with frequency.
 * P(f1) / P(f2) = f1 / f2. α, C, V cancel, so this ratio does not invent them.
 */
export function dynamicPowerRatio(freqA, freqB) {
  if (!(freqB > 0)) return null;
  return freqA / freqB;
}

/**
 * P = α C V² f. Missing symbols stay null. The UI must not fill them
 * with a 9500 measurement we do not have.
 */
export function cmosDynamicPower({ alpha, capacitance, voltage, freqHz }) {
  const missing = [];
  if (alpha == null) missing.push("α");
  if (capacitance == null) missing.push("C");
  if (voltage == null) missing.push("V");
  if (freqHz == null) missing.push("f");
  if (missing.length) return { power: null, missing };
  return { power: alpha * capacitance * voltage * voltage * freqHz, missing };
}

/** Official clock-cap ratio, Ultra versus Pro. */
export function ultraToProPowerRatio() {
  const ultra = CLUSTER.find((c) => c.name === "C1-Ultra");
  const pro = CLUSTER.find((c) => c.name === "C1-Pro");
  return dynamicPowerRatio(ultra.ghz, pro.ghz);
}

/**
 * FP32 op/s = cores × ops/core/cycle × f. f is unknown officially.
 * Pass freqHz = null to keep the result symbolic.
 */
export function gpuFp32Gflops(freqHz, cores = GPU_SHADER_CORES, ops = GPU_FP32_OPS_PER_CORE_PER_CYCLE) {
  if (freqHz == null) return null;
  return (cores * ops * freqHz) / 1e9;
}

export function gpuFp16Gflops(freqHz, cores = GPU_SHADER_CORES, ops = GPU_FP16_OPS_PER_CORE_PER_CYCLE) {
  if (freqHz == null) return null;
  return (cores * ops * freqHz) / 1e9;
}

/** Nearest-neighbor distance in the diamond cubic cell: a √3 / 4. */
export function siliconNearestNeighbor(aMeters = SI_LATTICE_M) {
  return (aMeters * Math.sqrt(3)) / 4;
}

export function siliconNearestNeighborUncertainty(uncA = SI_LATTICE_UNC_M) {
  return (uncA * Math.sqrt(3)) / 4;
}

/** Upper end of a cited range such as "1-120". Returns null if it is not a range. */
export function upperHz(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const m = value.match(/(\d+(?:\.\d+)?)\s*$/);
  return m ? Number(m[1]) : null;
}
