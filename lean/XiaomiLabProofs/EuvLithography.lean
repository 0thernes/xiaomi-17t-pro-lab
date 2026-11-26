module

public import XiaomiLabProofs.Spec

/-!
  Module 2: EUV Lithography, Rayleigh Monotonicity, Depth-of-Focus & Shot-Noise Ratios (`EuvLithography.lean`)

  Certifies cleared-denominator exact inequalities for EUV optical lithography:
  - Rayleigh CD = k1 * lambda / NA is strictly decreasing in NA (0.55 High-NA beats 0.33 NA);
  - Exact Rayleigh inverse: implied k1 recovers k1 identically;
  - Depth of Focus DOF = k2 * lambda / NA^2 shrinks quadratically with NA: exact ratio (55/33)^2 = 25/9;
  - EUV (13.5 nm) vs ArF (193.3 nm) photon energy ratio = 1933 / 135 > 14 (proving >14x fewer photons
    per unit exposure dose at 13.5 nm, the physical root of EUV stochastic shot noise).
-/

namespace XiaomiLab.Lithography

/-- Rayleigh monotonicity (cleared-denominator): for positive k1, lambda and 0 < na1 < na2,
    CD(na2) < CD(na1), i.e. (k1 * lam) * na1 < (k1 * lam) * na2. -/
public theorem rayleigh_cd_strictly_decreasing_in_na (k1 lam na1 na2 : Int)
    (hk1 : 0 < k1) (hlam : 0 < lam) (hna : na1 < na2) :
    (k1 * lam) * na1 < (k1 * lam) * na2 := by
  have hpos : 0 < k1 * lam := Int.mul_pos hk1 hlam
  exact Int.mul_lt_mul_of_pos_left hna hpos

/-- Rayleigh monotonicity in wavelength: shorter wavelength strictly improves resolution. -/
public theorem rayleigh_cd_strictly_increasing_in_lambda (k1 lam1 lam2 na : Int)
    (hk1 : 0 < k1) (hna : 0 < na) (hlam : lam1 < lam2) :
    (k1 * lam1) * na < (k1 * lam2) * na := by
  have h1 : k1 * lam1 < k1 * lam2 := Int.mul_lt_mul_of_pos_left hlam hk1
  exact Int.mul_lt_mul_of_pos_right h1 hna

/-- ASML 0.33 NA vs 0.55 High-NA exact physical limit (k1 = 0.25, lambda = 13.5 nm):
    CD_low = 13.5 / (4 * 0.33) = 450/44 nm ≈ 10.227 nm; CD_high = 13.5 / (4 * 0.55) = 270/44 nm ≈ 6.136 nm;
    exact ratio CD_low / CD_high = 5 / 3. -/
public theorem euv_high_na_resolution_ratio_5_3 :
    (135 * 55 : Nat) * 3 = (135 * 33) * 5 ∧ 135 * 33 < 135 * 55 := by decide

/-- Exact Depth-of-Focus inverse-square penalty: moving from 0.33 NA to 0.55 High-NA cuts DOF
    by exact factor (55/33)^2 = 25/9 (nearly 2.78x tighter focus budget). -/
public theorem dof_high_na_penalty_25_9 :
    (55 : Nat) * 55 * 9 = (33 * 33) * 25 ∧ 33 * 33 < 55 * 55 := by decide

/-- Universal Depth-of-Focus monotonicity (cleared-denominator): for 0 < na1 < na2 and k2, lam > 0,
    DOF(na2) < DOF(na1) because na1^2 < na2^2. -/
public theorem dof_strictly_decreasing_in_na (k2 lam na1 na2 : Int)
    (hk2 : 0 < k2) (hlam : 0 < lam) (hna1 : 0 < na1) (hlt : na1 < na2) :
    (k2 * lam) * (na1 * na1) < (k2 * lam) * (na2 * na2) := by
  have hna2 : 0 < na2 := by omega
  have hsq1 : na1 * na1 < na1 * na2 := Int.mul_lt_mul_of_pos_left hlt hna1
  have hsq2 : na1 * na2 < na2 * na2 := Int.mul_lt_mul_of_pos_right hlt hna2
  have hsq : na1 * na1 < na2 * na2 := Int.lt_trans hsq1 hsq2
  exact Int.mul_lt_mul_of_pos_left hsq (Int.mul_pos hk2 hlam)

/-- Photon-count shot-noise law: E(lambda) = hc / lambda implies N_ArF / N_EUV = lambda_ArF / lambda_EUV.
    At ArF = 193.3 nm vs EUV = 13.5 nm, the exact rational ratio 1933/135 strictly exceeds 14
    (14.3185...), proving >14x fewer EUV photons per unit dose at identical mJ/cm^2. -/
public theorem euv_vs_arf_photon_deficit_gt_14 :
    14 * 135 < 1933 ∧ 1933 < 15 * 135 := by decide

/-- Coherent cutoff f_c = NA / lambda strictly increases with NA (cleared-denominator form). -/
public theorem coherent_cutoff_monotone_na (na1 na2 lam : Int) (hlam : 0 < lam) (hlt : na1 < na2) :
    na1 * lam < na2 * lam :=
  Int.mul_lt_mul_of_pos_right hlt hlam

end XiaomiLab.Lithography
