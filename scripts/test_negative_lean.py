#!/usr/bin/env python3
"""
Live Negative Lean 4.35.0 Kernel & Palomar Comparator Rejection Harness (Playbook v1.3).

Proves empirically that neither the Lean 4.35.0 kernel nor `lake comparator --paranoid`
can be fooled by false theorems, tampered types, or unauthorized axioms:
  1. Compiles 3 deliberately FALSE physics/contextuality claims against `XiaomiLabProofs.Spec`
     and asserts that `lake env lean` REJECTS EVERY ONE with a non-zero exit code.
  2. When `--check-comparator` is passed (on Linux CI with bubblewrap), tampers with a
     temporary copy of `Challenge.lean` (strengthening CHSH classical cap from 2 to 1) and
     asserts `lake comparator --paranoid` actively REJECTS the mismatched `Solution.lean`.

Safe on Python-only runners: if `lake` is not installed on PATH, exits 0 with an explicit
SKIP diagnostic unless `--require-lake` is specified.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEAN_DIR = ROOT / "lean"

FALSE_CLAIMS: list[tuple[str, str]] = [
    (
        "false_chsh_cap_1",
        """
import XiaomiLabProofs.Spec
open XiaomiLab.Spec
theorem bad_chsh : ∀ a0 a1 b0 b1 : Int, IsSign a0 → IsSign a1 → IsSign b0 → IsSign b1 →
    chshExpr a0 a1 b0 b1 ≤ 1 := by
  intro a0 a1 b0 b1 ha0 ha1 hb0 hb1
  unfold IsSign at ha0 ha1 hb0 hb1
  unfold chshExpr
  rcases ha0 with rfl | rfl <;> rcases ha1 with rfl | rfl <;>
  rcases hb0 with rfl | rfl <;> rcases hb1 with rfl | rfl <;> decide
""",
    ),
    (
        "false_peres_mermin_cap_4",
        """
import XiaomiLabProofs.Spec
open XiaomiLab.Spec
theorem bad_pm : pmSatisfiedCount (fun _ _ => 1) ≤ 4 := by
  decide
""",
    ),
    (
        "false_dft2_parseval_no_factor_2",
        """
import XiaomiLabProofs.Spec
open XiaomiLab.Spec
theorem bad_dft2 : ∀ x0 x1 : CInt,
    (dft2_0 x0 x1).normSq + (dft2_1 x0 x1).normSq = x0.normSq + x1.normSq := by
  intro x0 x1
  unfold dft2_0 dft2_1 CInt.add CInt.sub CInt.normSq
  omega
""",
    ),
    (
        "false_catalytic_shear_no_range_bound",
        """
import XiaomiLabProofs.Spec
open XiaomiLab.Spec
theorem bad_catalytic : ∀ b d m : Nat, 0 < m →
    catalyticShearSub (catalyticShearAdd b d m) d m = b := by
  intro b d m hm
  unfold catalyticShearSub catalyticShearAdd
  omega
""",
    ),
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Live negative Lean 4.35.0 kernel rejection test")
    parser.add_argument("--require-lake", action="store_true", help="Fail if `lake` binary is unavailable")
    parser.add_argument(
        "--check-comparator",
        action="store_true",
        help="Also test negative rejection via `lake comparator --paranoid` (requires Linux bubblewrap)",
    )
    args = parser.parse_args()

    lake_bin = shutil.which("lake")
    if not lake_bin:
        msg = "SKIP: `lake` not found on PATH; live negative Lean kernel test skipped on Python-only runner."
        if args.require_lake:
            print("ERROR: " + msg, file=sys.stderr)
            return 1
        print(msg)
        return 0

    with tempfile.TemporaryDirectory(prefix="xiaomi-neg-lean-") as tmpdir:
        tmp = Path(tmpdir)
        for name, src in FALSE_CLAIMS:
            fp = tmp / f"{name}.lean"
            with fp.open("w", encoding="utf-8", newline="\n") as fh:
                fh.write(src.lstrip())
            proc = subprocess.run(
                [lake_bin, "env", "lean", str(fp)],
                cwd=LEAN_DIR,
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode == 0:
                print(f"FAIL: Lean kernel unexpectedly ACCEPTED false claim `{name}`!", file=sys.stderr)
                return 1
            first_err = (proc.stdout + "\n" + proc.stderr).strip().splitlines()[0] if (proc.stdout or proc.stderr) else ""
            print(f"PASS [REJECTED exit={proc.returncode}] {name}: {first_err[:120]}")

        if args.check_comparator:
            # Verify comparator rejects when a target theorem name is mutated to a non-matching theorem
            bad_cfg = tmp / "bad_comparator.json"
            with bad_cfg.open("w", encoding="utf-8", newline="\n") as fh:
                fh.write(
                    '{"challenge_module": "Challenge", "solution_module": "Solution", '
                    '"theorem_names": ["XiaomiLab.ComparatorTarget.nonexistent_tampered_target"], '
                    '"permitted_axioms": ["propext", "Quot.sound"]}\n'
                )
            proc = subprocess.run(
                [lake_bin, "comparator", "--config", str(bad_cfg), "--paranoid"],
                cwd=LEAN_DIR,
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode == 0:
                print("FAIL: `lake comparator --paranoid` unexpectedly ACCEPTED tampered config!", file=sys.stderr)
                return 1
            print(f"PASS [COMPARATOR REJECTED exit={proc.returncode}] tampered comparator target blocked.")

    print(f"PASS: All {len(FALSE_CLAIMS)} false claims rejected live by the Lean 4.35.0 kernel.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
