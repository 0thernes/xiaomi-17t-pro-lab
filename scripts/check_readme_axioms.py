#!/usr/bin/env python3
"""
Verifies Lean 4.35.0 axiom-audit output (`results/lean4-audit.txt`) and scans all
sorry-free Lean files in `lean/` using a nested-comment and string-literal safe parser.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "reference"))
from physics_oracle import strip_lean_comments_and_strings  # noqa: E402

ALLOWED_AXIOMS = {"propext", "Classical.choice", "Quot.sound"}
FORBIDDEN_TOKENS = re.compile(r"\b(sorry|admit|axiom|native_decide|unsafe|implemented_by)\b|@\[extern")
EXPECTED_MIN_DECLS = 59


def main() -> int:
    lean_files = [
        ROOT / "lean" / "XiaomiLabProofs.lean",
        ROOT / "lean" / "Solution.lean",
    ] + sorted((ROOT / "lean" / "XiaomiLabProofs").glob("*.lean"))

    for path in lean_files:
        cleaned = strip_lean_comments_and_strings(path.read_text(encoding="utf-8"))
        match = FORBIDDEN_TOKENS.search(cleaned)
        if match:
            raise SystemExit(f"ERROR: Forbidden token '{match.group(0)}' in {path}")
    print(f"PASS: Zero forbidden Lean tokens across {len(lean_files)} sorry-free files.")

    audit_path = ROOT / "results" / "lean4-audit.txt"
    if not audit_path.exists():
        raise SystemExit(f"ERROR: Missing axiom audit log at {audit_path}")

    # Normalize wrapped multi-line '#print axioms' entries before checking
    raw_text = audit_path.read_text(encoding="utf-8")
    merged_lines: list[str] = []
    for raw in raw_text.splitlines():
        s = raw.strip()
        if not s:
            continue
        if s.startswith("'") or not merged_lines:
            merged_lines.append(s)
        else:
            merged_lines[-1] = merged_lines[-1] + " " + s

    count = 0
    for line in merged_lines:
        if any(bad in line for bad in ("sorryAx", "Lean.ofReduceBool", "_native")):
            raise SystemExit(f"ERROR: Forbidden axiom detected: {line}")
        if "depends on axioms:" in line:
            count += 1
            bracket = line.split("[", 1)[1].rsplit("]", 1)[0]
            used = {tok.strip() for tok in bracket.split(",") if tok.strip()}
            if not used.issubset(ALLOWED_AXIOMS):
                raise SystemExit(f"ERROR: Unauthorized axiom(s) {used - ALLOWED_AXIOMS} in: {line}")
        elif "does not depend on any axioms" in line:
            count += 1

    if count < EXPECTED_MIN_DECLS:
        raise SystemExit(f"ERROR: Expected >= {EXPECTED_MIN_DECLS} audited declarations, got {count}")

    print(f"PASS: All {count} audited Lean 4.35.0 declarations use only {sorted(ALLOWED_AXIOMS)} (or zero axioms).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
