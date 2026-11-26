module

public import XiaomiLabProofs.Spec
public import XiaomiLabProofs

/-!
  XIAOMI 17T PRO LAB (v3.0.0) — Sorry-Free Solution Module Matched Against `Challenge.lean`.

  Proves all 9 targets in `XiaomiLab.ComparatorTarget` with ZERO `sorry`, ZERO `native_decide`,
  ZERO custom axioms, and ZERO Mathlib dependencies, verified across 6 independent Lean kernels via:
      lake comparator --config comparator.json --paranoid
-/

namespace XiaomiLab.ComparatorTarget

open XiaomiLab.Spec

public theorem target_thm1_hardware_and_roofline :
    ((1088 : Nat) * 1292 = 1405696) ∧
    (2875 + 2423 + 1260 + 892 = 7450 ∧ 7450 * 100 < 1088 * 1292) ∧
    (9600 * 64 / 8 = 76800 ∧ 10667 * 64 / 8 = 85336 ∧ 76800 < 85336) ∧
    (∀ K f1 f2 : Int, (K * f1) * f2 = (K * f2) * f1) ∧
    (∀ peak ai bw : Int, rooflineAchievable peak ai bw ≤ peak ∧ rooflineAchievable peak ai bw ≤ ai * bw) ∧
    (∀ peak ai bw1 bw2 : Int, 0 ≤ ai → bw1 ≤ bw2 →
      rooflineAchievable peak ai bw1 ≤ rooflineAchievable peak ai bw2) :=
  ⟨XiaomiLab.Hardware.kurnal_die_area_exact,
   XiaomiLab.Hardware.kurnal_major_blocks_strict_packing,
   XiaomiLab.Hardware.lpddr5x_bw_strict_gap,
   XiaomiLab.Hardware.cmos_power_ratio_cancels_alpha_C_V,
   XiaomiLab.Hardware.roofline_bounded_by_peak_and_memory,
   XiaomiLab.Hardware.roofline_monotone_bw⟩

public theorem target_thm2_euv_rayleigh_and_dof :
    (∀ k1 lam na1 na2 : Int, 0 < k1 → 0 < lam → na1 < na2 → (k1 * lam) * na1 < (k1 * lam) * na2) ∧
    (∀ k2 lam na1 na2 : Int, 0 < k2 → 0 < lam → 0 < na1 → na1 < na2 →
      (k2 * lam) * (na1 * na1) < (k2 * lam) * (na2 * na2)) ∧
    ((55 : Nat) * 55 * 9 = (33 * 33) * 25 ∧ 14 * 135 < 1933) :=
  ⟨XiaomiLab.Lithography.rayleigh_cd_strictly_decreasing_in_na,
   XiaomiLab.Lithography.dof_strictly_decreasing_in_na,
   ⟨XiaomiLab.Lithography.dof_high_na_penalty_25_9.1,
    XiaomiLab.Lithography.euv_vs_arf_photon_deficit_gt_14.1⟩⟩

public theorem target_thm3_dirac_finfet_and_crank_nicolson :
    (∀ h : Int, ∀ psiPrev psiNext : CInt,
      CInt.mul ⟨1, h⟩ psiNext = CInt.mul ⟨1, -h⟩ psiPrev → psiNext.normSq = psiPrev.normSq) ∧
    (∀ E p m : Int, 0 ≤ E → 0 < m → E * E = p * p + m * m → -E < p ∧ p < E) ∧
    (∀ k epsSi epsOx tSi tOx : Int,
      ((k * epsSi) * tSi * tOx) * (2 * epsOx) = (epsSi * tSi * tOx) * (2 * (k * epsOx))) := by
  refine ⟨XiaomiLab.QuantumTransport.crank_nicolson_exact_unitarity, ?_,
          XiaomiLab.QuantumTransport.finfet_permittivity_ratio_invariance⟩
  intro E p m hE hm hdisp
  have h := XiaomiLab.QuantumTransport.dirac_subluminal_for_positive_mass E p m hE hm hdisp
  exact ⟨h.2.2.1, h.2.2.2⟩

public theorem target_thm4_fdtd_cfl_maximum_principle :
    (∀ D rx ry Tc Tl Tr Tu Td : Int, 0 ≤ rx → 0 ≤ ry → 2 * rx + 2 * ry ≤ D →
      D * min5 Tc Tl Tr Tu Td ≤ fdtdStencilNum D rx ry Tc Tl Tr Tu Td ∧
      fdtdStencilNum D rx ry Tc Tl Tr Tu Td ≤ D * max5 Tc Tl Tr Tu Td) ∧
    (∀ T Tamb dt hNoVc hVc : Int, Tamb < T → 0 < dt → hNoVc < hVc →
      T - dt * hVc * (T - Tamb) < T - dt * hNoVc * (T - Tamb)) := by
  refine ⟨?_, XiaomiLab.Thermal.iceloop_vc_strictly_cools_faster⟩
  intro D rx ry Tc Tl Tr Tu Td hrx hry hcfl
  exact ⟨XiaomiLab.Thermal.fdtd_cfl_discrete_min_principle D rx ry Tc Tl Tr Tu Td hrx hry hcfl,
         XiaomiLab.Thermal.fdtd_cfl_discrete_max_principle D rx ry Tc Tl Tr Tu Td hrx hry hcfl⟩

public theorem target_thm5_chsh_and_mermin3_classical_caps :
    (∀ a0 a1 b0 b1 : Int, IsSign a0 → IsSign a1 → IsSign b0 → IsSign b1 →
      -2 ≤ chshExpr a0 a1 b0 b1 ∧ chshExpr a0 a1 b0 b1 ≤ 2) ∧
    (∀ x1 x2 x3 y1 y2 y3 : Int,
      IsSign x1 → IsSign x2 → IsSign x3 → IsSign y1 → IsSign y2 → IsSign y3 →
      -2 ≤ mermin3Expr x1 x2 x3 y1 y2 y3 ∧ mermin3Expr x1 x2 x3 y1 y2 y3 ≤ 2) ∧
    ((2 : Nat) * 2 < 8 ∧ (2 : Nat) < 4) := by
  refine ⟨?_, XiaomiLab.Contextuality.mermin3_classical_bound,
          ⟨XiaomiLab.Contextuality.tsirelson_sq_strictly_exceeds_classical_sq,
           XiaomiLab.Contextuality.mermin3_quantum_exceeds_classical⟩⟩
  intro a0 a1 b0 b1 ha0 ha1 hb0 hb1
  have h := XiaomiLab.Contextuality.chsh_classical_bound a0 a1 b0 b1 ha0 ha1 hb0 hb1
  exact ⟨h.1, h.2.1⟩

public theorem target_thm6_peres_mermin_magic_square :
    (∀ f : Fin 3 → Fin 3 → Int, pmSatisfiedCount f ≤ 5) ∧
    (pmSatisfiedCount (fun _ _ => 1) = 5) :=
  ⟨XiaomiLab.Contextuality.peres_mermin_classical_cap_le_5,
   XiaomiLab.Contextuality.peres_mermin_5_of_6_achievable⟩

public theorem target_thm7_bloch_purity_bounds :
    (∀ a b : CInt,
      blochX a b * blochX a b + blochY a b * blochY a b + blochZ a b * blochZ a b =
      (a.normSq + b.normSq) * (a.normSq + b.normSq)) ∧
    (∀ p q : Int, 0 ≤ p → 0 ≤ q →
      (p + q) * (p + q) ≤ 2 * (p * p + q * q) ∧
      2 * (p * p + q * q) ≤ 2 * ((p + q) * (p + q))) :=
  ⟨XiaomiLab.Contextuality.bloch_pure_state_sphere_identity,
   XiaomiLab.Contextuality.qubit_purity_bounds⟩

public theorem target_thm8_adversarial_refutations :
    (fdtdStencilNum 10 4 4 10 0 0 0 0 < 10 * min5 10 0 0 0 0) ∧
    (2 < chshExpr 2 2 2 0) ∧
    ((5 : Int) * 5 = 5 * 5 + 0 * 0 ∧ ¬ ((5 : Int) < 5)) ∧
    (rooflineAchievable 5270 2 77 = 154 ∧ 154 < max 5270 (2 * 77)) :=
  ⟨XiaomiLab.Adversarial.adv_fdtd_cfl_violation_undershoots,
   XiaomiLab.Adversarial.adv_chsh_relaxed_domain_breaks_bound,
   XiaomiLab.Adversarial.adv_massless_dirac_not_subluminal,
   XiaomiLab.Adversarial.adv_roofline_max_violates_memory_wall⟩

public theorem target_nonvacuity_witnesses :
    fdtdStencilNum 100 15 15 80 40 40 40 40 = 5600 ∧
    chshExpr 1 1 1 (-1) = 2 ∧
    mermin3Expr 1 1 1 1 1 (-1) = 2 ∧
    (CInt.mul ⟨1, 3⟩ ⟨4, -2⟩).normSq = 200 ∧
    blochX ⟨1, 0⟩ ⟨0, 1⟩ = 0 ∧
    blochY ⟨1, 0⟩ ⟨0, 1⟩ = 2 := by
  decide

end XiaomiLab.ComparatorTarget
