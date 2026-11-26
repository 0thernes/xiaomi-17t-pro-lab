# Lean 4.35.0 Formal Verification Core (`XiaomiLabProofs`)

Zero-Mathlib, Palomar `module`-compliant formal proof core certifying the exact algebraic, physical, numerical-stability, and quantum-contextuality invariants underlying `xiaomi-17t-pro-lab`.

## Modules
- `XiaomiLabProofs/Spec.lean`: Pure statement-only definitions (ZERO proofs, ZERO tactics, ZERO `sorry`).
- `XiaomiLabProofs/HardwareFloorplan.lean`: Dimensity 9500 Kurnal die area/packing, LPDDR5X bandwidth gap, CMOS clock-power ratio cancellation, universal Roofline optimality & monotonicity.
- `XiaomiLabProofs/EuvLithography.lean`: Rayleigh CD monotonicity, High-NA 5/3 resolution vs 25/9 DOF penalty, >14x EUV-vs-ArF photon deficit.
- `XiaomiLabProofs/QuantumTransport.lean`: Brahmagupta–Fibonacci Gaussian integer norm multiplicativity, exact Crank–Nicolson Cayley unitarity (`|psi_next|^2 = |psi_prev|^2`), Dirac subluminality for `m > 0`, FinFET permittivity invariance & scaling monotonicity.
- `XiaomiLabProofs/ThermalFdtd.lean`: 2D FDTD 5-point stencil weight conservation, CFL Discrete Minimum/Maximum Principle (`min5 <= T_next <= max5`), Xiaomi 3D IceLoop vapor chamber cooling monotonicity, 20-minute thermal clock exactness.
- `XiaomiLabProofs/QuantumContextuality.lean`: Universal Bell-CHSH classical LHV cap (`|S| <= 2` vs Tsirelson `S^2 = 8`), Mermin-3 GHZ cap (`|M| <= 2` vs `4`), Peres–Mermin 3×3 magic square impossibility (`pmSatisfiedCount <= 5` with 5/6 witness), single-qubit Bloch sphere pure-state identity & mixed purity bounds `[1/2, 1]`.
- `XiaomiLabProofs/AdversarialTests.lean`: 5 sharp false-variant counterexamples refuting relaxed hypotheses.
- `Challenge.lean` & `Solution.lean`: Isolated Palomar comparator pair matched via `lake comparator --config comparator.json --paranoid`.

## Local & Six-Kernel Verification
```bash
cd lean
lake build XiaomiLabProofs Challenge Solution
lake env lean VerifyAxioms.lean
lake env leanchecker --fresh XiaomiLabProofs
lake env leanchecker --fresh Solution
# On Linux with bubblewrap (automated in CI):
lake comparator --config comparator.json --paranoid
```
