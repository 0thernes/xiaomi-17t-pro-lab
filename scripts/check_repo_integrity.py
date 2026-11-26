#!/usr/bin/env python3
"""
Repository-Wide Forensic Integrity Guard for xiaomi-17t-pro-lab.

Enforces:
  1. Zero broken relative Markdown links AND zero case mismatches against `git ls-files`.
  2. Zero CRLF line endings in any tracked text file.
  3. Zero unformed '0thernes LLC' assertions in active identity/metadata files.
  4. 100% BibTeX <-> LaTeX citation coverage (`0` uncited, `0` undefined keys).
  5. Strict CSP (`style-src 'self'`, zero `unsafe-inline`) and `<link rel="icon">` on both
     `index.html` and `blueprint/index.html`.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BINARY_EXTS = {".png", ".jpg", ".jpeg", ".pdf", ".gz", ".wasm", ".wav", ".woff2", ".tsr", ".ots"}
ACTIVE_IDENTITY_FILES = (
    "README.md",
    "LICENSE",
    "NOTICE",
    "CITATION.cff",
    "paper/main.tex",
    "formalization.yaml",
    "repo.yaml",
    ".zenodo.json",
    "blueprint/index.html",
)
MD_LINK_RE = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")


def git_tracked_files() -> list[Path]:
    out = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True)
    return [ROOT / ln.strip() for ln in out.splitlines() if ln.strip() and (ROOT / ln.strip()).is_file()]


def main() -> int:
    errors: list[str] = []
    files = git_tracked_files()
    tracked_set = {f.relative_to(ROOT).as_posix() for f in files}
    lower_map = {t.lower(): t for t in tracked_set}

    # 1. Markdown links + exact case match
    md_count = 0
    for f in files:
        if f.suffix.lower() != ".md":
            continue
        md_count += 1
        rel = f.relative_to(ROOT).as_posix()
        txt = f.read_text(encoding="utf-8")
        cleaned = re.sub(r"```.*?```", "", txt, flags=re.S)
        cleaned = re.sub(r"`[^`\n]+`", "", cleaned)
        for m in MD_LINK_RE.finditer(cleaned):
            href = m.group(1).strip()
            if not href or href.startswith(("#", "http://", "https://", "mailto:", "file://", "data:")):
                continue
            target = href.split("#", 1)[0].split("?", 1)[0]
            if not target:
                continue
            resolved = (f.parent / target).resolve()
            if not resolved.exists():
                errors.append(f"Broken markdown link in {rel}: {href}")
                continue
            try:
                rel_target = resolved.relative_to(ROOT.resolve()).as_posix()
            except ValueError:
                errors.append(f"Markdown link escapes repo in {rel}: {href}")
                continue
            if resolved.is_file() and rel_target not in tracked_set:
                if rel_target.lower() in lower_map:
                    errors.append(
                        f"Case-mismatch markdown link in {rel}: {href} (git has {lower_map[rel_target.lower()]})"
                    )
                else:
                    errors.append(f"Markdown link points to untracked file in {rel}: {href}")

    # 2. Zero CRLF in tracked text files
    text_checked = 0
    for f in files:
        if f.suffix.lower() in BINARY_EXTS or ".part" in f.name:
            continue
        text_checked += 1
        if b"\r\n" in f.read_bytes():
            errors.append(f"CRLF line endings in tracked text file: {f.relative_to(ROOT).as_posix()}")

    # 3. Identity hygiene
    for rel in ACTIVE_IDENTITY_FILES:
        p = ROOT / rel
        if p.exists() and re.search(r"0thernes\s+LLC", p.read_text(encoding="utf-8"), re.I):
            errors.append(f"Unformed '0thernes LLC' assertion in active identity file: {rel}")

    # 4. BibTeX <-> LaTeX 100% coverage
    bib_txt = (ROOT / "paper" / "refs.bib").read_text(encoding="utf-8")
    tex_txt = (ROOT / "paper" / "main.tex").read_text(encoding="utf-8")
    bib_keys = set(re.findall(r"@\w+\{([^,]+),", bib_txt))
    cited_keys: set[str] = set()
    for grp in re.findall(r"\\cite[a-z]*\{([^}]+)\}", tex_txt):
        for k in grp.split(","):
            cited_keys.add(k.strip())
    if bib_keys - cited_keys:
        errors.append(f"Uncited BibTeX entries in paper/refs.bib: {sorted(bib_keys - cited_keys)}")
    if cited_keys - bib_keys:
        errors.append(f"Missing BibTeX entries referenced in paper/main.tex: {sorted(cited_keys - bib_keys)}")

    # 5. HTML strict CSP + favicon on both index.html and blueprint/index.html
    for html_rel in ("index.html", "blueprint/index.html"):
        ht = (ROOT / html_rel).read_text(encoding="utf-8")
        if not re.search(r'rel=["\'](?:shortcut )?icon["\']', ht, re.I):
            errors.append(f"Missing <link rel='icon'> in {html_rel}")
        if "Content-Security-Policy" not in ht or "style-src 'self'" not in ht:
            errors.append(f"Missing strict style-src 'self' CSP in {html_rel}")
        if "unsafe-inline" in ht:
            errors.append(f"Forbidden unsafe-inline CSP directive in {html_rel}")

    # 6. Markdown table column-count integrity (prevents unescaped '|' pipes breaking tables)
    for f in files:
        if f.suffix.lower() != ".md":
            continue
        rel = f.relative_to(ROOT).as_posix()
        in_fence = False
        expected_cols: int | None = None
        for idx, raw_ln in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            s = raw_ln.strip()
            if s.startswith("```"):
                in_fence = not in_fence
                expected_cols = None
                continue
            if in_fence:
                continue
            if s.startswith("|") and s.endswith("|"):
                # Count unescaped pipes separating columns
                cols = len(re.findall(r"(?<!\\)\|", s)) - 1
                if expected_cols is None:
                    expected_cols = cols
                elif cols != expected_cols:
                    errors.append(
                        f"Malformed markdown table row in {rel}:{idx}: expected {expected_cols} cols, got {cols}"
                    )
            else:
                expected_cols = None

    if errors:
        print("FAIL: Repository integrity audit found issues:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print(
        f"PASS: Repo integrity verified ({md_count} markdown files, 0 broken/case-mismatch links, "
        f"{text_checked} LF text files, {len(bib_keys)}/{len(bib_keys)} BibTeX citations, strict CSP+favicon on both HTML entrypoints)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
