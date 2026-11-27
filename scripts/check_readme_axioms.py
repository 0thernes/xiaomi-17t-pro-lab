#!/usr/bin/env python3
"""
Verifies Lean 4.35.0 constructive axiom-audit output (`results/lean4-audit.txt`), scans all
sorry-free Lean files in `lean/` with a nested-comment and string-literal safe parser,
enforces ZERO `Classical.choice` across all 75 audited declarations, and checks that the
verbatim headline comparator `#print axioms` block in `README.md` has zero drift.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "reference"))
from physics_oracle import strip_lean_comments_and_strings  # noqa: E402

ALLOWED_AXIOMS = {"propext", "Quot.sound"}
FORBIDDEN_TOKENS = re.compile(r"\b(sorry|admit|axiom|native_decide|unsafe|implemented_by)\b|@\[extern")
EXPECTED_MIN_DECLS = 90


def normalize_audit_lines(raw_text: str) -> list[str]:
    merged: list[str] = []
    for raw in raw_text.splitlines():
        s = raw.strip()
        if not s:
            continue
        if s.startswith("'") or not merged:
            merged.append(s)
        else:
            merged[-1] = merged[-1] + " " + s
    return merged


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

    merged_lines = normalize_audit_lines(audit_path.read_text(encoding="utf-8"))

    count = 0
    zero_ax = 0
    comparator_lines: list[str] = []
    for line in merged_lines:
        if any(bad in line for bad in ("sorryAx", "Lean.ofReduceBool", "_native", "Classical.choice")):
            raise SystemExit(f"ERROR: Forbidden or non-constructive axiom detected: {line}")
        if "XiaomiLab.ComparatorTarget." in line:
            comparator_lines.append(line)
        if "depends on axioms:" in line:
            count += 1
            bracket = line.split("[", 1)[1].rsplit("]", 1)[0]
            used = {tok.strip() for tok in bracket.split(",") if tok.strip()}
            if not used.issubset(ALLOWED_AXIOMS):
                raise SystemExit(f"ERROR: Unauthorized axiom(s) {used - ALLOWED_AXIOMS} in: {line}")
        elif "does not depend on any axioms" in line:
            count += 1
            zero_ax += 1

    if count < EXPECTED_MIN_DECLS:
        raise SystemExit(f"ERROR: Expected >= {EXPECTED_MIN_DECLS} audited declarations, got {count}")

    # Verify README.md verbatim headline comparator axiom block has zero drift (Playbook v1.3)
    readme_txt = (ROOT / "README.md").read_text(encoding="utf-8")
    m = re.search(
        r"<!-- LEAN_AXIOMS_START -->\s*```text\n(.*?)\n```\s*<!-- LEAN_AXIOMS_END -->",
        readme_txt,
        re.S,
    )
    if not m:
        raise SystemExit("ERROR: Missing verbatim <!-- LEAN_AXIOMS_START --> block in README.md")
    readme_lines = [ln.strip() for ln in m.group(1).splitlines() if ln.strip()]
    if readme_lines != comparator_lines:
        raise SystemExit(
            f"ERROR: README.md headline #print axioms block drifted from results/lean4-audit.txt!\n"
            f"Expected ({len(comparator_lines)}):\n" + "\n".join(comparator_lines)
        )

    print(
        f"PASS: All {count} constructive Lean 4.35.0 declarations ({zero_ax} zero-axiom) use strictly "
        f"{sorted(ALLOWED_AXIOMS)} (ZERO Classical.choice); README.md verbatim comparator block matches "
        f"{len(comparator_lines)}/{len(comparator_lines)}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
