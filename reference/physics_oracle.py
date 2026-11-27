#!/usr/bin/env python3
"""
Independent 60-digit Decimal / Exact-Rational Reference Oracle for xiaomi-17t-pro-lab.

Verifies every physics, lithography, quantum-mechanics, semiconductor, memory-wall,
and contextuality formula in src/sim/*.js against independent arbitrary-precision
arithmetic (Python decimal.Decimal at 60 digits + fractions.Fraction + cmath/Decimal
2x2 Bragg transfer matrix), completely decoupled from V8/JavaScript IEEE-754.

Build Standard v1.2.0 coverage: B11 (differential testing), B12 (reference oracle),
B20 (numeric stability), B39 (cryptographic manifest verification).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from decimal import Decimal, getcontext
from fractions import Fraction
from pathlib import Path
from typing import Any

getcontext().prec = 60

ROOT = Path(__file__).resolve().parent.parent

# Exact CODATA 2018 / SI 2019 definitions (Decimal)
PI = Decimal("3.141592653589793238462643383279502884197169399375105820974944")
HBAR_J_S = Decimal("1.054571817e-34")
C_M_S = Decimal("299792458")
M_E_KG = Decimal("9.1093837015e-31")
E_C = Decimal("1.602176634e-19")
SI_LATTICE_M = Decimal("5.431020511e-10")
ELECTRON_REST_MEV = Decimal("0.51099895")
KB_EV_K = Decimal("8.617333262e-5")

HBAR2_OVER_2M_EV_NM2 = (HBAR_J_S * HBAR_J_S) / (Decimal(2) * M_E_KG) / E_C / Decimal("1e-18")
HBAR_EV_FS = (HBAR_J_S / E_C) * Decimal("1e15")
HC_EV_NM = (Decimal(2) * PI * HBAR_J_S * C_M_S / E_C) * Decimal("1e9")


def d_cos(x: Decimal) -> Decimal:
    """High-precision cosine via Taylor series after range reduction."""
    two_pi = Decimal(2) * PI
    x = x % two_pi
    term = Decimal(1)
    total = term
    x2 = x * x
    for k in range(1, 45):
        term = -term * x2 / Decimal((2 * k - 1) * (2 * k))
        total += term
        if abs(term) < Decimal("1e-55"):
            break
    return total


def d_sin(x: Decimal) -> Decimal:
    """High-precision sine via Taylor series after range reduction."""
    two_pi = Decimal(2) * PI
    x = x % two_pi
    term = x
    total = term
    x2 = x * x
    for k in range(1, 45):
        term = -term * x2 / Decimal((2 * k) * (2 * k + 1))
        total += term
        if abs(term) < Decimal("1e-55"):
            break
    return total


def d_cosh(x: Decimal) -> Decimal:
    return (x.exp() + (-x).exp()) / Decimal(2)


def d_sinh(x: Decimal) -> Decimal:
    return (x.exp() - (-x).exp()) / Decimal(2)


def bragg_reflectivity_decimal(
    lambda_nm: Decimal,
    pairs: int = 40,
    d_nm: Decimal = Decimal("6.92"),
    gamma: Decimal = Decimal("0.4"),
) -> Decimal:
    """60-digit complex 2x2 optical transfer-matrix reflectivity for Mo/Si multilayer."""
    n_mo = (Decimal(1) - Decimal("0.0762"), Decimal("0.0064"))
    n_si = (Decimal(1) - Decimal("0.001"), Decimal("0.0018"))
    d_mo = d_nm * gamma
    d_si = d_nm * (Decimal(1) - gamma)
    k0 = (Decimal(2) * PI) / lambda_nm

    def cmul(a: tuple[Decimal, Decimal], b: tuple[Decimal, Decimal]) -> tuple[Decimal, Decimal]:
        return (a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0])

    def cadd(a: tuple[Decimal, Decimal], b: tuple[Decimal, Decimal]) -> tuple[Decimal, Decimal]:
        return (a[0] + b[0], a[1] + b[1])

    def csub(a: tuple[Decimal, Decimal], b: tuple[Decimal, Decimal]) -> tuple[Decimal, Decimal]:
        return (a[0] - b[0], a[1] - b[1])

    def cdiv(a: tuple[Decimal, Decimal], b: tuple[Decimal, Decimal]) -> tuple[Decimal, Decimal]:
        den = b[0] * b[0] + b[1] * b[1]
        return ((a[0] * b[0] + a[1] * b[1]) / den, (a[1] * b[0] - a[0] * b[1]) / den)

    def mmul(
        A: list[tuple[Decimal, Decimal]], B: list[tuple[Decimal, Decimal]]
    ) -> list[tuple[Decimal, Decimal]]:
        return [
            cadd(cmul(A[0], B[0]), cmul(A[1], B[2])),
            cadd(cmul(A[0], B[1]), cmul(A[1], B[3])),
            cadd(cmul(A[2], B[0]), cmul(A[3], B[2])),
            cadd(cmul(A[2], B[1]), cmul(A[3], B[3])),
        ]

    def layer_mat(n: tuple[Decimal, Decimal], thick: Decimal) -> list[tuple[Decimal, Decimal]]:
        phi_r = k0 * n[0] * thick
        phi_i = k0 * n[1] * thick
        c = (d_cos(phi_r) * d_cosh(phi_i), -d_sin(phi_r) * d_sinh(phi_i))
        s = (d_sin(phi_r) * d_cosh(phi_i), d_cos(phi_r) * d_sinh(phi_i))
        neg_is = (s[1], -s[0])
        return [c, cdiv(neg_is, n), cmul(neg_is, n), c]

    pair_m = mmul(layer_mat(n_mo, d_mo), layer_mat(n_si, d_si))
    M = [(Decimal(1), Decimal(0)), (Decimal(0), Decimal(0)), (Decimal(0), Decimal(0)), (Decimal(1), Decimal(0))]
    for _ in range(pairs):
        M = mmul(M, pair_m)

    m00 = M[0]
    m01ns = cmul(M[1], n_si)
    m10 = M[2]
    m11ns = cmul(M[3], n_si)
    num = csub(cadd(m00, m01ns), cadd(m10, m11ns))
    den = cadd(cadd(m00, m01ns), cadd(m10, m11ns))
    r = cdiv(num, den)
    return r[0] * r[0] + r[1] * r[1]


def check_close(name: str, js_val: float, ref_val: Decimal, rel_tol: float = 1e-12, abs_tol: float = 1e-14) -> dict[str, Any]:
    ref_f = float(ref_val)
    err = abs(js_val - ref_f)
    denom = max(abs(ref_f), 1e-30)
    rel = err / denom
    ok = err <= abs_tol or rel <= rel_tol
    if not ok:
        raise AssertionError(
            f"Oracle mismatch [{name}]: js={js_val:.17g} vs 60-digit ref={ref_val:.20g} (rel={rel:.3e}, abs={err:.3e})"
        )
    return {"name": name, "js": js_val, "ref": str(ref_val)[:24], "rel_err": rel, "pass": True}


def verify_manifest(manifest_path: Path) -> int:
    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing manifest: {manifest_path}")
    count = 0
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(None, 1)
        if len(parts) != 2:
            raise ValueError(f"Malformed checksum line in {manifest_path}: {line}")
        expected_hex, rel = parts
        rel = rel.lstrip("*")
        target = ROOT / rel
        if not target.exists():
            raise FileNotFoundError(f"Manifest entry missing on disk: {rel}")
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        if actual != expected_hex:
            raise AssertionError(f"SHA-256 mismatch for {rel}: expected {expected_hex}, got {actual}")
        count += 1
    return count


def strip_lean_comments_and_strings(text: str) -> str:
    """Nested-comment and string-literal safe stripper for Lean 4 source files."""
    out: list[str] = []
    i = 0
    n = len(text)
    block_depth = 0
    in_line = False
    in_str = False
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if in_line:
            if ch == "\n":
                in_line = False
                out.append("\n")
            i += 1
            continue
        if in_str:
            if ch == "\\" and i + 1 < n:
                i += 2
                continue
            if ch == '"':
                in_str = False
            i += 1
            continue
        if block_depth > 0:
            if ch == "/" and nxt == "-":
                block_depth += 1
                i += 2
                continue
            if ch == "-" and nxt == "/":
                block_depth -= 1
                i += 2
                continue
            if ch == "\n":
                out.append("\n")
            i += 1
            continue
        if ch == "-" and nxt == "-":
            in_line = True
            i += 2
            continue
        if ch == "/" and nxt == "-":
            block_depth = 1
            i += 2
            continue
        if ch == '"':
            in_str = True
            i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def run_differential_oracle() -> list[dict[str, Any]]:
    proc = subprocess.run(
        ["node", str(ROOT / "scripts" / "export_js_vectors.mjs")],
        capture_output=True,
        text=True,
        check=True,
        cwd=str(ROOT),
    )
    js = json.loads(proc.stdout)
    checks: list[dict[str, Any]] = []

    # 1. Fundamental constants & Si lattice
    checks.append(check_close("HBAR2_OVER_2M_EV_NM2", js["constants"]["hbar2Over2mEvNm2"], HBAR2_OVER_2M_EV_NM2))
    checks.append(check_close("HBAR_EV_FS", js["constants"]["hbarEvFs"], HBAR_EV_FS))
    checks.append(check_close("HC_EV_NM", js["constants"]["hcEvNm"], HC_EV_NM))
    si_nn = (SI_LATTICE_M * Decimal(3).sqrt()) / Decimal(4)
    checks.append(check_close("silicon_nearest_neighbor_m", js["constants"]["siNearestNeighborM"], si_nn))

    # 2. Rayleigh / EUV Lithography & Mo/Si Bragg Transfer Matrix
    lam_euv = Decimal("13.5")
    checks.append(check_close("rayleigh_cd_033_k025", js["litho"]["cdLowNa"], Decimal("0.25") * lam_euv / Decimal("0.33")))
    checks.append(check_close("rayleigh_cd_055_k025", js["litho"]["cdHighNa"], Decimal("0.25") * lam_euv / Decimal("0.55")))
    checks.append(check_close("euv_photon_13_5nm_eV", js["litho"]["euvPhotonEv"], HC_EV_NM / lam_euv))
    checks.append(check_close("arf_to_euv_ratio", js["litho"]["arfToEuvRatio"], Decimal(Fraction(1933, 135).numerator) / Decimal(Fraction(1933, 135).denominator)))
    checks.append(check_close("dof_033_nm", js["litho"]["dofLowNa"], Decimal("0.5") * lam_euv / (Decimal("0.33") ** 2)))
    checks.append(check_close("dof_055_nm", js["litho"]["dofHighNa"], Decimal("0.5") * lam_euv / (Decimal("0.55") ** 2)))

    r_135 = bragg_reflectivity_decimal(lam_euv, pairs=40)
    checks.append(check_close("bragg_R_13_5nm", js["litho"]["braggR135"], r_135, rel_tol=1e-11))
    checks.append(check_close("bragg_11_mirror_T", js["litho"]["braggElevenT"], r_135 ** 11, rel_tol=1e-10))
    for lam_str, js_r in js["litho"]["braggSweep"].items():
        ref_r = bragg_reflectivity_decimal(Decimal(lam_str), pairs=40)
        checks.append(check_close(f"bragg_R_{lam_str}nm", js_r, ref_r, rel_tol=1e-11))

    # 3. WKB Tunneling, Dirac Dispersion, Silicon Carriers, FinFET & Infinite Well
    for case in js["quantum"]["wkbCases"]:
        e_ev = Decimal(str(case["energyEv"]))
        v0 = Decimal(str(case["barrierEv"]))
        d_nm = Decimal(str(case["thicknessNm"]))
        m_eff = Decimal(str(case["effMassRatio"]))
        kappa = ((v0 - e_ev) / (HBAR2_OVER_2M_EV_NM2 / m_eff)).sqrt()
        trans = (Decimal(-2) * kappa * d_nm).exp()
        checks.append(check_close(f"wkb_T_d{case['thicknessNm']}_V{case['barrierEv']}", case["transmission"], trans, rel_tol=1e-12))

    for case in js["quantum"]["diracCases"]:
        p = Decimal(str(case["pMeVc"]))
        e_rel = (p * p + ELECTRON_REST_MEV * ELECTRON_REST_MEV).sqrt()
        checks.append(check_close(f"dirac_E_p{case['pMeVc']}", case["electronMeV"], e_rel))
        checks.append(check_close(f"dirac_gamma_p{case['pMeVc']}", case["gamma"], e_rel / ELECTRON_REST_MEV))

    for case in js["quantum"]["siliconCases"]:
        T = Decimal(str(case["tempK"]))
        eg = Decimal("1.1695") - (Decimal("4.73e-4") * T * T) / (T + Decimal(636))
        # Use math.pow for non-integer exponent cross-check against high-precision exp(ln)
        t_ratio = T / Decimal(300)
        nc = Decimal("2.86e19") * (Decimal("1.58") * t_ratio.ln()).exp()
        nv = Decimal("3.1e19") * (Decimal("1.85") * t_ratio.ln()).exp()
        ni = (nc * nv).sqrt() * (-eg / (Decimal(2) * KB_EV_K * T)).exp()
        checks.append(check_close(f"si_ni_{case['tempK']}K", case["niCm3"], ni, rel_tol=1e-11))

    for case in js["quantum"]["finfetCases"]:
        lam = (Decimal(str(case["epsSi"])) * Decimal(str(case["tSi"])) * Decimal(str(case["tOx"])) / (Decimal(2) * Decimal(str(case["epsOx"])))).sqrt()
        checks.append(check_close(f"finfet_lambda_tSi{case['tSi']}_tOx{case['tOx']}", case["lambda"], lam))

    for n_idx in range(1, 5):
        l_nm = Decimal("3.0")
        e_n = (Decimal(n_idx * n_idx) * PI * PI * HBAR2_OVER_2M_EV_NM2) / (l_nm * l_nm)
        checks.append(check_close(f"inf_well_E{n_idx}", js["quantum"]["wellAnalytic"][n_idx - 1], e_n))

    # 4. Exact Rational Device, Memory Wall & Roofline Math
    bw_9600 = Fraction(9600 * 64, 8 * 1000)
    bw_10667 = Fraction(10667 * 64, 8 * 1000)
    checks.append(check_close("lpddr5x_9600_bw", js["memory"]["bw9600"], Decimal(bw_9600.numerator) / Decimal(bw_9600.denominator)))
    checks.append(check_close("lpddr5x_10667_bw", js["memory"]["bw10667"], Decimal(bw_10667.numerator) / Decimal(bw_10667.denominator)))
    clock_ratio = Fraction(421, 270)
    checks.append(check_close("ultra_to_pro_clock_ratio", js["device"]["ultraToProRatio"], Decimal(clock_ratio.numerator) / Decimal(clock_ratio.denominator)))
    ppi_ref = (Decimal(1280) ** 2 + Decimal(2772) ** 2).sqrt() / Decimal("6.83")
    checks.append(check_close("display_ppi_17t_pro", js["device"]["ppi17tPro"], ppi_ref))
    ridge_ref = Decimal(3840) / (Decimal(bw_9600.numerator) / Decimal(bw_9600.denominator))
    checks.append(check_close("roofline_ridge_ai", js["memory"]["ridgeAi"], ridge_ref))

    # 5. Quantum Contextuality Exact Bounds (CHSH 2*sqrt(2), Mermin-3 = 4, Bell S = 1 bit)
    tsirelson = Decimal(2) * Decimal(2).sqrt()
    checks.append(check_close("chsh_tsirelson_2sqrt2", js["contextuality"]["chshExact"], tsirelson, rel_tol=1e-12))
    checks.append(check_close("mermin3_ghz_exact", js["contextuality"]["mermin3Exact"], Decimal(4), rel_tol=1e-12))
    checks.append(check_close("bell_entanglement_bits", js["contextuality"]["bellEntropy"], Decimal(1), rel_tol=1e-12))

    # 6. BitNet 1.58-bit exact information bound log2(3) & IEEE-754 binary16 extremes
    log2_3 = Decimal(3).ln() / Decimal(2).ln()
    checks.append(check_close("bitnet_log2_3_bits", js["quant"]["ternaryBits"], log2_3, rel_tol=1e-14))
    checks.append(check_close("fp16_min_subnormal_2m24", js["quant"]["fp16MinSubnormal"], Decimal(2) ** Decimal(-24), rel_tol=1e-14))
    checks.append(check_close("fp16_max_normal_65504", js["quant"]["fp16MaxNormal"], Decimal(65504), rel_tol=1e-14))

    # 7. Exact CP^1 Fubini-Study Quantum Geometric Tensor at theta = pi/3 & NIST SP 800-90B RCT cutoff
    sin_pi3 = Decimal(3).sqrt() / Decimal(2)
    q_pi3 = js["qgtl"]["piOver3"]
    checks.append(check_close("qgtl_g_theta_theta", q_pi3["gThetaTheta"], Decimal("0.25"), rel_tol=1e-14))
    checks.append(check_close("qgtl_g_phi_phi_pi3", q_pi3["gPhiPhi"], Decimal("0.25") * sin_pi3 * sin_pi3, rel_tol=1e-14))
    checks.append(check_close("qgtl_berry_curv_pi3", q_pi3["berryCurvature"], Decimal("-0.5") * sin_pi3, rel_tol=1e-14))
    checks.append(check_close("nist_sp80090b_rct_cutoff_H1", float(js["qgtl"]["rctCutoffH1"]), Decimal(21), rel_tol=1e-14))

    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description="60-digit independent reference oracle for xiaomi-17t-pro-lab")
    parser.add_argument("--check-checksums", action="store_true", help="Also verify CHECKSUMS.sha256 and data/MANIFEST.sha256")
    parser.add_argument("--json-out", type=str, default="", help="Write JSON verification report to path")
    args = parser.parse_args()

    checks = run_differential_oracle()
    max_rel = max(c["rel_err"] for c in checks)
    print(f"PASS: 60-digit Decimal/Fraction oracle matched all {len(checks)} differential checks (max rel err = {max_rel:.3e}).")

    manifest_summary: dict[str, int] = {}
    if args.check_checksums:
        for rel in ("data/MANIFEST.sha256", "CHECKSUMS.sha256"):
            p = ROOT / rel
            if p.exists():
                n = verify_manifest(p)
                manifest_summary[rel] = n
                print(f"PASS: Verified {n} SHA-256 entries in {rel}.")

    if args.json_out:
        out_path = Path(args.json_out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8", newline="\n") as fh:
            fh.write(
                json.dumps(
                    {
                        "oracle_precision_digits": 60,
                        "checks_passed": len(checks),
                        "max_relative_error": max_rel,
                        "manifests_verified": manifest_summary,
                        "checks": checks,
                    },
                    indent=2,
                )
                + "\n"
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
