#!/usr/bin/env python3
"""
Xiaomi 17T Pro Lab (v3.0.0) — Release PDF & Standalone arXiv Tarball Packager + Verifier.

1. Compiles paper/main.tex via Tectonic (--keep-intermediates --keep-logs).
2. Enforces zero LaTeX warnings / overfull / underfull / undefined references.
3. Copies frozen release PDF to dist/Donahue_2026_Xiaomi_17T_Pro_Lab.pdf.
4. Packages dist/arxiv_submission.tar.gz containing main.tex, main.bbl, refs.bib,
   and all vector figures paper/figures/*.pdf.
5. Extracts dist/arxiv_submission.tar.gz into a fresh temporary directory and
   verifies standalone compilation via Tectonic with zero errors.
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAPER = ROOT / "paper"
BUILD = PAPER / "build"
DIST = ROOT / "dist"


def find_tectonic() -> str:
    found = shutil.which("tectonic")
    if found:
        return found
    win_default = Path.home() / ".local" / "bin" / "tectonic.exe"
    if win_default.exists():
        return str(win_default)
    raise FileNotFoundError("tectonic not found")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    tectonic = find_tectonic()
    BUILD.mkdir(parents=True, exist_ok=True)
    DIST.mkdir(parents=True, exist_ok=True)

    res = subprocess.run(
        [tectonic, "-X", "compile", "main.tex", "--outdir", "build", "--keep-intermediates", "--keep-logs"],
        cwd=PAPER,
        capture_output=True,
        text=True,
        check=False,
    )
    if res.returncode != 0:
        print(res.stdout)
        print(res.stderr)
        raise RuntimeError("Tectonic failed compiling paper/main.tex")

    log_text = (BUILD / "main.log").read_text(encoding="utf-8", errors="replace")
    bad = [
        line
        for line in log_text.splitlines()
        if any(tok in line for tok in ("Overfull \\hbox", "Underfull \\hbox", "Undefined", "LaTeX Warning"))
    ]
    if bad:
        raise RuntimeError("LaTeX warnings detected:\n" + "\n".join(bad))
    print("[PASS] Zero LaTeX warnings / overfull / underfull / undefined refs in paper/main.tex.")

    pdf_out = DIST / "Donahue_2026_Xiaomi_17T_Pro_Lab.pdf"
    shutil.copy2(BUILD / "main.pdf", pdf_out)

    tar_out = DIST / "arxiv_submission.tar.gz"
    with tarfile.open(tar_out, "w:gz") as tf:
        tf.add(PAPER / "main.tex", arcname="main.tex")
        if (BUILD / "main.bbl").exists():
            tf.add(BUILD / "main.bbl", arcname="main.bbl")
        tf.add(PAPER / "refs.bib", arcname="refs.bib")
        for fig_pdf in sorted((PAPER / "figures").glob("*.pdf")):
            tf.add(fig_pdf, arcname=f"figures/{fig_pdf.name}")

    with tempfile.TemporaryDirectory(prefix="xiaomi_arxiv_check_") as tmpdir:
        tmp = Path(tmpdir)
        with tarfile.open(tar_out, "r:gz") as tf:
            tf.extractall(tmp, filter="data")
        check = subprocess.run(
            [tectonic, "-X", "compile", "main.tex"],
            cwd=tmp,
            capture_output=True,
            text=True,
            check=False,
        )
        if check.returncode != 0 or not (tmp / "main.pdf").exists():
            print(check.stdout)
            print(check.stderr)
            raise RuntimeError("Standalone arXiv tarball failed compilation!")

    print(f"[PASS] Standalone arXiv tarball verified in fresh temp dir: {tar_out.name}")
    print(f"PDF SHA-256:   {sha256_file(pdf_out)}  dist/{pdf_out.name} ({pdf_out.stat().st_size:,} bytes)")
    print(f"ARXIV SHA-256: {sha256_file(tar_out)}  dist/{tar_out.name} ({tar_out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
