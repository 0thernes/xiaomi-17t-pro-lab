module

/-!
  XIAOMI 17T PRO LAB (v4.0.0) — Pure Statement-Only Definitions (`Spec.lean`).

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
@[expose] public def CInt.neg (a : CInt) : CInt := ⟨-a.re, -a.im⟩
@[expose] public def CInt.zero : CInt := ⟨0, 0⟩
@[expose] public def CInt.one : CInt := ⟨1, 0⟩
@[expose] public def CInt.mul (a b : CInt) : CInt :=
  ⟨a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re⟩
@[expose] public def CInt.conj (a : CInt) : CInt := ⟨a.re, -a.im⟩
@[expose] public def CInt.mulI (a : CInt) : CInt := ⟨-a.im, a.re⟩
@[expose] public def CInt.mulNegI (a : CInt) : CInt := ⟨a.im, -a.re⟩
@[expose] public def CInt.normSq (a : CInt) : Int := a.re * a.re + a.im * a.im

/-- 2x2 complex characteristic transfer matrix over Z[i] (backing the 40-bilayer Mo/Si EUV Bragg mirror). -/
public structure Mat2C where
  a11 : CInt
  a12 : CInt
  a21 : CInt
  a22 : CInt
deriving DecidableEq, Repr

@[expose] public def Mat2C.id : Mat2C := ⟨CInt.one, CInt.zero, CInt.zero, CInt.one⟩

@[expose] public def Mat2C.mul (A B : Mat2C) : Mat2C :=
  ⟨CInt.add (CInt.mul A.a11 B.a11) (CInt.mul A.a12 B.a21),
   CInt.add (CInt.mul A.a11 B.a12) (CInt.mul A.a12 B.a22),
   CInt.add (CInt.mul A.a21 B.a11) (CInt.mul A.a22 B.a21),
   CInt.add (CInt.mul A.a21 B.a12) (CInt.mul A.a22 B.a22)⟩

@[expose] public def Mat2C.det (A : Mat2C) : CInt :=
  CInt.sub (CInt.mul A.a11 A.a22) (CInt.mul A.a12 A.a21)

/-- Exact 2-point unnormalized DFT over Z[i]. -/
@[expose] public def dft2_0 (x0 x1 : CInt) : CInt := CInt.add x0 x1
@[expose] public def dft2_1 (x0 x1 : CInt) : CInt := CInt.sub x0 x1

/-- Exact 4-point unnormalized DFT over Z[i] (twiddle factors 1, -i, -1, +i). -/
@[expose] public def dft4_0 (x0 x1 x2 x3 : CInt) : CInt :=
  CInt.add (CInt.add x0 x2) (CInt.add x1 x3)
@[expose] public def dft4_1 (x0 x1 x2 x3 : CInt) : CInt :=
  CInt.add (CInt.sub x0 x2) (CInt.mulNegI (CInt.sub x1 x3))
@[expose] public def dft4_2 (x0 x1 x2 x3 : CInt) : CInt :=
  CInt.sub (CInt.add x0 x2) (CInt.add x1 x3)
@[expose] public def dft4_3 (x0 x1 x2 x3 : CInt) : CInt :=
  CInt.sub (CInt.sub x0 x2) (CInt.mulNegI (CInt.sub x1 x3))

/-- Exact total byte length of nFull fixed-size shards plus a final tail shard. -/
@[expose] public def shardTotalBytes (nFull fullBytes tailBytes : Nat) : Nat :=
  nFull * fullBytes + tailBytes

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

/-- Modular additive-shear catalytic register pass over Z/mZ (honoring catalytic-register-frontiers). -/
@[expose] public def catalyticShearAdd (b d m : Nat) : Nat := (b + d % m) % m

/-- Exact inverse modular additive-shear catalytic restoration pass over Z/mZ. -/
@[expose] public def catalyticShearSub (b d m : Nat) : Nat := (b + m - d % m) % m

/-- Elementwise XOR pass over a byte buffer for the Catalytic Byte-Vault. -/
@[expose] public def catalyticXorBytes (buf mask : List UInt8) : List UInt8 :=
  List.zipWith (fun a b => a ^^^ b) buf mask

/-- Disjointness predicate for two linear-memory slices [off1, off1+len1) and [off2, off2+len2). -/
@[expose] public def arenaSliceDisjoint (off1 len1 off2 len2 : Nat) : Prop :=
  ∀ i j : Nat, i < len1 → j < len2 → off1 + i ≠ off2 + j

/-- 4-lane SIMD parallel sum grouping (lanes 0+1 then 2+3 vs 0+2 then 1+3). -/
@[expose] public def simd4LaneSum (a0 a1 a2 a3 : Int) : Int := (a0 + a1) + (a2 + a3)
@[expose] public def simd4SplitSum (a0 a1 a2 a3 : Int) : Int := (a0 + a2) + (a1 + a3)

/-- Total GPU render work as a function of rendered frames and per-frame cost. -/
@[expose] public def gpuRenderWork (framesRendered costPerFrame : Nat) : Nat :=
  framesRendered * costPerFrame

/-- Exact integer-scaled 1-qubit CP^1 Fubini-Study metric determinant: 16 * det(g) = sin^2(theta). -/
@[expose] public def fubiniStudyDetScaled (sinScaled : Int) : Int :=
  sinScaled * sinScaled

end XiaomiLab.Spec
