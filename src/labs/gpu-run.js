import { fillUnit, matmulFlops, matmulFp, maxAbsErr, mulberry32 } from "../sim/quant.js";

const WGSL = `
struct Dims { n: u32 };
@group(0) @binding(0) var<storage, read> A: array<f32>;
@group(0) @binding(1) var<storage, read> B: array<f32>;
@group(0) @binding(2) var<storage, read_write> C: array<f32>;
@group(0) @binding(3) var<uniform> dims: Dims;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let n = dims.n;
  if (id.x >= n || id.y >= n) { return; }
  var sum = 0.0;
  for (var k: u32 = 0u; k < n; k = k + 1u) {
    sum = sum + A[id.y * n + k] * B[k * n + id.x];
  }
  C[id.y * n + id.x] = sum;
}
`;

/**
 * Square matmul on WebGPU, else WebGL2. Wall time includes readback.
 * Correctness is max |GPU − CPU| on the same matrices.
 */
export async function runGpuMatmul(n = 32, seed = 11, options = {}) {
  const rng = mulberry32(seed);
  const A = fillUnit(n * n, rng);
  const B = fillUnit(n * n, rng);
  const cpu = matmulFp(A, B, n);
  const Af = Float32Array.from(A);
  const Bf = Float32Array.from(B);
  let gpu;
  let backend = "webgpu";
  let note = "WebGPU compute, wall time includes mapAsync readback. Not a Mali counter.";
  const skipWebgpu =
    options.forceWebgl || (typeof location !== "undefined" && new URLSearchParams(location.search).has("webgl"));
  try {
    if (skipWebgpu) throw new Error("WebGL2 forced");
    gpu = await matmulWebgpu(Af, Bf, n);
  } catch (error) {
    backend = "webgl2";
    note = `WebGPU unavailable (${error.message}). WebGL2 fragment matmul, wall time includes readPixels.`;
    gpu = matmulWebgl2(Af, Bf, n);
  }
  const err = maxAbsErr(cpu, gpu.values);
  const seconds = gpu.elapsedMs / 1000;
  return {
    backend,
    note,
    n,
    seed,
    elapsedMs: gpu.elapsedMs,
    gflops: seconds > 0 ? matmulFlops(n) / seconds / 1e9 : null,
    maxAbsErr: err,
    sink: gpu.values[0],
    pass: err < 0.05 * n,
  };
}

async function matmulWebgpu(A, B, n) {
  if (!navigator.gpu) throw new Error("navigator.gpu missing");
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("no adapter");
  const device = await adapter.requestDevice();
  const module = device.createShaderModule({ code: WGSL });
  const compiled = await module.getCompilationInfo();
  const errors = compiled.messages.filter((message) => message.type === "error");
  if (errors.length) throw new Error(errors.map((message) => message.message).join("; "));
  const bytes = n * n * 4;
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
  const bufferA = device.createBuffer({ size: bytes, usage });
  const bufferB = device.createBuffer({ size: bytes, usage });
  const bufferC = device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const readback = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const uniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(bufferA, 0, A);
  device.queue.writeBuffer(bufferB, 0, B);
  device.queue.writeBuffer(uniform, 0, new Uint32Array([n, 0, 0, 0]));
  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module, entryPoint: "main" },
  });
  const bind = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: bufferA } },
      { binding: 1, resource: { buffer: bufferB } },
      { binding: 2, resource: { buffer: bufferC } },
      { binding: 3, resource: { buffer: uniform } },
    ],
  });
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bind);
  pass.dispatchWorkgroups(Math.ceil(n / 8), Math.ceil(n / 8));
  pass.end();
  encoder.copyBufferToBuffer(bufferC, 0, readback, 0, bytes);
  const t0 = performance.now();
  device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ);
  const elapsedMs = performance.now() - t0;
  const values = new Float32Array(readback.getMappedRange().slice(0));
  readback.unmap();
  bufferA.destroy();
  bufferB.destroy();
  bufferC.destroy();
  readback.destroy();
  uniform.destroy();
  device.destroy?.();
  return { values, elapsedMs };
}

function matmulWebgl2(A, B, n) {
  if (n > 128) throw new Error("WebGL2 matmul path supports N ≤ 128");
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { antialias: false });
  if (!gl) throw new Error("WebGL2 context unavailable");
  const floatBuffer = gl.getExtension("EXT_color_buffer_float");
  if (!floatBuffer) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw new Error("EXT_color_buffer_float unavailable");
  }
  const program = link(gl, VERT, FRAG);
  const texA = texture(gl, A, n);
  const texB = texture(gl, B, n);
  const target = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, target);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, n, n, 0, gl.RED, gl.FLOAT, null);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw new Error("float framebuffer incomplete");
  }
  gl.viewport(0, 0, n, n);
  gl.useProgram(program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texA);
  gl.uniform1i(gl.getUniformLocation(program, "A"), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texB);
  gl.uniform1i(gl.getUniformLocation(program, "B"), 1);
  gl.uniform1i(gl.getUniformLocation(program, "N"), n);
  const t0 = performance.now();
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const values = new Float32Array(n * n);
  gl.readPixels(0, 0, n, n, gl.RED, gl.FLOAT, values);
  const elapsedMs = performance.now() - t0;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { values, elapsedMs };
}

const VERT = `#version 300 es
void main() {
  float x = (gl_VertexID == 1) ? 3.0 : -1.0;
  float y = (gl_VertexID == 2) ? 3.0 : -1.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D A;
uniform sampler2D B;
uniform int N;
out vec4 fragColor;
void main() {
  int j = int(gl_FragCoord.x);
  int i = int(gl_FragCoord.y);
  float sum = 0.0;
  for (int k = 0; k < 128; k++) {
    if (k >= N) break;
    float a = texelFetch(A, ivec2(k, i), 0).r;
    float b = texelFetch(B, ivec2(j, k), 0).r;
    sum += a * b;
  }
  fragColor = vec4(sum, 0.0, 0.0, 1.0);
}`;

function link(gl, vsSource, fsSource) {
  const vs = shader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = shader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "link failed");
  }
  return program;
}

function shader(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "compile failed");
  }
  return sh;
}

function texture(gl, data, n) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, n, n, 0, gl.RED, gl.FLOAT, data);
  return tex;
}
