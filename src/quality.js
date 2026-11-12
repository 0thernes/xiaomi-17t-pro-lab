/**
 * Quality tier from a measured fill probe, memory, core count, and GPU name.
 * Viewport width and orientation are intentionally unused: a phone in
 * landscape is still a phone.
 */

export async function measureCapability() {
  const memoryGb = Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : null;
  const cores = Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const webgpu = "gpu" in navigator;
  let renderer = "unavailable";
  let vendor = "unavailable";
  let benchMs = null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const gl = canvas.getContext("webgl2", { powerPreference: "high-performance", antialias: false });
  if (gl) {
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    if (debug) {
      renderer = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) || "hidden";
      vendor = gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) || "hidden";
    } else {
      renderer = "hidden by browser";
    }
    benchMs = benchFragment(gl);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  const tier = chooseTier({ memoryGb, cores, coarse, renderer, benchMs });
  return {
    tier,
    memoryGb,
    cores,
    coarse,
    reducedMotion,
    renderer,
    vendor,
    benchMs,
    webgpu,
    pixelRatio: pixelRatioFor(tier),
  };
}

export function chooseTier({ memoryGb, cores, coarse, renderer, benchMs }) {
  const name = String(renderer || "").toLowerCase();
  const weak = /swiftshader|llvmpipe|softpipe|microsoft basic|software/.test(name);
  const strong = /rtx|radeon rx|apple m|adreno [7-9]|mali-g1|mali-g7|immortalis|apple gpu|nvidia/.test(name);
  if (weak || (benchMs != null && benchMs > 40) || (memoryGb != null && memoryGb <= 2)) return "low";
  if (
    !coarse &&
    strong &&
    benchMs != null &&
    benchMs < 10 &&
    (memoryGb == null || memoryGb >= 8) &&
    (cores == null || cores >= 8)
  ) {
    return "ultra";
  }
  if (benchMs != null && benchMs < 16 && (memoryGb == null || memoryGb >= 4)) return "high";
  return "medium";
}

export function pixelRatioFor(tier) {
  const dpr = window.devicePixelRatio || 1;
  if (tier === "low") return 1;
  if (tier === "medium") return Math.min(dpr, 1.25);
  if (tier === "high") return Math.min(dpr, 1.5);
  return Math.min(Math.max(dpr, 1), 2);
}

function benchFragment(gl) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(
    vs,
    `#version 300 es
    void main() {
      float x = (gl_VertexID == 1) ? 3.0 : -1.0;
      float y = (gl_VertexID == 2) ? 3.0 : -1.0;
      gl_Position = vec4(x, y, 0.0, 1.0);
    }`,
  );
  gl.shaderSource(
    fs,
    `#version 300 es
    precision mediump float;
    out vec4 outColor;
    void main() {
      float x = 0.0;
      for (int i = 0; i < 48; i++) x += sin(gl_FragCoord.x * 0.02 + float(i));
      outColor = vec4(fract(x * 0.001), 0.0, 0.0, 1.0);
    }`,
  );
  gl.compileShader(vs);
  gl.compileShader(fs);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.viewport(0, 0, 128, 128);
  const samples = [];
  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[1];
}
