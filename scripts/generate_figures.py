#!/usr/bin/env python3
"""
Generate reproducible publication-grade vector PDF figures for paper/main.tex
and the 1280x640 social preview PNG (docs/media/social-preview.png, Build Standard A26)
directly from live JS solver outputs and verified results/*.json.
"""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FIG_DIR = ROOT / "paper" / "figures"
MEDIA_DIR = ROOT / "docs" / "media"
FIG_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Clean academic publication styling
plt.rcParams.update(
    {
        "font.family": "DejaVu Sans",
        "font.size": 9.5,
        "axes.titlesize": 10.5,
        "axes.labelsize": 9.5,
        "axes.grid": True,
        "grid.alpha": 0.25,
        "grid.linestyle": "--",
        "axes.spines.top": False,
        "axes.spines.right": False,
        "pdf.fonttype": 42,
        "ps.fonttype": 42,
    }
)


def fetch_solver_curves() -> dict:
    js = r"""
import { braggSpectrum, aerialImageDefocus, simulateStochasticResist } from "./src/sim/litho-advanced.js";
import { simulateSustainedThrottle } from "./src/sim/thermal-fdtd.js";
import { MEMORY_PROFILES, rooflinePoint, llmDecodeCeiling } from "./src/sim/memory-model.js";
import { runChshExperiment, runMermin3Experiment } from "./src/sim/quantum-lab.js";

const bragg = braggSpectrum({ pairs: 40, samples: 121 });
const doses = [10, 15, 20, 30, 45, 60, 80];
const imgLow = aerialImageDefocus({ na: 0.33, pitchNm: 30, sigma: 0.55, illuminator: "conventional" });
const imgHigh = aerialImageDefocus({ na: 0.55, pitchNm: 30, sigma: 0.55, illuminator: "conventional" });
const lerLow = doses.map(d => {
  let s = 0;
  for (let k = 0; k < 12; k++) s += simulateStochasticResist({ intensity1d: imgLow.intensity, extentNm: imgLow.extentNm, doseMjCm2: d, seed: 100 + k * 37 }).ler3SigmaNm;
  return s / 12;
});
const lerHigh = doses.map(d => {
  let s = 0;
  for (let k = 0; k < 12; k++) s += simulateStochasticResist({ intensity1d: imgHigh.intensity, extentNm: imgHigh.extentNm, doseMjCm2: d, seed: 100 + k * 37 }).ler3SigmaNm;
  return s / 12;
});

const thermal = simulateSustainedThrottle({ minutes: 20, ambientC: 25, profileId: "gaming_nomad" });

const ais = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
const roof17t = ais.map(ai => rooflinePoint({ ai, peakGflops: 5270, bwGBps: MEMORY_PROFILES.xiaomi17tPro.bwGBps }).achievableGflops);
const roofMax = ais.map(ai => rooflinePoint({ ai, peakGflops: 5270, bwGBps: MEMORY_PROFILES.d9500Max.bwGBps }).achievableGflops);
const quantBits = [
  { label: "FP16 (16b)", bits: 16 },
  { label: "INT8 (8b)", bits: 8 },
  { label: "INT4 (4b)", bits: 4 },
  { label: "BitNet 1.58b", bits: Math.log2(3) },
];
const decodeRates = quantBits.map(q => ({
  label: q.label,
  tok2B: llmDecodeCeiling({ paramsBillions: 2.0, bitsPerWeight: q.bits, bwGBps: 76.8, utilization: 0.72 }).ceilingTokPerSec,
  tok8B: llmDecodeCeiling({ paramsBillions: 8.0, bitsPerWeight: q.bits, bwGBps: 76.8, utilization: 0.72 }).ceilingTokPerSec,
}));

const angles = [];
const chshS = [];
for (let deg = 0; deg <= 90; deg += 2.5) {
  angles.push(deg);
  chshS.push(runChshExperiment({ shots: 0, angleDeg: deg }).sExact);
}
const phases = [];
const merminM = [];
for (let deg = 0; deg <= 180; deg += 5) {
  phases.push(deg);
  merminM.push(runMermin3Experiment({ shots: 0, phaseDeg: deg }).mExact);
}

process.stdout.write(JSON.stringify({ bragg, doses, lerLow, lerHigh, thermal, ais, roof17t, roofMax, decodeRates, angles, chshS, phases, merminM }));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", js],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(proc.stdout)


def make_fig1_euv(data: dict) -> None:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9.4, 3.6))

    lam = [pt["lambdaNm"] for pt in data["bragg"]["points"]]
    refl = [pt["R"] * 100 for pt in data["bragg"]["points"]]
    ax1.plot(lam, refl, color="#0b6bcb", lw=2.0, label="40-pair Mo/Si Bragg R(λ)")
    ax1.axvline(13.5, color="#e65100", ls="--", lw=1.2, label=f"13.5 nm (R = {data['bragg']['rAt135']*100:.1f}%)")
    ax1.fill_between(lam, 0, refl, color="#0b6bcb", alpha=0.10)
    ax1.set_title("(a) 40-Bilayer Mo/Si EUV Mirror Reflectivity")
    ax1.set_xlabel("Wavelength λ (nm)")
    ax1.set_ylabel("Normal-Incidence Reflectivity (%)")
    ax1.set_ylim(0, 82)
    ax1.legend(frameon=False, fontsize=8.2)

    ax2.plot(data["doses"], data["lerLow"], "o-", color="#d84315", lw=1.9, label="0.33 NA (NXE, 30 nm pitch)")
    ax2.plot(data["doses"], data["lerHigh"], "s-", color="#00838f", lw=1.9, label="0.55 High-NA (EXE, 30 nm pitch)")
    ax2.set_title("(b) Stochastic Shot-Noise 3σ LER vs. Exposure Dose")
    ax2.set_xlabel("EUV Exposure Dose (mJ/cm²)")
    ax2.set_ylabel("Sub-Pixel 3σ LER (nm, 12-seed mean)")
    ax2.legend(frameon=False, fontsize=8.2)

    fig.tight_layout()
    fig.savefig(FIG_DIR / "fig1_euv_bragg_and_ler.pdf")
    plt.close(fig)


def make_fig2_thermal(data: dict) -> None:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9.4, 3.6))
    t = [p["minute"] for p in data["thermal"]]
    vc_t = [p["vcPeakC"] for p in data["thermal"]]
    no_t = [p["noVcPeakC"] for p in data["thermal"]]
    vc_p = [p["vcPerfPct"] for p in data["thermal"]]
    no_p = [p["noVcPerfPct"] for p in data["thermal"]]

    ax1.plot(t, no_t, "--", color="#c62828", lw=2.0, label="Without Vapor Chamber (uncooled die)")
    ax1.plot(t, vc_t, "-", color="#0277bd", lw=2.2, label="Xiaomi 3D IceLoop LHP VC (5500 mm²)")
    ax1.axhline(84, color="#ef6c00", ls=":", lw=1.2, label="DVFS Throttle Knee (84 °C)")
    ax1.set_title("(a) 20-Minute Sustained Peak Die Temperature")
    ax1.set_xlabel("Simulated Time (minutes, 1200 s exact clock)")
    ax1.set_ylabel("Peak Junction Temperature (°C)")
    ax1.set_ylim(20, 128)
    ax1.legend(frameon=True, facecolor="white", framealpha=0.92, edgecolor="#d0d7de", fontsize=7.8, loc="lower right")

    ax2.plot(t, no_p, "--", color="#c62828", lw=2.0, label="Without Vapor Chamber")
    ax2.plot(t, vc_p, "-", color="#2e7d32", lw=2.2, label="With 3D IceLoop VC")
    ax2.set_title("(b) Sustained DVFS Performance Retention")
    ax2.set_xlabel("Simulated Time (minutes)")
    ax2.set_ylabel("Relative Clock / Perf Retention (%)")
    ax2.set_ylim(45, 108)
    ax2.legend(frameon=True, facecolor="white", framealpha=0.92, edgecolor="#d0d7de", fontsize=8.0, loc="lower right")

    fig.tight_layout()
    fig.savefig(FIG_DIR / "fig2_thermal_fdtd_iceloop.pdf")
    plt.close(fig)


def make_fig3_roofline(data: dict) -> None:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9.4, 3.6))

    ax1.loglog(data["ais"], data["roofMax"], "--", color="#5e35b1", lw=1.8, label="D9500 Max LPDDR5X-10667 (85.34 GB/s)")
    ax1.loglog(data["ais"], data["roof17t"], "-", color="#0277bd", lw=2.2, label="17T Pro LPDDR5X-9600 (76.80 GB/s)")
    ridge = 5270 / 76.8
    ax1.axvline(ridge, color="#ef6c00", ls=":", lw=1.2, label=f"Ridge AI = {ridge:.1f} FLOP/B")
    ax1.set_title("(a) Dimensity 9500 Roofline Ceiling (5.27 TFLOP/s Ref)")
    ax1.set_xlabel("Arithmetic Intensity (FLOP / Byte)")
    ax1.set_ylabel("Achievable Throughput (GFLOP/s)")
    ax1.legend(frameon=False, fontsize=7.8, loc="lower right")

    labels = [r["label"] for r in data["decodeRates"]]
    tok2 = [r["tok2B"] for r in data["decodeRates"]]
    tok8 = [r["tok8B"] for r in data["decodeRates"]]
    x = np.arange(len(labels))
    w = 0.36
    ax2.bar(x - w / 2, tok2, w, color="#0288d1", label="2B Model (LPDDR5X-9600 @ 72% eff)")
    ax2.bar(x + w / 2, tok8, w, color="#ef6c00", label="8B Model (LPDDR5X-9600 @ 72% eff)")
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels, fontsize=8.2)
    ax2.set_title("(b) Bandwidth-Bound Autoregressive LLM Decode Ceiling")
    ax2.set_ylabel("Theoretical Decode Ceiling (tok/s)")
    ax2.legend(frameon=False, fontsize=7.8)

    fig.tight_layout()
    fig.savefig(FIG_DIR / "fig3_roofline_and_memory_wall.pdf")
    plt.close(fig)


def make_fig4_quantum_and_oracle(data: dict) -> None:
    oracle = json.loads((ROOT / "results" / "oracle-60digit.json").read_text(encoding="utf-8"))
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9.4, 3.6))

    ax1.plot(data["angles"], data["chshS"], color="#00695c", lw=2.2, label="Quantum |Φ+⟩ CHSH S(θ)")
    ax1.axhline(2.0, color="#c62828", ls="--", lw=1.3, label="Classical LHV Cap |S| ≤ 2 (Lean Thm 5)")
    ax1.axhline(-2.0, color="#c62828", ls="--", lw=1.3)
    ax1.axhline(2 * math.sqrt(2), color="#6a1b9a", ls=":", lw=1.3, label="Tsirelson 2√2 ≈ 2.8284")
    ax1.scatter([22.5], [2 * math.sqrt(2)], color="#ff6f00", zorder=5, s=36)
    ax1.set_title("(a) Bell |Φ+⟩ CHSH Violation Across Analyzer Angle")
    ax1.set_xlabel("Polarization Angle θ (degrees)")
    ax1.set_ylabel("CHSH Correlation S(θ)")
    ax1.set_ylim(-3.4, 3.3)
    ax1.legend(frameon=True, facecolor="white", framealpha=0.92, edgecolor="#d0d7de", fontsize=7.5, loc="lower left")

    errs = [max(c["rel_err"], 1e-16) for c in oracle["checks"]]
    idx = np.arange(1, len(errs) + 1)
    ax2.semilogy(idx, errs, "o-", ms=3.5, lw=1.1, color="#1565c0", label="JS IEEE-754 vs 60-Digit Decimal Oracle")
    ax2.axhline(1e-12, color="#c62828", ls="--", lw=1.1, label="Verification Threshold (10⁻¹²)")
    ax2.set_title(f"(b) 60-Digit Differential Oracle ({len(errs)} Checks)")
    ax2.set_xlabel("Differential Check Index")
    ax2.set_ylabel("Relative Error |JS − Oracle| / |Oracle|")
    ax2.set_ylim(5e-17, 1e-10)
    ax2.legend(frameon=False, fontsize=7.8)

    fig.tight_layout()
    fig.savefig(FIG_DIR / "fig4_quantum_contextuality_and_oracle.pdf")
    plt.close(fig)


def make_social_preview(data: dict) -> None:
    fig = plt.figure(figsize=(12.8, 6.4), dpi=100, facecolor="#06080c")
    gs = fig.add_gridspec(2, 2, height_ratios=[1.15, 1.85], hspace=0.35, wspace=0.22, left=0.06, right=0.96, top=0.92, bottom=0.10)

    ax_top = fig.add_subplot(gs[0, :])
    ax_top.set_facecolor("#06080c")
    ax_top.axis("off")
    ax_top.text(0.0, 0.78, "XIAOMI 17T PRO LAB  ·  v4.0.0", color="#ff6900", fontsize=15, fontweight="bold")
    ax_top.text(0.0, 0.42, "Dimensity 9500 Catalytic WASM SIMD128 Workbench & 90-Decl Lean 4.35.0 Formal Core", color="#eef3fa", fontsize=18.5, fontweight="bold")
    ax_top.text(
        0.0,
        0.10,
        "19 Routes · 90 Constructive Lean Decls (0 Choice) · 9.4 KiB Rust WASM SIMD128 · 60-Digit Oracle (60/60) · 10/10 Mutants Killed",
        color="#38d4f2",
        fontsize=11.0,
    )

    ax_l = fig.add_subplot(gs[1, 0])
    ax_l.set_facecolor("#0b111c")
    lam = [pt["lambdaNm"] for pt in data["bragg"]["points"]]
    refl = [pt["R"] * 100 for pt in data["bragg"]["points"]]
    ax_l.plot(lam, refl, color="#38d4f2", lw=2.4)
    ax_l.fill_between(lam, 0, refl, color="#38d4f2", alpha=0.16)
    ax_l.axvline(13.5, color="#ff6900", ls="--", lw=1.4)
    ax_l.set_title("40-Bilayer Mo/Si EUV Bragg Mirror (13.5 nm)", color="#eef3fa", fontsize=11)
    ax_l.set_xlabel("Wavelength (nm)", color="#9fb0c8")
    ax_l.set_ylabel("Reflectivity (%)", color="#9fb0c8")
    ax_l.tick_params(colors="#9fb0c8")
    for s in ax_l.spines.values():
        s.set_color("#1e2a3f")

    ax_r = fig.add_subplot(gs[1, 1])
    ax_r.set_facecolor("#0b111c")
    t = [p["minute"] for p in data["thermal"]]
    ax_r.plot(t, [p["noVcPeakC"] for p in data["thermal"]], "--", color="#fb7185", lw=2.2, label="Uncooled Die")
    ax_r.plot(t, [p["vcPeakC"] for p in data["thermal"]], "-", color="#4ade80", lw=2.4, label="3D IceLoop VC")
    ax_r.set_title("2D FDTD Silicon Thermal PDE (20-Min Sustained)", color="#eef3fa", fontsize=11)
    ax_r.set_xlabel("Simulated Time (min)", color="#9fb0c8")
    ax_r.set_ylabel("Peak Junction (°C)", color="#9fb0c8")
    ax_r.tick_params(colors="#9fb0c8")
    ax_r.legend(frameon=False, labelcolor="#eef3fa", fontsize=9.5)
    for s in ax_r.spines.values():
        s.set_color("#1e2a3f")

    fig.savefig(MEDIA_DIR / "social-preview.png", dpi=100, facecolor="#06080c")
    plt.close(fig)


def main() -> int:
    data = fetch_solver_curves()
    make_fig1_euv(data)
    make_fig2_thermal(data)
    make_fig3_roofline(data)
    make_fig4_quantum_and_oracle(data)
    make_social_preview(data)
    print("PASS: Generated 4 vector PDF figures in paper/figures/ and docs/media/social-preview.png (1280x640).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
