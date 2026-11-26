import { HBAR2_OVER_2M_EV_NM2 } from "./constants.js";
import { infiniteWellEnergies } from "./schrodinger.js";

export const ELECTRON_REST_MEV = 0.51099895;
export const PAIR_THRESHOLD_MEV = 2 * ELECTRON_REST_MEV; // 1.0219979 MeV
export const COMPTON_WAVELENGTH_PM = 2.42631023867; // h / (m_e c)
export const BOLTZMANN_EV_K = 8.617333262e-5;

/**
 * Exact WKB quantum tunneling transmission probability through a rectangular
 * gate-dielectric barrier of height `barrierEv` and thickness `thicknessNm`.
 * T(E) = exp(-2 * kappa * d), kappa = sqrt((V0 - E) / (hbar^2 / (2 m*))).
 */
export function wkbTunnelTransmission({ energyEv = 0.25, barrierEv = 3.1, thicknessNm = 1.0, effMassRatio = 0.5 }) {
  if (!Number.isFinite(energyEv) || !Number.isFinite(barrierEv)) {
    throw new RangeError("energyEv and barrierEv must be finite");
  }
  if (!Number.isFinite(thicknessNm) || thicknessNm < 0) {
    throw new RangeError("thicknessNm must be finite and non-negative");
  }
  if (!Number.isFinite(effMassRatio) || effMassRatio <= 0) {
    throw new RangeError("effMassRatio must be finite and positive");
  }
  if (energyEv >= barrierEv) return { transmission: 1, kappaPerNm: 0, decayLengthNm: Infinity };
  const hbar2Over2mStar = HBAR2_OVER_2M_EV_NM2 / effMassRatio;
  const kappa = Math.sqrt((barrierEv - energyEv) / hbar2Over2mStar);
  const transmission = Math.exp(-2 * kappa * thicknessNm);
  return {
    transmission,
    kappaPerNm: kappa,
    decayLengthNm: 1 / (2 * kappa),
  };
}

/**
 * Relativistic Dirac energy-momentum dispersion E = ±sqrt((p c)^2 + (m_e c^2)^2).
 * Contrasts QED electron-positron pair threshold (1.022 MeV) against EUV photons
 * (91.84 eV) and silicon electron-hole bandgap (1.12 eV).
 */
export function diracDispersion(pMeVc) {
  const mc2 = ELECTRON_REST_MEV;
  const E = Math.sqrt(pMeVc * pMeVc + mc2 * mc2);
  const beta = pMeVc / E; // v/c
  const gamma = E / mc2;
  return {
    pMeVc,
    electronMeV: E,
    positronDiracSeaMeV: -E,
    kineticMeV: E - mc2,
    beta,
    gamma,
  };
}

/**
 * Intrinsic silicon carrier density n_i(T) in cm^-3 using Varshni's bandgap law
 * Eg(T) = 1.1695 - 4.73e-4 * T^2 / (T + 636) and Sze's Nc(T), Nv(T) scaling.
 * Yields ~1.0e10 cm^-3 at 300 K and ~1.5e13 cm^-3 at 400 K.
 */
export function siliconIntrinsicCarriers(tempK = 300) {
  const T = Math.max(50, Math.min(800, tempK));
  const egEv = 1.1695 - (4.73e-4 * T * T) / (T + 636);
  const Nc = 2.86e19 * (T / 300) ** 1.58;
  const Nv = 3.1e19 * (T / 300) ** 1.85;
  const niCm3 = Math.sqrt(Nc * Nv) * Math.exp(-egEv / (2 * BOLTZMANN_EV_K * T));
  return {
    tempK: T,
    tempC: T - 273.15,
    egEv,
    Nc,
    Nv,
    niCm3,
  };
}

/**
 * Normalized eigenfunctions psi_n(x) for the 1D infinite well alongside FD eigenvalues.
 */
export function wellStates(lengthNm, nInterior = 48) {
  const energies = infiniteWellEnergies(lengthNm, nInterior);
  const grid = [];
  for (let i = 0; i <= 80; i++) {
    const u = i / 80;
    const xNm = u * lengthNm;
    const psi1 = Math.sqrt(2 / lengthNm) * Math.sin(Math.PI * u);
    const psi2 = Math.sqrt(2 / lengthNm) * Math.sin(2 * Math.PI * u);
    const psi3 = Math.sqrt(2 / lengthNm) * Math.sin(3 * Math.PI * u);
    grid.push({ xNm, psi1, psi2, psi3 });
  }
  return { energies, grid };
}
