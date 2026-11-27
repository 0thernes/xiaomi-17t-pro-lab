module

public import XiaomiLabProofs.Spec

/-!
  Module 6: Adversarial False-Variant Refutations (`AdversarialTests.lean`)

  Five explicit counterexample refutations proving that the hypotheses of Theorems 1–6
  are genuinely sharp and non-vacuous (Playbook v1.3 Anti-Vacuity Standard):
  1. Violating 2D FDTD CFL (`2*rx + 2*ry > D`) produces negative undershoot below `min5`;
  2. Relaxing CHSH dichotomic outcomes to `|a_i| <= 2` breaks the classical cap `2`;
  3. Dropping positive rest mass `m > 0` in Dirac dispersion permits `|p| = E` (photons);
  4. Flipping Peres-Mermin col-2 target from `-1` to `+1` makes 6/6 classically satisfiable;
  5. Replacing Roofline `min` with `max` violates the LPDDR5X memory wall.
-/

namespace XiaomiLab.Adversarial

open XiaomiLab.Spec

/-- Adv 1: Violating 2D FDTD CFL (D=10, rx=4, ry=4 => 2*rx+2*ry = 16 > 10) violates the
    discrete minimum principle: Tc=10, neighbors=0 gives -60 < 0 = D * min5. -/
public theorem adv_fdtd_cfl_violation_undershoots :
    fdtdStencilNum 10 4 4 10 0 0 0 0 < 10 * min5 10 0 0 0 0 := by decide

/-- Adv 2: Relaxing CHSH sign constraint from {-1, +1} to {-2, +2} breaks the bound |S| <= 2
    (achieves S = 8 > 2). -/
public theorem adv_chsh_relaxed_domain_breaks_bound :
    2 < chshExpr 2 2 2 0 := by decide

/-- Adv 3: Massless Dirac particles (m = 0) satisfy E^2 = p^2 + m^2 with |p| = E (not strictly < E). -/
public theorem adv_massless_dirac_not_subluminal :
    (5 : Int) * 5 = 5 * 5 + 0 * 0 ∧ ¬ ((5 : Int) < 5) := by decide

/-- Adv 4: Without the single negative parity constraint on column 2 (if all 6 targets were +1),
    a classical all-+1 assignment trivially satisfies all 6 rows and columns. -/
public theorem adv_peres_mermin_without_minus_sign_is_classical :
    let f : Fin 3 → Fin 3 → Int := fun _ _ => 1
    pmRowProd f 0 = 1 ∧ pmRowProd f 1 = 1 ∧ pmRowProd f 2 = 1 ∧
    pmColProd f 0 = 1 ∧ pmColProd f 1 = 1 ∧ pmColProd f 2 = 1 := by decide

/-- Adv 5: Using max instead of min in Roofline violates the memory wall at low arithmetic intensity
    (ai = 2, bw = 77 => memCap = 154, while peak = 5270). -/
public theorem adv_roofline_max_violates_memory_wall :
    rooflineAchievable 5270 2 77 = 154 ∧ 154 < max 5270 (2 * 77) := by decide

/-- Adv 6: A non-unimodular 2x2 transfer matrix (det = 2 != 1) breaks unimodular preservation under product. -/
public theorem adv_bragg_non_unimodular_breaks_det_one :
    (Mat2C.mul ⟨⟨2, 0⟩, CInt.zero, CInt.zero, CInt.one⟩ Mat2C.id).det ≠ CInt.one := by
  intro h
  have hre : ((Mat2C.mul ⟨⟨2, 0⟩, CInt.zero, CInt.zero, CInt.one⟩ Mat2C.id).det).re = CInt.one.re :=
    congrArg CInt.re h
  revert hre
  decide

/-- Adv 7: Dropping the factor of 2 in 2-point DFT Parseval breaks energy conservation on (1, 0). -/
public theorem adv_dft2_parseval_breaks_without_factor_2 :
    (dft2_0 CInt.one CInt.zero).normSq + (dft2_1 CInt.one CInt.zero).normSq ≠
    (CInt.one.normSq + CInt.zero.normSq) := by decide

/-- Adv 8: Dropping the range bound `b < m` in catalytic modular shear breaks restoration
    (borrowing byte value 256 modulo 256 collapses to 0 != 256, proving `m >= 257` is necessary). -/
public theorem adv_catalytic_shear_out_of_range_fails :
    catalyticShearSub (catalyticShearAdd 256 17 256) 17 256 ≠ 256 := by decide

/-- Adv 9: Overlapping linear-memory slices `[100, 132)` and `[120, 152)` violate disjointness
    at concrete witness `i = 20, j = 0` (`100 + 20 = 120 + 0`). -/
public theorem adv_arena_overlap_collides :
    ¬ arenaSliceDisjoint 100 32 120 32 := by
  intro h
  exact h 20 0 (by decide) (by decide) rfl

end XiaomiLab.Adversarial
