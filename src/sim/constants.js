/**
 * Physical constants used by the live solvers.
 * Central values are CODATA 2018 / NIST. They are textbook inputs, not
 * Dimensity 9500 process-kit parameters.
 *
 * Sources:
 * - CODATA 2018 via NIST (ħ, m_e, e)
 * - NIST X-ray 2018 lattice constant, cited in docs/research/deep-dive.md
 * - ASML public EUV wavelength and NA figures
 */

export const HBAR_J_S = 1.054571817e-34;
export const ELECTRON_MASS_KG = 9.1093837015e-31;
export const ELEMENTARY_CHARGE_C = 1.602176634e-19;

/** ħ² / (2 m_e) in joule·metre². */
export const HBAR2_OVER_2M_J_M2 = (HBAR_J_S * HBAR_J_S) / (2 * ELECTRON_MASS_KG);

/** ħ² / (2 m_e) in eV·nm². Solver units. */
export const HBAR2_OVER_2M_EV_NM2 = HBAR2_OVER_2M_J_M2 / ELEMENTARY_CHARGE_C / 1e-18;

/**
 * Silicon lattice parameter, vacuum, 22.5 °C.
 * Central value 5.431020511×10⁻¹⁰ m; the parenthetical (89) is the
 * uncertainty on the last two digits.
 */
export const SI_LATTICE_M = 5.431020511e-10;
export const SI_LATTICE_UNC_M = 0.000000089e-10;

/** Textbook Si indirect gap at 300 K (Sze). Not a 9500 measurement. */
export const SI_BANDGAP_EV_TEXTBOOK = 1.12;

export const EUV_LAMBDA_NM = 13.5;
export const NA_LOW = 0.33;
export const NA_HIGH = 0.55;
export const K1_PHYSICAL_LIMIT = 0.25;
/** ASML published resolution figures, not an N3P ground rule. */
export const ASML_RES_LOW_NA_NM = 13;
export const ASML_RES_HIGH_NA_NM = 8;

/** Relative permittivity, textbook, for the illustrative FinFET model. */
export const EPS_SI_R = 11.7;
export const EPS_SIO2_R = 3.9;

/**
 * Official C1 cluster caps. Tokens are checked against
 * specs.soc.cpu_cluster in tests so these cannot drift silently.
 */
export const CLUSTER = Object.freeze([
  Object.freeze({
    name: "C1-Ultra",
    count: 1,
    ghz: 4.21,
    l2Bytes: 2 * 1024 * 1024,
  }),
  Object.freeze({
    name: "C1-Premium",
    count: 3,
    ghz: 3.5,
    l2Bytes: 1 * 1024 * 1024,
  }),
  Object.freeze({
    name: "C1-Pro",
    count: 4,
    ghz: 2.7,
    l2Bytes: 512 * 1024,
  }),
]);

export const L3_BYTES = 16 * 1024 * 1024;
export const SLC_BYTES = 10 * 1024 * 1024;

/** Arm Mali-G1 Ultra MC12, FMA counted as 2 ops. Clock stays unknown. */
export const GPU_SHADER_CORES = 12;
export const GPU_FP32_OPS_PER_CORE_PER_CYCLE = 256;
export const GPU_FP16_OPS_PER_CORE_PER_CYCLE = 512;
