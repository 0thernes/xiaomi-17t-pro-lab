/**
 * Memory (LPDDR5X Ultra), Storage (UFS 4.1), and CS Roofline models
 * anchored to the Xiaomi 17T Pro's cited FCC/Kurnal/Notebookcheck figures.
 */

export const MEMORY_PROFILES = {
  xiaomi17tPro: {
    label: "Xiaomi 17T Pro (LPDDR5X 9600, 4×16-bit)",
    rateMTps: 9600,
    widthBits: 64,
    bwGBps: (9600 * 64) / 8 / 1000, // 76.8 GB/s
    part: "SK hynix H58GG6AV9H X094 (12 GB, 496-ball PoP)",
  },
  d9500Max: {
    label: "Dimensity 9500 SoC Ceiling (LPDDR5X 10667, 4×16-bit)",
    rateMTps: 10667,
    widthBits: 64,
    bwGBps: (10667 * 64) / 8 / 1000, // 85.336 GB/s
    part: "MediaTek MT6993 controller spec",
  },
};

export const UFS_PROFILES = {
  xiaomiMeasured: {
    label: "Xiaomi 17T Pro Measured (Notebookcheck AndroBench, 512 GB)",
    part: "SK hynix HN8T271EJK X152 (UFS 4.1, 153-ball)",
    seqReadMBps: 3021.5,
    seqWriteMBps: 2770.0,
    rand4kReadMBps: 414.0,
    rand4kIops: Math.round((414.0 * 1024) / 4), // ~105,984 IOPS
    lanesInferred: 2,
    jedec2LanePeakGBps: 4.2,
    soc4LanePeakGBps: 8.4,
  },
};

/**
 * Exact CS Roofline evaluation: achievable GFLOPS = min(peakGflops, ai * bwGBps).
 */
export function rooflinePoint({ ai, peakGflops, bwGBps }) {
  if (!Number.isFinite(ai) || ai < 0) throw new RangeError("arithmetic intensity ai must be finite and non-negative");
  if (!Number.isFinite(peakGflops) || peakGflops <= 0) throw new RangeError("peakGflops must be finite and positive");
  if (!Number.isFinite(bwGBps) || bwGBps <= 0) throw new RangeError("bwGBps must be finite and positive");
  const memCap = ai * bwGBps;
  const achievable = Math.min(peakGflops, memCap);
  const ridgeAi = peakGflops / bwGBps;
  return {
    ai,
    achievableGflops: achievable,
    ridgeAi,
    bound: memCap < peakGflops ? "memory-bound" : "compute-bound",
  };
}

/**
 * Bandwidth-ceiling LLM autoregressive decode model:
 * Each generated token streams the entire active weight footprint from LPDDR5X.
 */
export function llmDecodeCeiling({
  paramsBillions = 2.0,
  bitsPerWeight = 8,
  bwGBps = 76.8,
  utilization = 0.72,
  contextTokens = 4096,
  layers = 26,
  kvDim = 512,
}) {
  const weightsGB = (paramsBillions * 1e9 * (bitsPerWeight / 8)) / 1e9;
  const kvCacheGB = (2 * layers * kvDim * contextTokens * 2) / 1e9; // FP16 K+V
  const bytesPerTokenGB = weightsGB + kvCacheGB;
  const effectiveBw = bwGBps * utilization;
  const ceilingTokPerSec = effectiveBw / Math.max(1e-6, bytesPerTokenGB);
  const modelLoadSecUfs = (weightsGB * 1024) / UFS_PROFILES.xiaomiMeasured.seqReadMBps;
  return {
    weightsGB,
    kvCacheGB,
    bytesPerTokenGB,
    effectiveBwGBps: effectiveBw,
    ceilingTokPerSec,
    modelLoadSecUfs,
  };
}

/** Live in-browser storage throughput probe using Blob / ArrayBuffer + IndexedDB write/read. */
export async function probeBrowserMemoryCopy(megabytes = 16) {
  const bytes = megabytes * 1024 * 1024;
  const src = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i += 4096) src[i] = i & 0xff;
  const dst = new Uint8Array(bytes);
  const t0 = performance.now();
  dst.set(src);
  const t1 = performance.now();
  let checksum = 0;
  for (let i = 0; i < bytes; i += 4096) checksum += dst[i];
  const elapsedSec = Math.max(1e-6, (t1 - t0) / 1000);
  // 2x bytes moved (read src + write dst)
  const copyGBps = (2 * bytes) / 1e9 / elapsedSec;
  return { bytes, elapsedMs: t1 - t0, copyGBps, checksum };
}
