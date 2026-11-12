import {
  ASML_RES_HIGH_NA_NM,
  ASML_RES_LOW_NA_NM,
  EUV_LAMBDA_NM,
  K1_PHYSICAL_LIMIT,
  NA_HIGH,
  NA_LOW,
} from "./constants.js";

/**
 * Rayleigh criterion used by ASML: CD = k1 · λ / NA.
 * CD and λ share a unit. This is an imaging equation, not an N3P pitch.
 */
export function rayleighCd(k1, na, lambda = EUV_LAMBDA_NM) {
  if (!(na > 0) || !(lambda > 0)) {
    throw new Error("NA and wavelength must be positive");
  }
  if (!Number.isFinite(k1)) throw new Error("k1 must be finite");
  return (k1 * lambda) / na;
}

/** k1 implied by a published resolution: k1 = CD · NA / λ. */
export function impliedK1(cd, na, lambda = EUV_LAMBDA_NM) {
  if (!(lambda > 0)) throw new Error("wavelength must be positive");
  return (cd * na) / lambda;
}

/** Coherent pupil cutoff, cycles per unit length. λ and the unit match. */
export function coherentCutoff(na, lambda = EUV_LAMBDA_NM) {
  return na / lambda;
}

/**
 * Half-pitch form of k1. ASML's CD is the half-pitch at the resolution limit.
 * The coherent two-beam cutoff for equal lines and spaces is k1 = 0.5;
 * k1 = 0.25 is the physical limit and needs partial coherence / multipatterning.
 */
export function k1FromHalfPitch(halfPitch, na, lambda = EUV_LAMBDA_NM) {
  return (halfPitch * na) / lambda;
}

export function euvReference() {
  const lowLimit = rayleighCd(K1_PHYSICAL_LIMIT, NA_LOW);
  const highLimit = rayleighCd(K1_PHYSICAL_LIMIT, NA_HIGH);
  return {
    lambdaNm: EUV_LAMBDA_NM,
    lowNa: NA_LOW,
    highNa: NA_HIGH,
    k1Physical: K1_PHYSICAL_LIMIT,
    cdLimitLowNaNm: lowLimit,
    cdLimitHighNaNm: highLimit,
    asmlLowNaNm: ASML_RES_LOW_NA_NM,
    asmlHighNaNm: ASML_RES_HIGH_NA_NM,
    asmlImpliedK1Low: impliedK1(ASML_RES_LOW_NA_NM, NA_LOW),
    asmlImpliedK1High: impliedK1(ASML_RES_HIGH_NA_NM, NA_HIGH),
    note: "High-NA 0.55 is a contrast tool. It is not claimed for TSMC N3P.",
  };
}
