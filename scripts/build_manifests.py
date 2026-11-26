#!/usr/bin/env python3
"""
Deterministically builds:
1. data/MANIFEST.sha256 (pinned data/ + TinyStories shard manifests)
2. CHECKSUMS.sha256 (frozen PDF, arXiv tarball, Lean audit log, oracle/eval/bench/stats JSONs, golden snapshot)
3. llms-full.txt (compact single-file agent context digest of core markdown & formal specs)
"""

from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def sha256_rel(rel: str) -> str:
    p = ROOT / rel
    if not p.exists():
        raise FileNotFoundError(f"Missing required artifact for manifest: {rel}")
    return f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {rel}"


def normalize_lf(rel: str) -> None:
    p = ROOT / rel
    if p.exists():
        raw = p.read_bytes()
        if b"\r\n" in raw:
            p.write_bytes(raw.replace(b"\r\n", b"\n"))


def write_manifests() -> None:
    for text_rel in (
        "VERSION",
        "repo.yaml",
        "formalization.yaml",
        "CITATION.cff",
        "results/lean4-audit.txt",
        "results/oracle-60digit.json",
        "results/stats-eval.json",
        "tests/golden/baseline-snapshot.json",
        "lean/comparator.json",
        "lean/Challenge.lean",
        "lean/Solution.lean",
        "lean/VerifyAxioms.lean",
        "data/specs.json",
        "data/taxonomy.json",
        "vendor/tinystories/shards.json",
        "vendor/tinystories/vocab.json",
        "vendor/tinystories/merges.txt",
    ):
        normalize_lf(text_rel)

    data_files = [
        "data/specs.json",
        "data/taxonomy.json",
        "vendor/tinystories/shards.json",
        "vendor/tinystories/vocab.json",
        "vendor/tinystories/merges.txt",
        *[f"vendor/tinystories/shards/model.f16.safetensors.part{i:02d}" for i in range(9)],
    ]
    (ROOT / "data" / "MANIFEST.sha256").write_text(
        "\n".join(sha256_rel(rel) for rel in data_files) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    checksum_files = [
        "VERSION",
        "repo.yaml",
        "formalization.yaml",
        "CITATION.cff",
        "dist/Donahue_2026_Xiaomi_17T_Pro_Lab.pdf",
        "dist/arxiv_submission.tar.gz",
        "results/lean4-audit.txt",
        "results/oracle-60digit.json",
        "results/stats-eval.json",
        "tests/golden/baseline-snapshot.json",
        "lean/comparator.json",
        "lean/Challenge.lean",
        "lean/Solution.lean",
        "lean/VerifyAxioms.lean",
    ]
    (ROOT / "CHECKSUMS.sha256").write_text(
        "\n".join(sha256_rel(rel) for rel in checksum_files) + "\n",
        encoding="utf-8",
        newline="\n",
    )

    llms_sources = [
        "README.md",
        "AGENTS.md",
        "CLAIMS.md",
        "LIMITATIONS.md",
        "VERIFICATION.md",
        "REPLICATION.md",
        "formalization.yaml",
        "docs/mega-atlas-cross-reference.md",
        "docs/statement-fidelity.md",
        "docs/ai.md",
        "docs/threat-model.md",
        "docs/benchmarks.md",
        "docs/preregistration.md",
        "docs/faq.md",
    ]
    parts: list[str] = [
        "# xiaomi-17t-pro-lab — llms-full.txt (Generated Complete Context Digest)\n",
    ]
    for rel in llms_sources:
        p = ROOT / rel
        if p.exists():
            parts.append(f"\n---\n## FILE: {rel}\n---\n")
            parts.append(p.read_text(encoding="utf-8"))
    (ROOT / "llms-full.txt").write_text("\n".join(parts).strip() + "\n", encoding="utf-8", newline="\n")
    print(f"PASS: Wrote data/MANIFEST.sha256 ({len(data_files)} files), CHECKSUMS.sha256 ({len(checksum_files)} files), and llms-full.txt.")


if __name__ == "__main__":
    write_manifests()
