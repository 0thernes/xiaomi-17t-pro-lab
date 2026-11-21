import { EUV_LAMBDA_NM } from "./constants.js";
import { fftRadix2 } from "./fft.js";
import { mulberry32 } from "./quant.js";

const HC_EV_NM = 1239.8419843320026;
const EV_TO_J = 1.602176634e-19;

/** Photon energy in eV for a given wavelength in nm (EUV 13.5 nm -> 91.840 eV). */
export function euvPhotonEnergyEv(lambdaNm = EUV_LAMBDA_NM) {
  return HC_EV_NM / lambdaNm;
}

/**
 * Exact 2x2 optical transfer-matrix reflectivity for a Mo/Si Bragg multilayer
 * mirror at normal incidence around 13.5 nm (Henke / CXRO optical constants:
 * Mo delta=0.0762, beta=0.0064; Si delta=0.0010, beta=0.0018).
 */
export function braggReflectivityAt(lambdaNm, { pairs = 40, dNm = 6.92, gamma = 0.4 } = {}) {
  const nMoRe = 1 - 0.0762;
  const nMoIm = 0.0064;
  const nSiRe = 1 - 0.001;
  const nSiIm = 0.0018;
  const dMo = dNm * gamma;
  const dSi = dNm * (1 - gamma);
  const k0 = (2 * Math.PI) / lambdaNm;

  // Complex helpers: [re, im]
  const cMul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const cSub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cDiv = (a, b) => {
    const den = b[0] * b[0] + b[1] * b[1];
    return [(a[0] * b[0] + a[1] * b[1]) / den, (a[1] * b[0] - a[0] * b[1]) / den];
  };
  const cCos = (z) => [Math.cos(z[0]) * Math.cosh(z[1]), -Math.sin(z[0]) * Math.sinh(z[1])];
  const cSin = (z) => [Math.sin(z[0]) * Math.cosh(z[1]), Math.cos(z[0]) * Math.sinh(z[1])];
  const mMul = (A, B) => [
    cAdd(cMul(A[0], B[0]), cMul(A[1], B[2])),
    cAdd(cMul(A[0], B[1]), cMul(A[1], B[3])),
    cAdd(cMul(A[2], B[0]), cMul(A[3], B[2])),
    cAdd(cMul(A[2], B[1]), cMul(A[3], B[3])),
  ];

  function layerMatrix(nRe, nIm, thick) {
    const n = [nRe, nIm];
    const phi = [k0 * nRe * thick, k0 * nIm * thick];
    const c = cCos(phi);
    const s = cSin(phi);
    // Standard e^{-iwt} characteristic matrix uses -i * sin(phi) with n = (1 - delta) + i*beta
    const negIS = [s[1], -s[0]];
    return [c, cDiv(negIS, n), cMul(negIS, n), c];
  }

  const mMo = layerMatrix(nMoRe, nMoIm, dMo);
  const mSi = layerMatrix(nSiRe, nSiIm, dSi);
  const pairM = mMul(mMo, mSi);

  let M = [
    [1, 0],
    [0, 0],
    [0, 0],
    [1, 0],
  ];
  for (let i = 0; i < pairs; i++) M = mMul(M, pairM);

  // Incident vacuum n0 = 1, substrate Si ns = [nSiRe, nSiIm]
  const ns = [nSiRe, nSiIm];
  const m00 = M[0];
  const m01ns = cMul(M[1], ns);
  const m10 = M[2];
  const m11ns = cMul(M[3], ns);
  const num = cSub(cAdd(m00, m01ns), cAdd(m10, m11ns));
  const den = cAdd(cAdd(m00, m01ns), cAdd(m10, m11ns));
  const r = cDiv(num, den);
  return Math.min(1, Math.max(0, r[0] * r[0] + r[1] * r[1]));
}

export function braggSpectrum({ pairs = 40, dNm = 6.92, gamma = 0.4, samples = 81 } = {}) {
  const out = [];
  let peakR = 0;
  let peakLambda = 13.5;
  for (let i = 0; i < samples; i++) {
    const lambdaNm = 12.6 + (i / (samples - 1)) * 1.8;
    const R = braggReflectivityAt(lambdaNm, { pairs, dNm, gamma });
    if (R > peakR) {
      peakR = R;
      peakLambda = lambdaNm;
    }
    out.push({ lambdaNm, R });
  }
  const rAt135 = braggReflectivityAt(EUV_LAMBDA_NM, { pairs, dNm, gamma });
  return {
    points: out,
    peakR,
    peakLambda,
    rAt135,
    elevenMirrorTransmission: rAt135 ** 11,
  };
}

/** Depth of focus DOF = k2 * lambda / NA^2 (nm). */
export function depthOfFocusNm(na, k2 = 0.5, lambdaNm = EUV_LAMBDA_NM) {
  return (k2 * lambdaNm) / (na * na);
}

/**
 * 1D Abbe partially coherent aerial image with optical defocus phase error
 * exp(i * pi * lambda * z * f^2) and selectable illuminator pupil
 * ("conventional", "annular", "dipole").
 */
export function aerialImageDefocus({
  na,
  pitchNm,
  duty = 0.5,
  sigma = 0.5,
  defocusNm = 0,
  illuminator = "conventional",
  lambdaNm = EUV_LAMBDA_NM,
  n = 256,
  periods = 4,
}) {
  const mask = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const phase = ((i / n) * periods) % 1;
    mask[i] = phase < duty ? 1 : 0;
  }
  const re = Float64Array.from(mask);
  const im = new Float64Array(n);
  fftRadix2(re, im, false);

  const extentNm = pitchNm * periods;
  const cutoff = na / lambdaNm;
  const fMax = sigma * cutoff;

  let sources = [0];
  if (sigma > 1e-6) {
    if (illuminator === "dipole") {
      sources = [-fMax * 0.85, -fMax * 0.72, fMax * 0.72, fMax * 0.85];
    } else if (illuminator === "annular") {
      sources = [-fMax, -fMax * 0.78, -fMax * 0.62, fMax * 0.62, fMax * 0.78, fMax];
    } else {
      const m = 9;
      sources = [];
      for (let s = 0; s < m; s++) sources.push(((2 * s) / (m - 1) - 1) * fMax);
    }
  }

  const intensity = new Float64Array(n);
  for (const fs of sources) {
    const fre = new Float64Array(n);
    const fim = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      const signedK = k <= n / 2 ? k : k - n;
      const f = signedK / extentNm;
      const fp = f + fs;
      if (Math.abs(fp) <= cutoff + 1e-12) {
        // Paraxial defocus phase: phi = pi * lambda * z * fp^2
        const phi = Math.PI * lambdaNm * defocusNm * fp * fp;
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        fre[k] = re[k] * c - im[k] * s;
        fim[k] = re[k] * s + im[k] * c;
      }
    }
    fftRadix2(fre, fim, true);
    for (let i = 0; i < n; i++) {
      intensity[i] += fre[i] * fre[i] + fim[i] * fim[i];
    }
  }
  const inv = 1 / sources.length;
  let iMax = -Infinity;
  let iMin = Infinity;
  for (let i = 0; i < n; i++) {
    intensity[i] *= inv;
    if (intensity[i] > iMax) iMax = intensity[i];
    if (intensity[i] < iMin) iMin = intensity[i];
  }
  const contrast = iMax + iMin > 0 ? (iMax - iMin) / (iMax + iMin) : 0;
  return {
    mask,
    intensity,
    extentNm,
    iMax,
    iMin,
    contrast,
    cutoffPerNm: cutoff,
    firstOrderPerNm: 1 / pitchNm,
    firstOrderPassesCoherent: 1 / pitchNm <= cutoff + 1e-12,
    dofNm: depthOfFocusNm(na, 0.5, lambdaNm),
  };
}

function samplePoisson(mean, rng) {
  if (mean <= 0) return 0;
  if (mean < 30) {
    const L = Math.exp(-mean);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= rng();
    } while (p > L);
    return k - 1;
  }
  // Box-Muller Gaussian approximation for large lambda
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(mean + Math.sqrt(mean) * z));
}

/**
 * 2D EUV Photon Shot-Noise & Stochastic Line-Edge Roughness (LER) simulator.
 * Computes exact photon counts per pixel at 13.5 nm (91.84 eV/photon) vs 193 nm ArF (6.42 eV/photon),
 * applies Poisson absorption + resist acid-diffusion blur, and extracts 3-sigma LER in nm.
 */
export function simulateStochasticResist({
  intensity1d,
  extentNm,
  doseMjCm2 = 30,
  rows = 48,
  threshold = 0.35,
  lambdaNm = EUV_LAMBDA_NM,
  seed = 17,
}) {
  const cols = intensity1d.length;
  const pixelNm = extentNm / cols;
  const pixelAreaM2 = pixelNm * 1e-9 * (pixelNm * 1e-9);
  const doseJm2 = doseMjCm2 * 10; // 1 mJ/cm^2 = 10 J/m^2
  const photonJ = euvPhotonEnergyEv(lambdaNm) * EV_TO_J;
  const incidentPhotonsPerPixel = (doseJm2 * pixelAreaM2) / photonJ;
  // ~20% EUV resist absorption quantum yield in thin CAR film
  const absorbedMeanAtUnit = incidentPhotonsPerPixel * 0.25;
  const rng = mulberry32(seed);

  const field = new Float32Array(rows * cols);
  const resist = new Uint8Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const mean = absorbedMeanAtUnit * intensity1d[c];
      const count = samplePoisson(mean, rng);
      field[r * cols + c] = absorbedMeanAtUnit > 0 ? count / absorbedMeanAtUnit : 0;
    }
  }
  // 3x3 acid-diffusion kernel (chemical amplification blur)
  const edges = [];
  for (let r = 0; r < rows; r++) {
    let firstEdge = -1;
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      let w = 0;
      for (let dr = -1; dr <= 1; dr++) {
        const rr = Math.min(rows - 1, Math.max(0, r + dr));
        for (let dc = -1; dc <= 1; dc++) {
          const cc = (c + dc + cols) % cols;
          const weight = dr === 0 && dc === 0 ? 4 : dr === 0 || dc === 0 ? 2 : 1;
          sum += field[rr * cols + cc] * weight;
          w += weight;
        }
      }
      const val = sum / w;
      resist[r * cols + c] = val >= threshold ? 1 : 0;
      if (firstEdge < 0 && c > 2 && c < cols / 2 && resist[r * cols + c] !== resist[r * cols + c - 1]) {
        firstEdge = c * pixelNm;
      }
    }
    if (firstEdge >= 0) edges.push(firstEdge);
  }
  let meanEdge = 0;
  for (const e of edges) meanEdge += e;
  meanEdge /= Math.max(1, edges.length);
  let variance = 0;
  for (const e of edges) variance += (e - meanEdge) ** 2;
  const sigmaNm = Math.sqrt(variance / Math.max(1, edges.length));

  const arfPhotonsPerPixel = (doseJm2 * pixelAreaM2) / (euvPhotonEnergyEv(193.3) * EV_TO_J);
  return {
    rows,
    cols,
    pixelNm,
    resist,
    incidentPhotonsPerPixel,
    photonsPerNm2: (doseJm2 * 1e-18) / photonJ,
    arfToEuvPhotonRatio: arfPhotonsPerPixel / Math.max(1e-12, incidentPhotonsPerPixel),
    ler3SigmaNm: 3 * sigmaNm,
  };
}
