#!/usr/bin/env python3
"""
Cryptographic Provenance & Archival Utility for xiaomi-17t-pro-lab (Playbook v1.3):
  1. Generates real DigiCert RFC 3161 timestamp tokens (`.tsr`) using OpenSSL `ts -query`
     against `http://timestamp.digicert.com` and inspects each returned reply (`openssl ts -reply -text`).
  2. Submits SHA-256 digests to Bitcoin OpenTimestamps public calendar servers
     (`https://a.pool.opentimestamps.org/digest`) and writes verifiable `.ots` pending proofs.
  3. Submits a live Software Heritage Save Code Now request for `https://github.com/0thernes/xiaomi-17t-pro-lab`
     and writes `proofs/provenance-receipts.json`.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PROOFS_DIR = ROOT / "proofs"
DIGICERT_TSA = "http://timestamp.digicert.com"
OTS_CALENDARS = (
    "https://a.pool.opentimestamps.org/digest",
    "https://b.pool.opentimestamps.org/digest",
    "https://alice.btc.calendar.opentimestamps.org/digest",
)
SWH_SAVE_URL = "https://archive.softwareheritage.org/api/1/origin/save/git/url/https://github.com/0thernes/xiaomi-17t-pro-lab/"


def find_openssl() -> str:
    for candidate in (
        shutil.which("openssl"),
        r"C:\Program Files\Git\usr\bin\openssl.exe",
        r"C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
    ):
        if candidate and Path(candidate).exists():
            return candidate
    raise FileNotFoundError("OpenSSL binary not found on PATH or Git for Windows.")


def rfc3161_timestamp(target: Path, out_tsr: Path, openssl_bin: str) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="rfc3161-") as td:
        tsq = Path(td) / "req.tsq"
        subprocess.run(
            [openssl_bin, "ts", "-query", "-data", str(target), "-sha256", "-cert", "-out", str(tsq)],
            check=True,
            capture_output=True,
        )
        req = urllib.request.Request(
            DIGICERT_TSA,
            data=tsq.read_bytes(),
            headers={"Content-Type": "application/timestamp-query", "User-Agent": "xiaomi-17t-pro-lab/3.1"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=25) as resp:
            tsr_bytes = resp.read()
        out_tsr.parent.mkdir(parents=True, exist_ok=True)
        out_tsr.write_bytes(tsr_bytes)

        inspect = subprocess.run(
            [openssl_bin, "ts", "-reply", "-in", str(out_tsr), "-text"],
            check=True,
            capture_output=True,
            text=True,
        )
        txt = inspect.stdout
        if "Status: Granted." not in txt:
            raise RuntimeError(f"DigiCert RFC 3161 timestamp not granted:\n{txt}")
        time_line = next((ln.strip() for ln in txt.splitlines() if ln.strip().startswith("Time stamp:")), "")
        serial_line = next((ln.strip() for ln in txt.splitlines() if ln.strip().startswith("Serial number:")), "")
        return {
            "target": target.relative_to(ROOT).as_posix(),
            "target_sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            "tsr_path": out_tsr.relative_to(ROOT).as_posix(),
            "tsr_bytes": len(tsr_bytes),
            "tsa_url": DIGICERT_TSA,
            "status": "Granted",
            "timestamp": time_line,
            "serial": serial_line,
        }


def build_ots_file(file_digest: bytes, calendar_url: str, cal_resp: bytes) -> bytes:
    """Assemble standard OpenTimestamps v1 proof header + PendingAttestation commitment."""
    # Standard OTS v1 magic + version 0x01 + SHA256 op (0x08) + 32-byte digest + raw calendar response
    header = b"\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94\x01\x08"
    return header + file_digest + cal_resp


def opentimestamps_stamp(target: Path, out_ots: Path) -> dict[str, Any]:
    digest = hashlib.sha256(target.read_bytes()).digest()
    last_err: Exception | None = None
    for cal in OTS_CALENDARS:
        try:
            req = urllib.request.Request(
                cal,
                data=digest,
                headers={
                    "Accept": "application/vnd.opentimestamps.v1",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "xiaomi-17t-pro-lab/3.1",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                cal_bytes = resp.read()
            ots_bytes = build_ots_file(digest, cal, cal_bytes)
            out_ots.parent.mkdir(parents=True, exist_ok=True)
            out_ots.write_bytes(ots_bytes)
            return {
                "target": target.relative_to(ROOT).as_posix(),
                "target_sha256": digest.hex(),
                "ots_path": out_ots.relative_to(ROOT).as_posix(),
                "ots_bytes": len(ots_bytes),
                "calendar_url": cal,
                "status": "Stamped (pending Bitcoin attestation)",
            }
        except Exception as e:
            last_err = e
    raise RuntimeError(f"All OpenTimestamps calendars failed: {last_err}")


def software_heritage_save() -> dict[str, Any]:
    req = urllib.request.Request(
        SWH_SAVE_URL,
        data=b"",
        headers={"Accept": "application/json", "User-Agent": "xiaomi-17t-pro-lab/3.1"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        return {
            "endpoint": SWH_SAVE_URL,
            "http_status": 200,
            "save_request_status": payload.get("save_request_status"),
            "save_task_status": payload.get("save_task_status"),
            "visit_date": payload.get("visit_date"),
            "id": payload.get("id"),
        }
    except Exception as e:
        return {"endpoint": SWH_SAVE_URL, "error": str(e)}


def main() -> int:
    openssl_bin = find_openssl()
    PROOFS_DIR.mkdir(parents=True, exist_ok=True)
    targets = [
        (ROOT / "CHECKSUMS.sha256", PROOFS_DIR / "CHECKSUMS.sha256.tsr", PROOFS_DIR / "CHECKSUMS.sha256.ots"),
        (
            ROOT / "dist" / "Donahue_2026_Xiaomi_17T_Pro_Lab.pdf",
            PROOFS_DIR / "Donahue_2026_Xiaomi_17T_Pro_Lab.pdf.tsr",
            PROOFS_DIR / "Donahue_2026_Xiaomi_17T_Pro_Lab.pdf.ots",
        ),
    ]
    rfc_results: list[dict[str, Any]] = []
    ots_results: list[dict[str, Any]] = []
    for tgt, tsr, ots in targets:
        r = rfc3161_timestamp(tgt, tsr, openssl_bin)
        rfc_results.append(r)
        print(f"PASS [RFC 3161 DigiCert] {r['tsr_path']} ({r['tsr_bytes']} B) — {r['timestamp']}")
        o = opentimestamps_stamp(tgt, ots)
        ots_results.append(o)
        print(f"PASS [OpenTimestamps]    {o['ots_path']} ({o['ots_bytes']} B) via {o['calendar_url']}")

    swh = software_heritage_save()
    print(f"INFO [Software Heritage] {swh}")

    receipt_path = PROOFS_DIR / "provenance-receipts.json"
    receipt_path.write_text(
        json.dumps(
            {
                "version": (ROOT / "VERSION").read_text(encoding="utf-8").strip(),
                "rfc3161_digicert": rfc_results,
                "opentimestamps_bitcoin": ots_results,
                "software_heritage": swh,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"PASS: Wrote {receipt_path.relative_to(ROOT).as_posix()}.")
    return 0


if __name__ == "__main__":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    raise SystemExit(main())
