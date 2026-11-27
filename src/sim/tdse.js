import { HBAR2_OVER_2M_EV_NM2, HBAR_EV_FS } from "./constants.js";
import { getFastKernelsSync } from "./wasm.js";

/**
 * Exact Unitary 1D Time-Dependent Schrödinger Equation (TDSE) Solver
 * using Implicit Crank-Nicolson + Complex Tridiagonal Thomas Algorithm.
 *
 * Equation: i * hbar * d(psi)/dt = [ - (hbar^2 / 2 m_eff) d^2/dx^2 + V(x) ] psi
 *
 * v4.0.0: Multi-step Thomas sweep accelerated via Rust WASM (`tdse_cn_step_f64`)
 * using zero-allocation Catalytic Arena slicing, with exact JS parity fallback.
 */

export function createWavePacketSim({
  n = 240,
  lengthNm = 12,
  barrierCenterNm = 6.2,
  barrierWidthNm = 0.85,
  barrierHeightEv = 3.1,
  doubleBarrier = false,
  wellGapNm = 1.2,
  mEffRatio = 0.5,
  x0Nm = 2.6,
  sigmaNm = 0.55,
  energyEv = 2.1,
  dtFs = 0.04,
  useWasm = true,
} = {}) {
  if (!Number.isInteger(n) || n < 8) throw new RangeError("grid size n must be an integer >= 8");
  if (!Number.isFinite(lengthNm) || lengthNm <= 0) throw new RangeError("lengthNm must be positive");
  if (!Number.isFinite(mEffRatio) || mEffRatio <= 0) throw new RangeError("mEffRatio must be positive");
  if (!Number.isFinite(dtFs) || dtFs <= 0) throw new RangeError("dtFs must be positive");
  const dx = lengthNm / (n - 1);
  const coeff = HBAR2_OVER_2M_EV_NM2 / mEffRatio; // hbar^2 / (2 m*) in eV * nm^2

  const x = new Float64Array(n);
  const V = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = i * dx;

  // Potential barrier(s)
  let barrierStart = barrierCenterNm - barrierWidthNm / 2;
  let barrierEnd = barrierCenterNm + barrierWidthNm / 2;
  function buildPotential() {
    V.fill(0);
    if (!doubleBarrier) {
      barrierStart = barrierCenterNm - barrierWidthNm / 2;
      barrierEnd = barrierCenterNm + barrierWidthNm / 2;
      for (let i = 0; i < n; i++) {
        if (x[i] >= barrierStart && x[i] <= barrierEnd) V[i] = barrierHeightEv;
      }
    } else {
      const w = Math.max(0.35, barrierWidthNm * 0.65);
      const b1Start = barrierCenterNm - wellGapNm / 2 - w;
      const b1End = barrierCenterNm - wellGapNm / 2;
      const b2Start = barrierCenterNm + wellGapNm / 2;
      const b2End = barrierCenterNm + wellGapNm / 2 + w;
      barrierStart = b1Start;
      barrierEnd = b2End;
      for (let i = 0; i < n; i++) {
        if ((x[i] >= b1Start && x[i] <= b1End) || (x[i] >= b2Start && x[i] <= b2End)) {
          V[i] = barrierHeightEv;
        }
      }
    }
  }
  buildPotential();

  let psiR = new Float64Array(n);
  let psiI = new Float64Array(n);
  let timeFs = 0;

  // Preallocated Crank-Nicolson Thomas buffers (interior nodes 1..n-2)
  const m = n - 2;
  const cPrimeR = new Float64Array(m);
  const cPrimeI = new Float64Array(m);
  const dPrimeR = new Float64Array(m);
  const dPrimeI = new Float64Array(m);
  const rhsR = new Float64Array(m);
  const rhsI = new Float64Array(m);

  // Crank-Nicolson matrix entries:
  // H_diag[j] = 2*coeff/dx^2 + V[j+1], H_off = -coeff/dx^2
  // A = I + i * (dt / (2*hbar)) * H
  // B = I - i * (dt / (2*hbar)) * H
  const s = dtFs / (2 * HBAR_EV_FS);
  const offImag = -s * (coeff / (dx * dx)); // purely imaginary off-diagonal for A: (0, offImag)
  const diagBaseImag = s * ((2 * coeff) / (dx * dx));

  function factorMatrix() {
    for (let j = 0; j < m; j++) {
      const bR = 1;
      const bI = diagBaseImag + s * V[j + 1];
      let denomR = bR;
      let denomI = bI;
      if (j > 0) {
        denomR -= -offImag * cPrimeI[j - 1];
        denomI -= offImag * cPrimeR[j - 1];
      }
      const mag2 = denomR * denomR + denomI * denomI;
      cPrimeR[j] = (offImag * denomI) / mag2;
      cPrimeI[j] = (offImag * denomR) / mag2;
    }
  }
  factorMatrix();

  function launchPacket(opts = {}) {
    const e = opts.energyEv ?? energyEv;
    const x0 = opts.x0Nm ?? x0Nm;
    const sig = opts.sigmaNm ?? sigmaNm;
    const k0 = Math.sqrt(Math.max(0.05, e) / coeff); // rad / nm
    let norm2 = 0;
    for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1) {
        psiR[i] = 0;
        psiI[i] = 0;
        continue;
      }
      const env = Math.exp(-((x[i] - x0) ** 2) / (2 * sig * sig));
      const phase = k0 * (x[i] - x0);
      psiR[i] = env * Math.cos(phase);
      psiI[i] = env * Math.sin(phase);
      norm2 += (psiR[i] ** 2 + psiI[i] ** 2) * dx;
    }
    const invNorm = 1 / Math.sqrt(Math.max(1e-18, norm2));
    for (let i = 0; i < n; i++) {
      psiR[i] *= invNorm;
      psiI[i] *= invNorm;
    }
    timeFs = 0;
  }
  launchPacket();

  function step(steps = 1) {
    const fk = useWasm ? getFastKernelsSync() : null;
    if (fk?.exports?.tdse_cn_step_f64 && fk.arena && steps >= 2) {
      const arena = fk.arena;
      const saved = arena.mark();
      try {
        const prS = arena.allocFloat64(n);
        const piS = arena.allocFloat64(n);
        const vS = arena.allocFloat64(n);
        const cprS = arena.allocFloat64(m);
        const cpiS = arena.allocFloat64(m);
        const dprS = arena.allocFloat64(m);
        const dpiS = arena.allocFloat64(m);
        const rrS = arena.allocFloat64(m);
        const riS = arena.allocFloat64(m);
        prS.view().set(psiR);
        piS.view().set(psiI);
        vS.view().set(V);
        cprS.view().set(cPrimeR);
        cpiS.view().set(cPrimeI);
        fk.exports.tdse_cn_step_f64(
          prS.ptr,
          piS.ptr,
          vS.ptr,
          cprS.ptr,
          cpiS.ptr,
          dprS.ptr,
          dpiS.ptr,
          rrS.ptr,
          riS.ptr,
          n,
          s,
          offImag,
          diagBaseImag,
          steps,
        );
        psiR.set(prS.view());
        psiI.set(piS.view());
      } finally {
        arena.rewind(saved);
      }
      timeFs += dtFs * steps;
      return;
    }

    for (let iter = 0; iter < steps; iter++) {
      // 1. Compute rhs = B * psi  (B has diag (1, -(diagBaseImag + s*V)) and off (0, -offImag))
      for (let j = 0; j < m; j++) {
        const i = j + 1;
        const pR = psiR[i];
        const pI = psiI[i];
        const dI = -(diagBaseImag + s * V[i]);
        let rR = pR - dI * pI;
        let rI = pI + dI * pR;
        const sumR = psiR[i - 1] + psiR[i + 1];
        const sumI = psiI[i - 1] + psiI[i + 1];
        rR += offImag * sumI;
        rI -= offImag * sumR;
        rhsR[j] = rR;
        rhsI[j] = rI;
      }

      // 2. Forward sweep for dPrime
      for (let j = 0; j < m; j++) {
        const bR = 1;
        const bI = diagBaseImag + s * V[j + 1];
        let denomR = bR;
        let denomI = bI;
        let numR = rhsR[j];
        let numI = rhsI[j];
        if (j > 0) {
          denomR -= -offImag * cPrimeI[j - 1];
          denomI -= offImag * cPrimeR[j - 1];
          numR -= -offImag * dPrimeI[j - 1];
          numI -= offImag * dPrimeR[j - 1];
        }
        const mag2 = denomR * denomR + denomI * denomI;
        dPrimeR[j] = (numR * denomR + numI * denomI) / mag2;
        dPrimeI[j] = (numI * denomR - numR * denomI) / mag2;
      }

      // 3. Back substitution
      psiR[n - 2] = dPrimeR[m - 1];
      psiI[n - 2] = dPrimeI[m - 1];
      for (let j = m - 2; j >= 0; j--) {
        const nextR = psiR[j + 2];
        const nextI = psiI[j + 2];
        const cR = cPrimeR[j];
        const cI = cPrimeI[j];
        psiR[j + 1] = dPrimeR[j] - (cR * nextR - cI * nextI);
        psiI[j + 1] = dPrimeI[j] - (cR * nextI + cI * nextR);
      }
      psiR[0] = psiI[0] = psiR[n - 1] = psiI[n - 1] = 0;
      timeFs += dtFs;
    }
  }

  function metrics() {
    let reflected = 0;
    let inside = 0;
    let transmitted = 0;
    let meanX = 0;
    let maxProb = 0;
    for (let i = 0; i < n; i++) {
      const p = psiR[i] ** 2 + psiI[i] ** 2;
      if (p > maxProb) maxProb = p;
      const pDx = p * dx;
      meanX += x[i] * pDx;
      if (x[i] < barrierStart) reflected += pDx;
      else if (x[i] > barrierEnd) transmitted += pDx;
      else inside += pDx;
    }
    return {
      timeFs,
      norm: reflected + inside + transmitted,
      reflected,
      inside,
      transmitted,
      meanX,
      maxProb,
      barrierStart,
      barrierEnd,
    };
  }

  function reconfigure(nextOpts) {
    if (nextOpts.barrierWidthNm != null) barrierWidthNm = nextOpts.barrierWidthNm;
    if (nextOpts.barrierHeightEv != null) barrierHeightEv = nextOpts.barrierHeightEv;
    if (nextOpts.doubleBarrier != null) doubleBarrier = Boolean(nextOpts.doubleBarrier);
    if (nextOpts.energyEv != null) energyEv = nextOpts.energyEv;
    buildPotential();
    factorMatrix();
    launchPacket({ energyEv });
  }

  return {
    n,
    dx,
    lengthNm,
    x,
    V,
    get psiR() {
      return psiR;
    },
    get psiI() {
      return psiI;
    },
    step,
    metrics,
    launchPacket,
    reconfigure,
  };
}
