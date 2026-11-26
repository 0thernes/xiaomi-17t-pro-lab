module

/-!
  XIAOMI 17T PRO LAB (v3.0.0) — Pure Statement-Only Definitions (`Spec.lean`).

  Palomar Registry compliant Lean 4.35.0 `module`.
  Contains ONLY mathematical definitions (ZERO theorems, ZERO tactics, ZERO `sorry`).
  Imported by `Challenge.lean` so every theorem signature audited by
  `lake comparator --config comparator.json --paranoid` can be verified for
  statement fidelity independently of all proof modules.
-/

namespace XiaomiLab.Spec

/-- Exact Gaussian integer (Z[i]) for exact algebraic Crank-Nicolson Cayley unitarity
    and single-qubit statevector Bloch identities without floating-point rounding. -/
public structure CInt where
  re : Int
  im : Int
deriving DecidableEq, Repr

@[expose] public def CInt.add (a b : CInt) : CInt := ⟨a.re + b.re, a.im + b.im⟩
@[expose] public def CInt.sub (a b : CInt) : CInt := ⟨a.re - b.re, a.im - b.im⟩
@[expose] public def CInt.mul (a b : CInt) : CInt :=
  ⟨a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re⟩
@[expose] public def CInt.conj (a : CInt) : CInt := ⟨a.re, -a.im⟩
@[expose] public def CInt.normSq (a : CInt) : Int := a.re * a.re + a.im * a.im

/-- Exact Roofline achievable throughput (integer-scaled GFLOP/s). -/
@[expose] public def rooflineAchievable (peakGflops ai bw : Int) : Int :=
  if ai * bw ≤ peakGflops then ai * bw else peakGflops

/-- Exact 5-point 2D FDTD explicit heat-diffusion stencil numerator with common denominator D:
    D * T_next = (D - 2*rx - 2*ry)*Tc + rx*(Tl + Tr) + ry*(Tu + Td). -/
@[expose] public def fdtdStencilNum (D rx ry Tc Tl Tr Tu Td : Int) : Int :=
  (D - 2 * rx - 2 * ry) * Tc + rx * (Tl + Tr) + ry * (Tu + Td)

/-- Minimum of 5 integers. -/
@[expose] public def min5 (a b c d e : Int) : Int :=
  min a (min b (min c (min d e)))

/-- Maximum of 5 integers. -/
@[expose] public def max5 (a b c d e : Int) : Int :=
  max a (max b (max c (max d e)))

/-- Sign predicate for dichotomic local hidden-variable outcomes in {-1, +1}. -/
@[expose] public def IsSign (x : Int) : Prop := x = 1 ∨ x = -1

/-- CHSH Bell expression S = a0*b0 + a0*b1 + a1*b0 - a1*b1. -/
@[expose] public def chshExpr (a0 a1 b0 b1 : Int) : Int :=
  a0 * b0 + a0 * b1 + a1 * b0 - a1 * b1

/-- Mermin-3 GHZ polynomial M = x1*x2*x3 - x1*y2*y3 - y1*x2*y3 - y1*y2*x3. -/
@[expose] public def mermin3Expr (x1 x2 x3 y1 y2 y3 : Int) : Int :=
  x1 * x2 * x3 - x1 * y2 * y3 - y1 * x2 * y3 - y1 * y2 * x3

/-- Row product of a 3x3 assignment matrix f. -/
@[expose] public def pmRowProd (f : Fin 3 → Fin 3 → Int) (r : Fin 3) : Int :=
  f r 0 * f r 1 * f r 2

/-- Column product of a 3x3 assignment matrix f. -/
@[expose] public def pmColProd (f : Fin 3 → Fin 3 → Int) (c : Fin 3) : Int :=
  f 0 c * f 1 c * f 2 c

/-- Exact number of Peres-Mermin parity contexts satisfied by a 3x3 assignment f
    (targets: rows 0,1,2 -> +1; cols 0,1 -> +1; col 2 -> -1). -/
@[expose] public def pmSatisfiedCount (f : Fin 3 → Fin 3 → Int) : Nat :=
  (if pmRowProd f 0 = 1 then 1 else 0) +
  (if pmRowProd f 1 = 1 then 1 else 0) +
  (if pmRowProd f 2 = 1 then 1 else 0) +
  (if pmColProd f 0 = 1 then 1 else 0) +
  (if pmColProd f 1 = 1 then 1 else 0) +
  (if pmColProd f 2 = -1 then 1 else 0)

/-- Exact integer-scaled Bloch vector components (X, Y, Z) of a pure 1-qubit state |psi> = (a, b). -/
@[expose] public def blochX (a b : CInt) : Int := 2 * (a.re * b.re + a.im * b.im)
@[expose] public def blochY (a b : CInt) : Int := 2 * (a.re * b.im - a.im * b.re)
@[expose] public def blochZ (a b : CInt) : Int := a.normSq - b.normSq

end XiaomiLab.Spec
