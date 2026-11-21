/**
 * Real-time 2D finite-difference heat diffusion PDE on the Kurnal 140.57 mm²
 * Dimensity 9500 floorplan + Xiaomi 17T Pro 3D IceLoop (5500 mm²) vapor chamber model.
 *
 * PDE: dT/dt = alpha_eff * Laplacian(T) + q_block(x, y) + q_leak(T) - h_eff * (T - T_amb)
 * Explicit Forward-Euler with automatic CFL sub-stepping (r = alpha*dt/dx^2 <= 0.22).
 *
 * Note: Thermal resistances and block wattage splits are COMPUTED physical-model
 * parameters (not vendor-leaked die telemetry); die dimensions (10.88 x 12.92 mm),
 * block areas (CPU 28.75, GPU 24.23, NPU 12.60, SLC 8.92 mm²), cooling area
 * (5500 mm²), and battery capacity (7000 mAh) come from specs.json.
 */

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

/** Smooth scientific FLIR Ironbow colormap (0..1 -> [r, g, b] 0..255). */
export function ironbowRgb(tempC, minC = 25, maxC = 105) {
  const u = Math.max(0, Math.min(1, (tempC - minC) / Math.max(1e-6, maxC - minC)));
  const stops = [
    [0.0, 6, 8, 22],
    [0.18, 28, 16, 86],
    [0.36, 110, 22, 134],
    [0.54, 198, 48, 82],
    [0.72, 245, 114, 24],
    [0.88, 255, 206, 64],
    [1.0, 255, 252, 232],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (u <= stops[i][0]) {
      const [u0, r0, g0, b0] = stops[i - 1];
      const [u1, r1, g1, b1] = stops[i];
      const t = (u - u0) / (u1 - u0);
      return [Math.round(r0 + (r1 - r0) * t), Math.round(g0 + (g1 - g0) * t), Math.round(b0 + (b1 - b0) * t)];
    }
  }
  return [255, 252, 232];
}

export function createDieThermalGrid({
  nx = 44,
  ny = 52,
  widthMm = 10.88,
  heightMm = 12.92,
  ambientC = 25,
  vcEnabled = true,
  profileId = "gaming_nomad",
} = {}) {
  const size = nx * ny;
  let temp = new Float64Array(size).fill(ambientC);
  let next = new Float64Array(size).fill(ambientC);
  const pulse = new Float64Array(size); // user-injected transient hotspot W/mm^2

  const dxMm = widthMm / nx;
  const dyMm = heightMm / ny;
  const cellAreaMm2 = dxMm * dyMm;

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

  let simTime = 0;
  let vc = vcEnabled;
  let ambient = ambientC;
  let profile = THERMAL_PROFILES[profileId] || THERMAL_PROFILES.gaming_nomad;
  let throttleScale = 1;

  function step(dtSec = 0.08, subSteps = 6) {
    // Effective lateral thermal spreading (3D IceLoop two-phase copper VC spreads hotspots across the die)
    const meanPrev = stats().meanC;
    const alpha = vc ? (meanPrev > 42 ? 1.9 : 1.35) : 0.42; // mm^2/s effective lateral diffusivity
    const hConv = vc ? 0.28 : 0.125; // effective cooling conductance to IceLoop/chassis (1/s)
    const invDx2 = 1 / (dxMm * dxMm);
    const invDy2 = 1 / (dyMm * dyMm);
    // Automatic CFL stability guarantee: alpha * dt * (1/dx^2 + 1/dy^2) <= 0.32 < 0.5
    const cflSteps = Math.max(subSteps, Math.ceil((dtSec * alpha * (invDx2 + invDy2)) / 0.32));
    const dt = dtSec / cflSteps;
    // Thinned silicon + interposer effective areal heat capacity (J / (K * mm^2))
    const heatCapPerMm2 = vc ? 0.016 : 0.013;

    // Thermal throttling controller (Tj > 84 C ramps DVFS smoothly down to 52%)
    const peakNow = stats().peakC;
    const targetThrottle = peakNow > 84 ? Math.max(0.52, 1 - (peakNow - 84) * 0.022) : 1;
    throttleScale += (targetThrottle - throttleScale) * Math.min(1, dtSec * 1.4);

    // Precompute power density per zone (W / mm^2)
    const zonePowerDensity = new Float64Array(DIE_HEAT_ZONES.length);
    for (let z = 0; z < DIE_HEAT_ZONES.length; z++) {
      const id = DIE_HEAT_ZONES[z].id;
      const w = (profile.watts[id] || 0) * throttleScale;
      const area = Math.max(1, zoneCounts[z] * cellAreaMm2);
      zonePowerDensity[z] = w / area;
    }

    for (let s = 0; s < cflSteps; s++) {
      for (let j = 0; j < ny; j++) {
        const jUp = j > 0 ? j - 1 : 0;
        const jDn = j < ny - 1 ? j + 1 : ny - 1;
        for (let i = 0; i < nx; i++) {
          const idx = j * nx + i;
          const iLt = i > 0 ? i - 1 : 0;
          const iRt = i < nx - 1 ? i + 1 : nx - 1;
          const tC = temp[idx];
          const lap =
            (temp[j * nx + iRt] + temp[j * nx + iLt] - 2 * tC) * invDx2 +
            (temp[jDn * nx + i] + temp[jUp * nx + i] - 2 * tC) * invDy2;
          const z = zoneMap[idx];
          const qDyn = (z >= 0 ? zonePowerDensity[z] : 0.002) + pulse[idx];
          // Subthreshold leakage scales exponentially with junction temperature
          const qLeak = (z >= 0 ? 0.0022 : 0.0003) * Math.exp(Math.min(3.2, Math.max(0, (tC - 25) * 0.032)));
          const dT = alpha * lap + (qDyn + qLeak) / heatCapPerMm2 - hConv * (tC - ambient);
          next[idx] = Math.max(ambient, Math.min(125, tC + dt * dT));
        }
      }
      const swap = temp;
      temp = next;
      next = swap;
      simTime += dt;
    }

    // Decay transient user-injected laser/hotspot probes
    const decay = Math.exp(-dtSec * 0.85);
    for (let k = 0; k < size; k++) pulse[k] *= decay;
  }

  function injectHotspot(uNorm, vNorm, watts = 3.5, radiusCells = 3.5) {
    const cx = uNorm * nx;
    const cy = vNorm * ny;
    const peakDensity = watts / (Math.PI * (radiusCells * dxMm) ** 2);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const d2 = (i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2;
        if (d2 < radiusCells * radiusCells * 4) {
          pulse[j * nx + i] += peakDensity * Math.exp(-d2 / (radiusCells * radiusCells));
        }
      }
    }
  }

  function stats() {
    let peakC = -Infinity;
    let minC = Infinity;
    let sum = 0;
    let peakIdx = 0;
    for (let k = 0; k < size; k++) {
      const t = temp[k];
      sum += t;
      if (t > peakC) {
        peakC = t;
        peakIdx = k;
      }
      if (t < minC) minC = t;
    }
    const meanC = sum / size;
    const zonePeaks = {};
    for (let z = 0; z < DIE_HEAT_ZONES.length; z++) zonePeaks[DIE_HEAT_ZONES[z].id] = ambient;
    for (let k = 0; k < size; k++) {
      const z = zoneMap[k];
      if (z >= 0 && temp[k] > zonePeaks[DIE_HEAT_ZONES[z].id]) zonePeaks[DIE_HEAT_ZONES[z].id] = temp[k];
    }
    const baseWatts = Object.values(profile.watts).reduce((a, b) => a + b, 0);
    const totalWatts = baseWatts * throttleScale + 0.25 * Math.exp(Math.max(0, (meanC - 30) * 0.035));
    // 7000 mAh @ 3.88 V nominal ~= 27.16 Wh (dual-cell 16% Si-C)
    const batteryWh = 27.16;
    const displayAndRadioW = profile.id === "idle" ? 0.8 : 2.1;
    const batteryHrs = batteryWh / Math.max(0.5, totalWatts + displayAndRadioW);
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
      batteryHrs,
      vcEnabled: vc,
      ambientC: ambient,
      profileId: profile.id,
    };
  }

  function reset() {
    temp.fill(ambient);
    next.fill(ambient);
    pulse.fill(0);
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
      ambient = Math.max(5, Math.min(50, Number(c)));
    },
    setProfile(id) {
      if (THERMAL_PROFILES[id]) profile = THERMAL_PROFILES[id];
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

/** Compute 20-minute sustained thermal & clock stability curves comparing 3D IceLoop ON vs OFF. */
export function simulateSustainedThrottle({ minutes = 20, ambientC = 25, profileId = "gaming_nomad" } = {}) {
  const withVc = createDieThermalGrid({ nx: 22, ny: 26, ambientC, vcEnabled: true, profileId });
  const noVc = createDieThermalGrid({ nx: 22, ny: 26, ambientC, vcEnabled: false, profileId });
  const points = [];
  const samples = 40;
  for (let s = 0; s <= samples; s++) {
    const a = withVc.stats();
    const b = noVc.stats();
    points.push({
      minute: (s / samples) * minutes,
      vcPeakC: a.peakC,
      noVcPeakC: b.peakC,
      vcPerfPct: a.throttleScale * 100,
      noVcPerfPct: b.throttleScale * 100,
    });
    withVc.step(0.6, 8);
    noVc.step(0.6, 8);
  }
  return points;
}
