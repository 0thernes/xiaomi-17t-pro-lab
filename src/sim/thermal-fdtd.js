/**
 * Real-time 2D finite-difference heat diffusion PDE on the Kurnal 140.57 mm²
 * Dimensity 9500 floorplan + Xiaomi 17T Pro 3D IceLoop (5500 mm²) vapor chamber model.
 *
 * PDE: dT/dt = alpha_eff * Laplacian(T) + q_block(x, y) + q_leak(T) - h_eff * (T - T_amb)
 * Explicit Forward-Euler with automatic CFL sub-stepping (r = alpha*dt/dx^2 <= 0.22).
 *
 * v4.0.0 Catalytic + Rust WASM SIMD128 acceleration:
 *   - Multi-step explicit stencil runs inside `fast-kernels.wasm` (`fdtd_thermal_step_f64`)
 *     using zero-allocation Catalytic Arena mark/rewind slicing (transparent JS fallback).
 *   - Eliminates redundant full-grid `stats()` calls inside `stepOnce()` and precomputes
 *     a 256-entry Ironbow RGBA LUT (`ironbowFillRgba`) for zero-GC FLIR rendering.
 */
import { getFastKernelsSync } from "./wasm.js";

export const THERMAL_PROFILES = {
  idle: {
    id: "idle",
    label: "HyperOS 3 Idle",
    desc: "144 Hz LTPO idle + background telemetry (~0.9 W SoC)",
    watts: { cpu: 0.45, gpu: 0.12, npu: 0.05, slc: 0.14, modem: 0.18 },
  },
  gaming_nomad: {
    id: "gaming_nomad",
    label: "3DMark Steel Nomad",
    desc: "Heavy Mali-G1 MC12 + C1-Ultra gaming loop (~9.8 W peak)",
    watts: { cpu: 2.9, gpu: 5.4, npu: 0.15, slc: 0.85, modem: 0.5 },
  },
  llm_decode: {
    id: "llm_decode",
    label: "8B LLM / NPU 990",
    desc: "Sustained NPU 990 + LPDDR5X-9600 bandwidth ceiling (~6.4 W)",
    watts: { cpu: 1.35, gpu: 0.35, npu: 3.4, slc: 0.95, modem: 0.35 },
  },
  stress_loop: {
    id: "stress_loop",
    label: "All-Core Burn (CPU+GPU+NPU)",
    desc: "Extreme synthetic thermal wall test (~14.2 W peak)",
    watts: { cpu: 5.6, gpu: 5.4, npu: 2.1, slc: 0.75, modem: 0.35 },
  },
  ai_camera: {
    id: "ai_camera",
    label: "Leica 4K120 + AI ISP",
    desc: "ISP + NPU 990 computational photography + video encode (~5.8 W)",
    watts: { cpu: 1.6, gpu: 1.1, npu: 1.9, slc: 0.65, modem: 0.55 },
  },
};

/** Kurnal-proportioned die heat zones (in mm on 10.88 x 12.92 mm die). */
export const DIE_HEAT_ZONES = [
  { id: "cpu", label: "CPU C1 Cluster", areaMm2: 28.75, x: 0.6, y: 0.6, w: 9.68, h: 2.97 },
  { id: "gpu", label: "Mali-G1 MC12", areaMm2: 24.23, x: 0.6, y: 3.9, w: 9.68, h: 2.5 },
  { id: "npu", label: "NPU 990 + CIM", areaMm2: 12.6, x: 0.6, y: 6.75, w: 5.8, h: 2.17 },
  { id: "slc", label: "10 MB SLC / Sys", areaMm2: 8.92, x: 6.65, y: 6.75, w: 3.63, h: 2.46 },
  { id: "modem", label: "ISP / Modem / PHY", areaMm2: 22.0, x: 0.6, y: 9.55, w: 9.68, h: 2.77 },
];

const IRONBOW_STOPS = [
  [0.0, 6, 8, 22],
  [0.18, 28, 16, 86],
  [0.36, 110, 22, 134],
  [0.54, 198, 48, 82],
  [0.72, 245, 114, 24],
  [0.88, 255, 206, 64],
  [1.0, 255, 252, 232],
];

/** Smooth scientific FLIR Ironbow colormap (0..1 -> [r, g, b] 0..255). */
export function ironbowRgb(tempC, minC = 25, maxC = 105) {
  const u = Math.max(0, Math.min(1, (tempC - minC) / Math.max(1e-6, maxC - minC)));
  for (let i = 1; i < IRONBOW_STOPS.length; i++) {
    if (u <= IRONBOW_STOPS[i][0]) {
      const [u0, r0, g0, b0] = IRONBOW_STOPS[i - 1];
      const [u1, r1, g1, b1] = IRONBOW_STOPS[i];
      const t = (u - u0) / (u1 - u0);
      return [Math.round(r0 + (r1 - r0) * t), Math.round(g0 + (g1 - g0) * t), Math.round(b0 + (b1 - b0) * t)];
    }
  }
  return [255, 252, 232];
}

// Precomputed 256-entry Ironbow RGBA lookup table (zero per-cell array allocations)
const IRONBOW_LUT = new Uint8ClampedArray(256 * 3);
for (let i = 0; i < 256; i++) {
  const [r, g, b] = ironbowRgb(i, 0, 255);
  IRONBOW_LUT[i * 3] = r;
  IRONBOW_LUT[i * 3 + 1] = g;
  IRONBOW_LUT[i * 3 + 2] = b;
}

/** Zero-allocation fill of an RGBA ImageData buffer from a temperature field. */
export function ironbowFillRgba(temp, rgbaOut, minC = 24, maxC = 108) {
  const scale = 255 / Math.max(1e-6, maxC - minC);
  const n = temp.length;
  for (let k = 0; k < n; k++) {
    let idx = Math.round((temp[k] - minC) * scale);
    if (idx < 0) idx = 0;
    else if (idx > 255) idx = 255;
    const l = idx * 3;
    const p = k << 2;
    rgbaOut[p] = IRONBOW_LUT[l];
    rgbaOut[p + 1] = IRONBOW_LUT[l + 1];
    rgbaOut[p + 2] = IRONBOW_LUT[l + 2];
    rgbaOut[p + 3] = 255;
  }
}

export function createDieThermalGrid({
  nx = 44,
  ny = 52,
  widthMm = 10.88,
  heightMm = 12.92,
  ambientC = 25,
  vcEnabled = true,
  profileId = "gaming_nomad",
  useWasm = true,
} = {}) {
  if (!Number.isInteger(nx) || nx < 4 || !Number.isInteger(ny) || ny < 4) {
    throw new RangeError("thermal grid dimensions nx, ny must be integers >= 4");
  }
  if (!Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(heightMm) || heightMm <= 0) {
    throw new RangeError("die widthMm and heightMm must be positive");
  }
  if (!Number.isFinite(ambientC) || ambientC < -50 || ambientC > 85) {
    throw new RangeError("ambientC must be a finite temperature in [-50, 85] °C");
  }
  const size = nx * ny;
  let temp = new Float64Array(size).fill(ambientC);
  let next = new Float64Array(size).fill(ambientC);
  const pulse = new Float64Array(size); // user-injected transient hotspot W/mm^2

  const dxMm = widthMm / nx;
  const dyMm = heightMm / ny;
  const cellAreaMm2 = dxMm * dyMm;
  const invDx2 = 1 / (dxMm * dxMm);
  const invDy2 = 1 / (dyMm * dyMm);

  // Map each cell to its Kurnal heat zone index (-1 = perimeter silicon)
  const zoneMap = new Int8Array(size).fill(-1);
  const zoneCounts = new Int32Array(DIE_HEAT_ZONES.length);
  for (let j = 0; j < ny; j++) {
    const yMm = (j + 0.5) * dyMm;
    for (let i = 0; i < nx; i++) {
      const xMm = (i + 0.5) * dxMm;
      for (let z = 0; z < DIE_HEAT_ZONES.length; z++) {
        const b = DIE_HEAT_ZONES[z];
        if (xMm >= b.x && xMm <= b.x + b.w && yMm >= b.y && yMm <= b.y + b.h) {
          zoneMap[j * nx + i] = z;
          zoneCounts[z] += 1;
          break;
        }
      }
    }
  }

  // Reusable catalytic buffers (zero per-step allocations)
  const zonePowerDensity = new Float64Array(DIE_HEAT_ZONES.length);
  const zoneInvAreas = new Float64Array(DIE_HEAT_ZONES.length);
  for (let z = 0; z < DIE_HEAT_ZONES.length; z++) {
    zoneInvAreas[z] = 1 / Math.max(1, zoneCounts[z] * cellAreaMm2);
  }
  const zonePeakArr = new Float64Array(DIE_HEAT_ZONES.length);

  let simTime = 0;
  let vc = vcEnabled;
  let ambient = ambientC;
  let profile = THERMAL_PROFILES[profileId] || THERMAL_PROFILES.gaming_nomad;
  let profileBaseWatts = sumWatts(profile.watts);
  let throttleScale = 1;
  let hasPulse = false;

  function sumWatts(w) {
    let s = 0;
    for (let z = 0; z < DIE_HEAT_ZONES.length; z++) s += w[DIE_HEAT_ZONES[z].id] || 0;
    return s;
  }

  function scanPeakAndMean() {
    let peak = -Infinity;
    let sum = 0;
    for (let k = 0; k < size; k++) {
      const t = temp[k];
      sum += t;
      if (t > peak) peak = t;
    }
    return { peak, mean: sum / size };
  }

  function stepOnce(dtSec, subSteps) {
    const { peak: peakNow, mean: meanPrev } = scanPeakAndMean();
    const alpha = vc ? (meanPrev > 42 ? 1.9 : 1.35) : 0.42;
    const hConv = vc ? 0.28 : 0.125;
    // Automatic CFL stability guarantee: alpha * dt * (1/dx^2 + 1/dy^2) <= 0.32 < 0.5
    const cflSteps = Math.max(subSteps, Math.ceil((dtSec * alpha * (invDx2 + invDy2)) / 0.32));
    const dt = dtSec / cflSteps;
    const invHeatCap = 1 / (vc ? 0.016 : 0.013);

    // Closed-loop smooth DVFS thermal controller (Tj > 84 C ramps DVFS smoothly down to 52%)
    const targetThrottle = peakNow > 84 ? Math.max(0.52, 1 - (peakNow - 84) * 0.022) : 1;
    throttleScale += (targetThrottle - throttleScale) * Math.min(0.45, dtSec * 0.5);

    for (let z = 0; z < DIE_HEAT_ZONES.length; z++) {
      const id = DIE_HEAT_ZONES[z].id;
      zonePowerDensity[z] = (profile.watts[id] || 0) * throttleScale * zoneInvAreas[z];
    }

    const fk = useWasm ? getFastKernelsSync() : null;
    if (fk?.exports?.fdtd_thermal_step_f64 && fk.arena) {
      const arena = fk.arena;
      const saved = arena.mark();
      try {
        const tS = arena.allocFloat64(size);
        const nS = arena.allocFloat64(size);
        const pPtr = hasPulse ? arena.allocFloat64(size) : null;
        const zS = arena.allocInt8(size);
        const zpS = arena.allocFloat64(DIE_HEAT_ZONES.length);
        tS.view().set(temp);
        if (pPtr) pPtr.view().set(pulse);
        zS.view().set(zoneMap);
        zpS.view().set(zonePowerDensity);
        const swapped = fk.exports.fdtd_thermal_step_f64(
          tS.ptr,
          nS.ptr,
          pPtr ? pPtr.ptr : 0,
          zS.ptr,
          zpS.ptr,
          nx,
          ny,
          alpha,
          invDx2,
          invDy2,
          invHeatCap,
          hConv,
          ambient,
          dt,
          cflSteps,
        );
        temp.set(swapped ? nS.view() : tS.view());
      } finally {
        arena.rewind(saved);
      }
      simTime += dt * cflSteps;
    } else {
      for (let s = 0; s < cflSteps; s++) {
        for (let j = 0; j < ny; j++) {
          const jUp = j > 0 ? j - 1 : 0;
          const jDn = j < ny - 1 ? j + 1 : ny - 1;
          const row = j * nx;
          const rowUp = jUp * nx;
          const rowDn = jDn * nx;
          for (let i = 0; i < nx; i++) {
            const idx = row + i;
            const iLt = i > 0 ? i - 1 : 0;
            const iRt = i < nx - 1 ? i + 1 : nx - 1;
            const tC = temp[idx];
            const lap =
              (temp[row + iRt] + temp[row + iLt] - 2 * tC) * invDx2 +
              (temp[rowDn + i] + temp[rowUp + i] - 2 * tC) * invDy2;
            const z = zoneMap[idx];
            const qDyn = (z >= 0 ? zonePowerDensity[z] : 0.002) + pulse[idx];
            const qLeak = (z >= 0 ? 0.0022 : 0.0003) * Math.exp(Math.min(3.2, Math.max(0, (tC - 25) * 0.032)));
            const dT = alpha * lap + (qDyn + qLeak) * invHeatCap - hConv * (tC - ambient);
            next[idx] = Math.max(ambient, Math.min(125, tC + dt * dT));
          }
        }
        const swap = temp;
        temp = next;
        next = swap;
        simTime += dt;
      }
    }

    // Decay transient user-injected laser/hotspot probes (skip when zero)
    if (hasPulse) {
      const decay = Math.exp(-dtSec * 0.85);
      let maxP = 0;
      for (let k = 0; k < size; k++) {
        const v = pulse[k] * decay;
        pulse[k] = v;
        if (v > maxP) maxP = v;
      }
      if (maxP < 1e-9) {
        pulse.fill(0);
        hasPulse = false;
      }
    }
  }

  function step(dtSec = 0.08, subSteps = 6) {
    if (!Number.isFinite(dtSec) || dtSec <= 0) {
      throw new RangeError("dtSec must be finite and positive");
    }
    // Keep closed-loop DVFS controller sub-interval <= 0.5 s to prevent bang-bang aliasing
    const ctrlIntervals = dtSec > 0.5 ? Math.ceil(dtSec / 0.5) : 1;
    const subDt = dtSec / ctrlIntervals;
    const innerSub = ctrlIntervals > 1 ? 1 : subSteps;
    for (let c = 0; c < ctrlIntervals; c++) stepOnce(subDt, innerSub);
  }

  function injectHotspot(uNorm, vNorm, watts = 3.5, radiusCells = 3.5) {
    const cx = uNorm * nx;
    const cy = vNorm * ny;
    const peakDensity = watts / (Math.PI * (radiusCells * dxMm) ** 2);
    const r2 = radiusCells * radiusCells;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const d2 = (i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2;
        if (d2 < r2 * 4) {
          pulse[j * nx + i] += peakDensity * Math.exp(-d2 / r2);
          hasPulse = true;
        }
      }
    }
  }

  function stats() {
    let peakC = -Infinity;
    let minC = Infinity;
    let sum = 0;
    let peakIdx = 0;
    zonePeakArr.fill(ambient);
    for (let k = 0; k < size; k++) {
      const t = temp[k];
      sum += t;
      if (t > peakC) {
        peakC = t;
        peakIdx = k;
      }
      if (t < minC) minC = t;
      const z = zoneMap[k];
      if (z >= 0 && t > zonePeakArr[z]) zonePeakArr[z] = t;
    }
    const meanC = sum / size;
    const zonePeaks = {
      cpu: zonePeakArr[0],
      gpu: zonePeakArr[1],
      npu: zonePeakArr[2],
      slc: zonePeakArr[3],
      modem: zonePeakArr[4],
    };
    const totalWatts = profileBaseWatts * throttleScale + 0.25 * Math.exp(Math.max(0, (meanC - 30) * 0.035));
    return {
      simTime,
      peakC,
      meanC,
      minC,
      peakXMm: ((peakIdx % nx) + 0.5) * dxMm,
      peakYMm: (Math.floor(peakIdx / nx) + 0.5) * dyMm,
      zonePeaks,
      throttleScale,
      c1UltraGHz: 4.21 * throttleScale,
      totalWatts,
      // Typical capacity and the 4.58 V cell rating are cited. Nominal
      // discharge voltage is not, so watt-hours and runtime are not computed.
      batteryWh: null,
      batteryHrs: null,
      vcEnabled: vc,
      ambientC: ambient,
      profileId: profile.id,
    };
  }

  function reset() {
    temp.fill(ambient);
    next.fill(ambient);
    pulse.fill(0);
    hasPulse = false;
    simTime = 0;
    throttleScale = 1;
  }

  return {
    nx,
    ny,
    widthMm,
    heightMm,
    get temp() {
      return temp;
    },
    get zoneMap() {
      return zoneMap;
    },
    setVc(enabled) {
      vc = Boolean(enabled);
    },
    setAmbient(c) {
      const val = Number(c);
      if (!Number.isFinite(val)) throw new RangeError("ambient temperature must be finite");
      ambient = Math.max(5, Math.min(50, val));
    },
    setProfile(id) {
      if (THERMAL_PROFILES[id]) {
        profile = THERMAL_PROFILES[id];
        profileBaseWatts = sumWatts(profile.watts);
      }
    },
    injectHotspot,
    step,
    stats,
    reset,
    sampleAt(uNorm, vNorm) {
      const i = Math.max(0, Math.min(nx - 1, Math.floor(uNorm * nx)));
      const j = Math.max(0, Math.min(ny - 1, Math.floor(vNorm * ny)));
      const idx = j * nx + i;
      const z = zoneMap[idx];
      return {
        tempC: temp[idx],
        xMm: (i + 0.5) * dxMm,
        yMm: (j + 0.5) * dyMm,
        zone: z >= 0 ? DIE_HEAT_ZONES[z].label : "Die Perimeter Silicon",
      };
    },
  };
}

/**
 * Sustained thermal curves. The integrator advances `minutes` of simulated
 * time. The axis is that clock, not a cosmetic label on a few seconds of steps.
 */
export function simulateSustainedThrottle({ minutes = 20, ambientC = 25, profileId = "gaming_nomad" } = {}) {
  const withVc = createDieThermalGrid({ nx: 22, ny: 26, ambientC, vcEnabled: true, profileId });
  const noVc = createDieThermalGrid({ nx: 22, ny: 26, ambientC, vcEnabled: false, profileId });
  const points = [];
  const samples = 40;
  const dt = (minutes * 60) / samples;
  for (let s = 0; s <= samples; s++) {
    const a = withVc.stats();
    const b = noVc.stats();
    points.push({
      minute: a.simTime / 60,
      simSec: a.simTime,
      vcPeakC: a.peakC,
      noVcPeakC: b.peakC,
      vcPerfPct: a.throttleScale * 100,
      noVcPerfPct: b.throttleScale * 100,
    });
    if (s === samples) break;
    withVc.step(dt);
    noVc.step(dt);
  }
  return points;
}
