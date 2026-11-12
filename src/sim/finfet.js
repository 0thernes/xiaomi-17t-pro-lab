/**
 * Double-gate natural length (electrostatic scale length).
 *
 *   λ = sqrt( ε_si · t_si · t_ox / (2 · ε_ox) )
 *
 * A tri-gate FinFET is drawn in the lab as a sketch. N3P fin height, fin
 * count, and the real high-k stack are UNKNOWN, so t_si and t_ox here are
 * illustrative sliders, not a 9500 TEM. ε can be relative (they cancel as a
 * ratio) as long as both use the same convention.
 */
export function doubleGateScaleLength(epsSi, tSi, epsOx, tOx) {
  if (!(epsOx > 0) || !(epsSi > 0)) {
    throw new Error("permittivities must be positive");
  }
  if (tSi < 0 || tOx < 0) throw new Error("thicknesses must be non-negative");
  return Math.sqrt((epsSi * tSi * tOx) / (2 * epsOx));
}

/**
 * Textbook rule of thumb: a gate several scale-lengths long keeps
 * short-channel effects in check. The factor is a model choice, stated
 * in the UI, not a TSMC design rule.
 */
export function shortChannelRatio(gateLength, scaleLength) {
  if (!(scaleLength > 0)) return null;
  return gateLength / scaleLength;
}

/**
 * Illustrative subthreshold potential decay along the channel,
 * ψ(x) / ψ(0) = exp(−x / λ). Generic, not a measured 9500 swing.
 */
export function potentialDecay(x, scaleLength) {
  if (!(scaleLength > 0)) return null;
  return Math.exp(-x / scaleLength);
}
