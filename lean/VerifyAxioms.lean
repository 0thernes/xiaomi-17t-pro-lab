module

public import XiaomiLabProofs
public import Solution

/-!
  XIAOMI 17T PRO LAB (v3.0.0) — Standalone Kernel Axiom Audit (`v4.35.0`, Palomar `module`)

  Audits all 44 exported theorems across all six proof modules plus all 9 isolated
  Palomar comparator targets (53 total audited declarations) via `#print axioms`.
  Every theorem must depend strictly on a subset of `[propext, Classical.choice, Quot.sound]`
  (or zero axioms) with zero `sorryAx`, zero `native_decide`, and zero custom axioms.
-/

-- Module 1: Hardware Floorplan, Bandwidth Algebra & Roofline Optimality (12 theorems)
#print axioms XiaomiLab.Hardware.kurnal_die_area_exact
#print axioms XiaomiLab.Hardware.kurnal_major_blocks_strict_packing
#print axioms XiaomiLab.Hardware.npu990_unit_count
#print axioms XiaomiLab.Hardware.lpddr5x_bw_strict_gap
#print axioms XiaomiLab.Hardware.cpu_cluster_clock_hierarchy
#print axioms XiaomiLab.Hardware.cmos_power_ratio_cancels_alpha_C_V
#print axioms XiaomiLab.Hardware.roofline_bounded_by_peak_and_memory
#print axioms XiaomiLab.Hardware.roofline_memory_bound_exact
#print axioms XiaomiLab.Hardware.roofline_compute_bound_exact
#print axioms XiaomiLab.Hardware.roofline_monotone_bw
#print axioms XiaomiLab.Hardware.roofline_monotone_ai
#print axioms XiaomiLab.Hardware.llm_decode_halving_bits_doubles_rate

-- Module 2: EUV Lithography, Rayleigh Monotonicity, Depth-of-Focus & Shot-Noise Ratios (7 theorems)
#print axioms XiaomiLab.Lithography.rayleigh_cd_strictly_decreasing_in_na
#print axioms XiaomiLab.Lithography.rayleigh_cd_strictly_increasing_in_lambda
#print axioms XiaomiLab.Lithography.euv_high_na_resolution_ratio_5_3
#print axioms XiaomiLab.Lithography.dof_high_na_penalty_25_9
#print axioms XiaomiLab.Lithography.dof_strictly_decreasing_in_na
#print axioms XiaomiLab.Lithography.euv_vs_arf_photon_deficit_gt_14
#print axioms XiaomiLab.Lithography.coherent_cutoff_monotone_na

-- Module 3: Quantum Transport, Dirac Dispersion, FinFET Scale Length & Crank-Nicolson Unitarity (9 theorems)
#print axioms XiaomiLab.QuantumTransport.int_sq_nonneg
#print axioms XiaomiLab.QuantumTransport.cint_normSq_mul
#print axioms XiaomiLab.QuantumTransport.cint_normSq_conj
#print axioms XiaomiLab.QuantumTransport.crank_nicolson_cayley_factor_norm_eq
#print axioms XiaomiLab.QuantumTransport.crank_nicolson_exact_unitarity
#print axioms XiaomiLab.QuantumTransport.dirac_subluminal_for_positive_mass
#print axioms XiaomiLab.QuantumTransport.pair_threshold_exceeds_euv_by_11000x
#print axioms XiaomiLab.QuantumTransport.finfet_permittivity_ratio_invariance
#print axioms XiaomiLab.QuantumTransport.finfet_thinner_body_reduces_lambda_sq

-- Module 4: 2D FDTD Silicon Thermal PDE CFL Stability & Discrete Maximum Principle (7 theorems)
#print axioms XiaomiLab.Thermal.fdtd_stencil_weights_sum_to_D
#print axioms XiaomiLab.Thermal.fdtd_uniform_field_fixed_point
#print axioms XiaomiLab.Thermal.fdtd_cfl_discrete_max_principle
#print axioms XiaomiLab.Thermal.fdtd_cfl_discrete_min_principle
#print axioms XiaomiLab.Thermal.iceloop_vc_strictly_cools_faster
#print axioms XiaomiLab.Thermal.code_cfl_cap_strictly_subcritical
#print axioms XiaomiLab.Thermal.sustained_clock_exact_20min

-- Module 5: Quantum Contextuality, Bell-CHSH, Mermin-3 GHZ, Peres-Mermin & Bloch Purity (9 theorems)
#print axioms XiaomiLab.Contextuality.chsh_classical_bound
#print axioms XiaomiLab.Contextuality.tsirelson_sq_strictly_exceeds_classical_sq
#print axioms XiaomiLab.Contextuality.mermin3_classical_bound
#print axioms XiaomiLab.Contextuality.mermin3_quantum_exceeds_classical
#print axioms XiaomiLab.Contextuality.pm_row_prod_eq_col_prod
#print axioms XiaomiLab.Contextuality.peres_mermin_no_6_of_6
#print axioms XiaomiLab.Contextuality.peres_mermin_classical_cap_le_5
#print axioms XiaomiLab.Contextuality.peres_mermin_5_of_6_achievable
#print axioms XiaomiLab.Contextuality.bloch_pure_state_sphere_identity
#print axioms XiaomiLab.Contextuality.qubit_purity_bounds

-- Module 6: Adversarial False-Variant Refutations (5 theorems)
#print axioms XiaomiLab.Adversarial.adv_fdtd_cfl_violation_undershoots
#print axioms XiaomiLab.Adversarial.adv_chsh_relaxed_domain_breaks_bound
#print axioms XiaomiLab.Adversarial.adv_massless_dirac_not_subluminal
#print axioms XiaomiLab.Adversarial.adv_peres_mermin_without_minus_sign_is_classical
#print axioms XiaomiLab.Adversarial.adv_roofline_max_violates_memory_wall

-- Isolated Palomar Comparator Targets (9 targets)
#print axioms XiaomiLab.ComparatorTarget.target_thm1_hardware_and_roofline
#print axioms XiaomiLab.ComparatorTarget.target_thm2_euv_rayleigh_and_dof
#print axioms XiaomiLab.ComparatorTarget.target_thm3_dirac_finfet_and_crank_nicolson
#print axioms XiaomiLab.ComparatorTarget.target_thm4_fdtd_cfl_maximum_principle
#print axioms XiaomiLab.ComparatorTarget.target_thm5_chsh_and_mermin3_classical_caps
#print axioms XiaomiLab.ComparatorTarget.target_thm6_peres_mermin_magic_square
#print axioms XiaomiLab.ComparatorTarget.target_thm7_bloch_purity_bounds
#print axioms XiaomiLab.ComparatorTarget.target_thm8_adversarial_refutations
#print axioms XiaomiLab.ComparatorTarget.target_nonvacuity_witnesses
