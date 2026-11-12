import { HBAR2_OVER_2M_EV_NM2 } from "./constants.js";

/**
 * Dirac-comb Kronig–Penney right-hand side.
 * cos(ka) = cos(αa) + P · sin(αa) / (αa)
 * α = sqrt(2mE) / ħ, P is the dimensionless barrier strength.
 * Energies in eV, lattice spacing a in nm.
 * |RHS| ≤ 1 is an allowed Bloch energy. P = 0 is a free electron.
 */
export function kronigPenneyRhs(energyEv, aNm, P) {
  if (!(aNm > 0)) throw new Error("lattice spacing must be positive");
  if (energyEv < 0) return NaN;
  if (energyEv === 0) return 1 + P;
  const alpha = Math.sqrt(energyEv / HBAR2_OVER_2M_EV_NM2);
  const x = alpha * aNm;
  return Math.cos(x) + (P * Math.sin(x)) / x;
}

export function kronigPenneyAllowed(energyEv, aNm, P) {
  const rhs = kronigPenneyRhs(energyEv, aNm, P);
  return Math.abs(rhs) <= 1 + 1e-9;
}

/** Energy at which α a = x, in eV. */
export function energyAtAlphaA(x, aNm) {
  const alpha = x / aNm;
  return alpha * alpha * HBAR2_OVER_2M_EV_NM2;
}

/**
 * Sample the model. Returns bands as runs of allowed samples.
 * This is a numerical scan, not a closed-form band edge.
 */
export function scanBands({ aNm, P, eMaxEv, samples }) {
  const points = [];
  for (let i = 0; i < samples; i++) {
    const energyEv = (eMaxEv * i) / (samples - 1);
    const rhs = kronigPenneyRhs(energyEv, aNm, P);
    points.push({
      energyEv,
      rhs,
      allowed: Number.isFinite(rhs) && Math.abs(rhs) <= 1 + 1e-9,
    });
  }
  return points;
}
