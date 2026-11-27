import { el, kv, note, panel, rangeControl, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { sceneLitho } from "../graphics/pu-scenes.js";
import { makeMaterials, mountView } from "../graphics/view.js";
import { mountSketch } from "../p5-loader.js";
import { provCited, provComputed } from "../provenance.js";
import { EUV_LAMBDA_NM, NA_HIGH, NA_LOW } from "../sim/constants.js";
import {
  aerialImageDefocus,
  braggSpectrum,
  euvPhotonEnergyEv,
  simulateStochasticResist,
} from "../sim/litho-advanced.js";
import { simulateLitho2d } from "../sim/litho-2d.js";
import { euvReference, rayleighCd } from "../sim/rayleigh.js";

const ASML = "https://www.asml.com/en/technology/lithography-principles/rayleigh-criterion";

export async function mount(main, { cap }) {
  const ref = euvReference();
  const photonEv = euvPhotonEnergyEv(EUV_LAMBDA_NM);

  // 3D EUV Optical Column Stage
  const stage = el("div", { class: "stage compact" });
  const canvas = el("canvas", { "aria-label": "3D ASML NXE 0.33 NA EUV reflective lithography column" });
  stage.append(
    canvas,
    el("div", { class: "stage-hud-top" }, [
      el("div", { class: "hud-chip" }, ["SOURCE ", el("b", {}, ["Sn LPP 13.5 nm · 91.84 eV"])]),
      el("div", { class: "hud-chip" }, ["TSMC N3P ", el("b", {}, ["0.33 NA LOW-NA · 48 nm CPP · 23 nm M0"])]),
    ]),
  );

  let view = null;
  try {
    view = await mountView(canvas, cap);
    const litho3d = sceneLitho(makeMaterials(cap.tier));
    view.root.add(litho3d.group);
    view.frame(litho3d.group, 0.86);
    view.setFrame(() => litho3d.update(0.016));
  } catch (err) {
    stage.append(note(`3D optics unavailable: ${err.message}`));
  }

  // Interactive Controls
  const naSel = el("select", { "aria-label": "Numerical aperture" }, [
    el("option", { value: String(NA_LOW) }, ["0.33 NA (NXE — TSMC N3P tool)"]),
    el("option", { value: String(NA_HIGH) }, ["0.55 High-NA (EXE — contrast only, not N3P)"]),
  ]);
  const illumSel = el("select", { "aria-label": "Illuminator pupil mode" }, [
    el("option", { value: "conventional" }, ["Conventional Disk Pupil"]),
    el("option", { value: "annular", selected: true }, ["Annular Off-Axis Illumination"]),
    el("option", { value: "quadrupole" }, ["Quadrupole Off-Axis Illumination"]),
    el("option", { value: "dipole" }, ["Dipole (Extreme Resolution Enhancement)"]),
  ]);
  const patternSel = el("select", { "aria-label": "2D wafer mask layout" }, [
    el("option", { value: "sram6t", selected: true }, ["6T SRAM Bitcell (N3P M0/Poly)"]),
    el("option", { value: "elbow" }, ["L-Bend Interconnect Corner (OPC Test)"]),
    el("option", { value: "contacts" }, ["3×3 Via0 Contact Hole Array"]),
    el("option", { value: "lines" }, ["48 nm CPP Line/Space Tip-to-Tip"]),
  ]);
  let opcEnabled = false;
  const opcBtn = el("button", { type: "button", class: "swatch", "aria-pressed": "false" }, [
    "OPC Hammerhead Serifs: OFF",
  ]);
  opcBtn.addEventListener("click", () => {
    opcEnabled = !opcEnabled;
    opcBtn.textContent = opcEnabled ? "OPC Hammerhead Serifs: ON" : "OPC Hammerhead Serifs: OFF";
    opcBtn.setAttribute("aria-pressed", opcEnabled ? "true" : "false");
    recompute2d();
  });
  const k1Ctrl = rangeControl("Rayleigh k1 Factor", 0.25, 0.75, 0.01, 0.36, (v) => v.toFixed(2));
  const pitchCtrl = rangeControl("Mask Pitch (nm)", 16, 100, 1, 36, (v) => `${v} nm`);
  const sigmaCtrl = rangeControl("Partial Coherence σ", 0, 0.9, 0.05, 0.65, (v) => v.toFixed(2));
  const defocusCtrl = rangeControl("Wafer Defocus z (nm)", -120, 120, 5, 0, (v) => `${v} nm`);
  const doseCtrl = rangeControl("EUV Dose (mJ/cm²)", 10, 80, 2, 30, (v) => `${v} mJ/cm²`);
  const pairsCtrl = rangeControl("Mo/Si Bragg Bilayers", 10, 60, 2, 40, (v) => `${v} pairs`);

  const readouts = el("div");
  const aerialHost = el("div", { class: "plot" });
  const fourier2dHost = el("div", { class: "plot" });
  const fourier2dMeta = el("div");
  const resistHost = el("div", { class: "plot" });
  const resistMeta = el("div");
  const braggHost = el("div", { class: "plot" });
  const braggMeta = el("div");

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["13.5 nm EUV · 91.84 eV PHOTONS"]),
      el("span", {}, ["ABBE PARTIAL COHERENCE · MO/SI BRAGG OPTICS · POISSON SHOT NOISE"]),
    ]),
    el("h1", {}, ["EUV Lithography — Optics, Bragg Mirrors & Photon Stochastics"]),
    el("p", { class: "lede" }, [
      "Dimensity 9500 is fabricated on TSMC N3P using 0.33 NA 13.5 nm EUV scanners (High-NA 0.55 is shown only for contrast). Because EUV is absorbed by all glass and air, photons bounce off 40-pair Mo/Si Bragg mirrors in vacuum and suffer 14.3× higher shot noise than 193 nm ArF.",
    ]),
    readoutGrid([
      readout("EUV Wavelength", `${EUV_LAMBDA_NM}`, "nm", { tone: "cyan", sub: `${fmt(photonEv, 4)} eV / photon` }),
      readout("Physical k1=0.25", "10.23 / 6.14", "nm", { tone: "accent", sub: "0.33 NA vs 0.55 High-NA" }),
      readout("N3P CPP / M0", "48 / 23", "nm", { tone: "ok", sub: "Cited N3E/N3P design rules" }),
      readout("ArF / EUV Photons", "14.3×", "fewer", { tone: "warn", sub: "at identical mJ/cm² dose" }),
    ]),
    stage,
    panel(
      "2D Fourier Optics Mask → Pupil Diffraction → Aerial Image → Wafer Resist (+ OPC)",
      [el("div", { class: "chips" }, [patternSel, opcBtn]), fourier2dHost, fourier2dMeta],
      null,
      "LIVE 2D RADIX-2 FFT · ZERNIKE DEFOCUS",
    ),
    el("div", { class: "grid cols-2" }, [
      panel(
        "Abbe Partial-Coherence & Defocus Scanner Controls",
        [
          el("div", { class: "chips" }, [naSel, illumSel]),
          k1Ctrl.node,
          pitchCtrl.node,
          sigmaCtrl.node,
          defocusCtrl.node,
          readouts,
          kv(
            "ASML Published CD",
            el("span", {}, [
              `${ref.asmlLowNaNm} nm (0.33 NA) · ${ref.asmlHighNaNm} nm (0.55 NA) `,
              provCited({ value: ref.asmlLowNaNm, status: "confirmed", source: ASML }),
            ]),
          ),
        ],
        null,
        "RAYLEIGH + DEFOCUS",
      ),
      panel("Live Aerial Image vs Mask + Defocus Contrast", [aerialHost], null, "LIVE FFT PUPIL FILTER"),
    ]),
    el("div", { class: "grid cols-2" }, [
      panel(
        "2D EUV Photon Shot Noise & Stochastic Line-Edge Roughness",
        [doseCtrl.node, resistHost, resistMeta],
        null,
        "POISSON QUANTUM NOISE",
      ),
      panel(
        "Mo/Si Bragg Multilayer Mirror Reflectivity (2×2 Transfer Matrix)",
        [pairsCtrl.node, braggHost, braggMeta],
        null,
        "HENKE CXRO CONSTANTS",
      ),
    ]),
  );

  const fourier2dSketch = await mountSketch(fourier2dHost, drawFourier2d, { height: 220 });
  const aerialSketch = await mountSketch(aerialHost, drawAerial, { height: 260 });
  const resistSketch = await mountSketch(resistHost, drawResist, { height: 220 });
  const braggSketch = await mountSketch(braggHost, drawBragg, { height: 220 });

  function recompute2d() {
    const na = Number(naSel.value);
    const sigma = Number(sigmaCtrl.input.value);
    const defocusNm = Number(defocusCtrl.input.value);
    const illuminator = illumSel.value;
    const pattern = patternSel.value;
    const res = simulateLitho2d({ pattern, opc: opcEnabled, na, sigma, defocusNm, illuminator, fieldNm: 160, n: 64 });
    fourier2dMeta.replaceChildren(
      kv(
        "Wafer Pattern Fidelity (IoU vs Target)",
        el("span", {}, [
          `${(res.fidelityIoU * 100).toFixed(1)}% (${opcEnabled ? "OPC Serifs ON" : "No OPC"}) · 2D Contrast ${fmt(res.contrast, 3)} `,
          provComputed(`64×64 2D FFT · NA=${na} · ${illuminator} · z=${defocusNm} nm`),
        ]),
      ),
    );
    fourier2dSketch.setState({ res, opcEnabled, na });
  }

  function recomputeOptics() {
    const na = Number(naSel.value);
    const k1 = Number(k1Ctrl.input.value);
    const pitchNm = Number(pitchCtrl.input.value);
    const sigma = Number(sigmaCtrl.input.value);
    const defocusNm = Number(defocusCtrl.input.value);
    const illuminator = illumSel.value;
    const doseMjCm2 = Number(doseCtrl.input.value);

    const cd = rayleighCd(k1, na, EUV_LAMBDA_NM);
    const image = aerialImageDefocus({ na, pitchNm, duty: 0.5, sigma, defocusNm, illuminator, n: 256, periods: 4 });
    const stoch = simulateStochasticResist({
      intensity1d: image.intensity,
      extentNm: image.extentNm,
      doseMjCm2,
      rows: 48,
      threshold: 0.38,
    });

    readouts.replaceChildren(
      kv("CD = k1 λ / NA", el("span", {}, [`${fmt(cd, 4)} nm `, provComputed(`${k1} × 13.5 / ${na}`)])),
      kv(
        "Depth of Focus (k2=0.5)",
        el("span", {}, [`${fmt(image.dofNm, 4)} nm `, provComputed(`0.5 × 13.5 / ${na}²`)]),
      ),
      kv(
        "Michelson Contrast",
        el("span", {}, [
          `${fmt(image.contrast, 4)} `,
          provComputed(`(Imax − Imin) / (Imax + Imin) at z=${defocusNm} nm`),
        ]),
      ),
      kv(
        "First Diffracted Order",
        image.firstOrderPassesCoherent ? "passes coherent pupil" : "blocked coherently (needs off-axis σ)",
      ),
    );

    resistMeta.replaceChildren(
      kv(
        "EUV Flux Density",
        el("span", {}, [
          `${fmt(stoch.photonsPerNm2, 3)} photons / nm² `,
          provComputed(`${doseMjCm2} mJ/cm² ÷ 91.84 eV`),
        ]),
      ),
      kv(
        "Measured Stochastic 3σ LER",
        el("span", {}, [`${fmt(stoch.ler3SigmaNm, 3)} nm `, provComputed("Poisson shot-noise + 3×3 CAR acid blur")]),
      ),
    );

    aerialSketch.setState({ image, pitchNm, defocusNm });
    resistSketch.setState({ stoch });
    recompute2d();
  }

  function recomputeBragg() {
    const pairs = Number(pairsCtrl.input.value);
    const spec = braggSpectrum({ pairs, dNm: 6.92, gamma: 0.4, samples: 81 });
    braggMeta.replaceChildren(
      kv(
        "Reflectivity at 13.5 nm",
        el("span", {}, [`${(spec.rAt135 * 100).toFixed(2)}% `, provComputed(`2×2 matrix, ${pairs} Mo/Si bilayers`)]),
      ),
      kv(
        "11-Mirror Scanner Throughput",
        el("span", {}, [
          `${(spec.elevenMirrorTransmission * 100).toFixed(2)}% `,
          provComputed("R(13.5 nm)¹¹ — why source needs >250W"),
        ]),
      ),
    );
    braggSketch.setState({ spec, pairs });
  }

  for (const s of [naSel, illumSel]) s.addEventListener("change", recomputeOptics);
  patternSel.addEventListener("change", recompute2d);
  for (const c of [k1Ctrl, pitchCtrl, sigmaCtrl, defocusCtrl, doseCtrl])
    c.input.addEventListener("input", recomputeOptics);
  pairsCtrl.input.addEventListener("input", recomputeBragg);
  recomputeOptics();
  recomputeBragg();

  return {
    dispose() {
      fourier2dSketch.dispose();
      aerialSketch.dispose();
      resistSketch.dispose();
      braggSketch.dispose();
      view?.dispose();
    },
  };
}

function drawAerial(p, state) {
  p.background("#06080c");
  const img = state.image;
  if (!img) return;
  const padL = 22;
  const padR = 16;
  const mid = p.height * 0.44;
  const bot = p.height - 20;

  // Ideal mask (top half)
  p.stroke("#38d4f2");
  p.strokeWeight(1.8);
  p.noFill();
  p.beginShape();
  for (let i = 0; i < img.mask.length; i++) {
    const x = padL + (i / (img.mask.length - 1)) * (p.width - padL - padR);
    p.vertex(x, mid - img.mask[i] * (mid - 26));
  }
  p.endShape();

  // Aerial image with filled glow (bottom half)
  let maxI = 0.01;
  for (const v of img.intensity) maxI = Math.max(maxI, v);
  p.noStroke();
  p.fill("rgba(255, 105, 0, 0.16)");
  p.beginShape();
  p.vertex(padL, bot);
  for (let i = 0; i < img.intensity.length; i++) {
    const x = padL + (i / (img.intensity.length - 1)) * (p.width - padL - padR);
    p.vertex(x, bot - (img.intensity[i] / maxI) * (bot - mid - 24));
  }
  p.vertex(p.width - padR, bot);
  p.endShape(p.CLOSE);

  p.stroke("#ff6900");
  p.strokeWeight(2.4);
  p.noFill();
  p.beginShape();
  for (let i = 0; i < img.intensity.length; i++) {
    const x = padL + (i / (img.intensity.length - 1)) * (p.width - padL - padR);
    p.vertex(x, bot - (img.intensity[i] / maxI) * (bot - mid - 24));
  }
  p.endShape();

  p.noStroke();
  p.fill("#38d4f2");
  p.textSize(10);
  p.text(`BINARY MASK (pitch ${state.pitchNm} nm)`, padL, 14);
  p.fill("#ff6900");
  p.text(
    `AERIAL INTENSITY AT WAFER (defocus ${state.defocusNm} nm · contrast ${img.contrast.toFixed(3)})`,
    padL,
    mid + 14,
  );
}

let _resistOffscreen = null;
let _resistOffCtx = null;
let _resistOffImg = null;

function drawResist(p, state) {
  p.background("#06080c");
  const st = state.stoch;
  if (!st) return;
  if (!_resistOffscreen || _resistOffscreen.width !== st.cols || _resistOffscreen.height !== st.rows) {
    _resistOffscreen = document.createElement("canvas");
    _resistOffscreen.width = st.cols;
    _resistOffscreen.height = st.rows;
    _resistOffCtx = _resistOffscreen.getContext("2d");
    _resistOffImg = _resistOffCtx.createImageData(st.cols, st.rows);
  }
  const d = _resistOffImg.data;
  const n = st.rows * st.cols;
  for (let i = 0; i < n; i++) {
    const o = i << 2;
    if (st.resist[i]) {
      d[o] = 25;
      d[o + 1] = 41;
      d[o + 2] = 63;
    } else {
      d[o] = 255;
      d[o + 1] = 105;
      d[o + 2] = 0;
    }
    d[o + 3] = 255;
  }
  _resistOffCtx.putImageData(_resistOffImg, 0, 0);
  const ctx = p.drawingContext;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_resistOffscreen, 12, 22, p.width - 24, p.height - 34);

  p.noStroke();
  p.fill("#eef3fa");
  p.textSize(10);
  p.text(`TOP-DOWN DEVELOPED RESIST (orange = fin/metal line · 3σ LER = ${st.ler3SigmaNm.toFixed(2)} nm)`, 12, 14);
}

function drawBragg(p, state) {
  p.background("#06080c");
  const spec = state.spec;
  if (!spec) return;
  const padL = 42;
  const padR = 16;
  const padT = 22;
  const padB = 28;
  const w = p.width - padL - padR;
  const h = p.height - padT - padB;

  p.stroke("#1a2434");
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * h;
    p.line(padL, y, padL + w, y);
  }
  // 13.5 nm vertical line
  const x135 = padL + ((13.5 - 12.6) / 1.8) * w;
  p.stroke("rgba(56,212,242,0.5)");
  p.line(x135, padT, x135, padT + h);

  p.stroke("#a78bfa");
  p.strokeWeight(2.4);
  p.noFill();
  p.beginShape();
  for (const pt of spec.points) {
    const x = padL + ((pt.lambdaNm - 12.6) / 1.8) * w;
    const y = padT + h - pt.R * h;
    p.vertex(x, y);
  }
  p.endShape();

  p.noStroke();
  p.fill("#9fb0c8");
  p.textSize(10);
  p.text(`Mo/Si Bragg Reflectivity (${state.pairs} pairs · peak ${(spec.peakR * 100).toFixed(1)}%)`, padL, 14);
  p.fill("#38d4f2");
  p.text("13.5 nm", x135 + 4, padT + 14);
  p.fill("#6f819c");
  p.text("12.6 nm", padL, p.height - 8);
  p.textAlign(p.RIGHT);
  p.text("14.4 nm", padL + w, p.height - 8);
}

let _fourierOff = null;
let _fourierOffCtx = null;
let _fourierImg = null;

function drawFourier2d(p, state) {
  p.background("#06080c");
  const res = state.res;
  if (!res) return;
  const n = res.n;
  const titles = [
    state.opcEnabled ? "1. Mask + OPC Serifs" : "1. Binary Mask (No OPC)",
    "2. 2D Pupil Diffraction |F|",
    `3. Aerial I(x,y) · ${state.na} NA`,
    `4. Resist Print (IoU ${(res.fidelityIoU * 100).toFixed(0)}%)`,
  ];
  const gap = 12;
  const padX = 12;
  const padTop = 24;
  const boxSize = Math.max(64, Math.min(p.height - padTop - 10, (p.width - padX * 2 - gap * 3) / 4));
  const totalW = boxSize * 4 + gap * 3;
  const startX = (p.width - totalW) / 2;

  const panels = [
    { data: res.mask, mode: "mask" },
    { data: res.spectrumLog, mode: "pupil" },
    { data: res.aerial, mode: "aerial" },
    { data: res.resist, mode: "resist" },
  ];

  if (!_fourierOff || _fourierOff.width !== n || _fourierOff.height !== n) {
    _fourierOff = document.createElement("canvas");
    _fourierOff.width = _fourierOff.height = n;
    _fourierOffCtx = _fourierOff.getContext("2d");
    _fourierImg = _fourierOffCtx.createImageData(n, n);
  }
  const ctx = p.drawingContext;
  p.textAlign(p.LEFT);
  for (let idx = 0; idx < 4; idx++) {
    const ox = startX + idx * (boxSize + gap);
    const oy = padTop;
    const d = _fourierImg.data;
    const arr = panels[idx].data;
    const mode = panels[idx].mode;

    for (let i = 0; i < n * n; i++) {
      const v = arr[i];
      const o = i * 4;
      if (mode === "mask") {
        const diffOpc = state.opcEnabled && v !== res.targetMask[i];
        if (diffOpc) {
          d[o] = 255;
          d[o + 1] = 122;
          d[o + 2] = 26;
        } else if (v > 0.5) {
          d[o] = 56;
          d[o + 1] = 212;
          d[o + 2] = 242;
        } else {
          d[o] = 10;
          d[o + 1] = 14;
          d[o + 2] = 24;
        }
      } else if (mode === "pupil") {
        d[o] = Math.round(14 + v * 165);
        d[o + 1] = Math.round(18 + v * 120);
        d[o + 2] = Math.round(42 + v * 213);
      } else if (mode === "aerial") {
        const u = Math.max(0, Math.min(1, v));
        d[o] = Math.round(10 + u * 245);
        d[o + 1] = Math.round(12 + u * u * 155);
        d[o + 2] = Math.round(24 + (1 - u) * u * 180);
      } else {
        const ideal = res.targetMask[i] >= 0.5;
        if (v && ideal) {
          d[o] = 74;
          d[o + 1] = 222;
          d[o + 2] = 128;
        } else if (v && !ideal) {
          d[o] = 255;
          d[o + 1] = 105;
          d[o + 2] = 0;
        } else if (!v && ideal) {
          d[o] = 244;
          d[o + 1] = 63;
          d[o + 2] = 94;
        } else {
          d[o] = 10;
          d[o + 1] = 14;
          d[o + 2] = 22;
        }
      }
      d[o + 3] = 255;
    }

    _fourierOffCtx.putImageData(_fourierImg, 0, 0);
    ctx.imageSmoothingEnabled = mode === "aerial";
    ctx.drawImage(_fourierOff, ox, oy, boxSize, boxSize);

    p.noFill();
    p.stroke("rgba(255,255,255,0.16)");
    p.strokeWeight(1);
    p.rect(ox, oy, boxSize, boxSize);

    p.noStroke();
    p.fill("#d5e2f5");
    p.textSize(10);
    p.text(titles[idx], ox, oy - 7);
  }
}
