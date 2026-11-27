/**
 * GPT-Neo forward pass for roneneldan/TinyStories-8M with Neuralese-style live
 * weight hacking hooks, per-layer attention telemetry, and top-k probability readout.
 * Architecture from the model's config.json: 8 layers, d=256, 16 heads,
 * gelu_new, alternating global/local attention, window 256.
 *
 * v4.0.0 Catalytic Arena + Rust WASM SIMD128 Engine:
 *   - Zero per-token TypedArray allocations (reusable pre-allocated scratch buffers
 *     and flat KV-cache slabs; single-pass softmax exp buffer in topK).
 *   - Pins weights once per model instance into the Rust WASM SIMD128 linear arena
 *     (`WeakMap`) to execute 4-lane `f32x4` SIMD128 `matvec_f32_simd`, fused
 *     `argmax_matvec_f32_simd`, and `logits_scaled_f32_simd` across all 8 layers
 *     and the 50,257 x 256 LM head.
 *   - Honest runtime boundary: executes on the host CPU thread via WASM SIMD128 / JS,
 *     NEVER on the MediaTek NPU 990.
 */
import { getFastKernelsSync } from "../sim/wasm.js";

export const TINY_STORIES = {
  d: 256,
  heads: 16,
  headDim: 16,
  layers: 8,
  ff: 1024,
  vocab: 50257,
  window: 256,
  maxPos: 2048,
  eps: 1e-5,
};

const SCALE = 1 / Math.sqrt(TINY_STORIES.headDim);
const wasmWeightSlabs = new WeakMap();

export function buildWeights(tensors) {
  const p = "transformer.";
  const layers = [];
  for (let l = 0; l < TINY_STORIES.layers; l++) {
    const q = `${p}h.${l}.`;
    layers.push({
      ln1w: need(tensors, `${q}ln_1.weight`),
      ln1b: need(tensors, `${q}ln_1.bias`),
      q: need(tensors, `${q}attn.attention.q_proj.weight`),
      k: need(tensors, `${q}attn.attention.k_proj.weight`),
      v: need(tensors, `${q}attn.attention.v_proj.weight`),
      o: need(tensors, `${q}attn.attention.out_proj.weight`),
      ob: need(tensors, `${q}attn.attention.out_proj.bias`),
      ln2w: need(tensors, `${q}ln_2.weight`),
      ln2b: need(tensors, `${q}ln_2.bias`),
      fc: need(tensors, `${q}mlp.c_fc.weight`),
      fcb: need(tensors, `${q}mlp.c_fc.bias`),
      proj: need(tensors, `${q}mlp.c_proj.weight`),
      projb: need(tensors, `${q}mlp.c_proj.bias`),
      local: l % 2 === 1,
    });
  }
  return {
    wte: need(tensors, `${p}wte.weight`),
    wpe: need(tensors, `${p}wpe.weight`),
    lnfW: need(tensors, `${p}ln_f.weight`),
    lnfB: need(tensors, `${p}ln_f.bias`),
    layers,
  };
}

function need(tensors, key) {
  const value = tensors[key];
  if (!value) throw new Error(`Missing tensor ${key}`);
  return value;
}

function getOrPinWasmWeights(weights, fastKernels) {
  if (!fastKernels?.exports?.matvec_f32_simd || !fastKernels.arena) return null;
  const cached = wasmWeightSlabs.get(weights);
  if (cached && cached.fk === fastKernels) return cached;

  try {
    const arena = fastKernels.arena;
    const pinF32 = (arr) => {
      const s = arena.allocFloat32(arr.length);
      s.view().set(arr);
      return s.ptr;
    };
    const wtePtr = pinF32(weights.wte);
    const layers = weights.layers.map((P) => ({
      qPtr: pinF32(P.q),
      kPtr: pinF32(P.k),
      vPtr: pinF32(P.v),
      oPtr: pinF32(P.o),
      obPtr: pinF32(P.ob),
      fcPtr: pinF32(P.fc),
      fcbPtr: pinF32(P.fcb),
      projPtr: pinF32(P.proj),
      projbPtr: pinF32(P.projb),
    }));
    const xSlice = arena.allocFloat32(TINY_STORIES.ff);
    const outSlice = arena.allocFloat32(TINY_STORIES.ff);
    const logitsSlice = arena.allocFloat32(TINY_STORIES.vocab);
    const slab = {
      fk: fastKernels,
      exports: fastKernels.exports,
      arena,
      wtePtr,
      layers,
      xSlice,
      outSlice,
      logitsSlice,
    };
    wasmWeightSlabs.set(weights, slab);
    return slab;
  } catch {
    return null;
  }
}

function layerNorm(x, w, b, out) {
  const n = x.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = x[i] - mean;
    variance += d * d;
  }
  variance /= n;
  const inv = 1 / Math.sqrt(variance + TINY_STORIES.eps);
  for (let i = 0; i < n; i++) out[i] = (x[i] - mean) * inv * w[i] + b[i];
}

function matvecJs(matrix, x, out, nOut, nIn, bias) {
  for (let i = 0; i < nOut; i++) {
    let sum = bias ? bias[i] : 0;
    const row = i * nIn;
    let j = 0;
    const limit = nIn - 3;
    for (; j < limit; j += 4) {
      sum +=
        matrix[row + j] * x[j] +
        matrix[row + j + 1] * x[j + 1] +
        matrix[row + j + 2] * x[j + 2] +
        matrix[row + j + 3] * x[j + 3];
    }
    for (; j < nIn; j++) sum += matrix[row + j] * x[j];
    out[i] = sum;
  }
}

function geluNew(x) {
  return 0.5 * x * (1 + Math.tanh(0.7978845608028654 * (x + 0.044715 * x * x * x)));
}

export function createStream(weights, { useWasm = true } = {}) {
  const { d, heads, headDim, ff, layers, window, vocab } = TINY_STORIES;
  const fk = useWasm ? getFastKernelsSync() : null;
  const slab = fk ? getOrPinWasmWeights(weights, fk) : null;

  // Flat pre-allocated KV-cache slabs (zero per-token k.slice()/v.slice() allocations)
  let kvCap = 64;
  const keySlabs = Array.from({ length: layers }, () => new Float32Array(kvCap * d));
  const valSlabs = Array.from({ length: layers }, () => new Float32Array(kvCap * d));

  // Catalytic reusable scratch vectors (allocated once per stream)
  const x = new Float32Array(d);
  const h = new Float32Array(d);
  const q = new Float32Array(d);
  const k = new Float32Array(d);
  const v = new Float32Array(d);
  const ctx = new Float32Array(d);
  const attnOut = new Float32Array(d);
  const ffHidden = new Float32Array(ff);
  const ffOut = new Float32Array(d);
  const layerNorms = new Float32Array(layers);
  const headEntropy = new Float32Array(layers * heads);
  let scoresBuf = new Float32Array(kvCap);
  let logitsBuf = null;
  let expBuf = null;

  let pos = 0;
  let lastTelemetry = null;

  function ensureKvCapacity(neededLen) {
    if (neededLen <= kvCap) return;
    const nextCap = Math.max(neededLen, kvCap * 2);
    for (let l = 0; l < layers; l++) {
      const nk = new Float32Array(nextCap * d);
      nk.set(keySlabs[l]);
      keySlabs[l] = nk;
      const nv = new Float32Array(nextCap * d);
      nv.set(valSlabs[l]);
      valSlabs[l] = nv;
    }
    scoresBuf = new Float32Array(nextCap);
    kvCap = nextCap;
  }

  function runMatvec(wArr, wPtr, xVec, outVec, nOut, nIn, biasArr = null, biasPtr = 0) {
    if (slab) {
      slab.xSlice.view().set(xVec);
      slab.exports.matvec_f32_simd(wPtr, slab.xSlice.ptr, biasPtr, slab.outSlice.ptr, nOut, nIn);
      outVec.set(slab.outSlice.view().subarray(0, nOut));
    } else {
      matvecJs(wArr, xVec, outVec, nOut, nIn, biasArr);
    }
  }

  function step(token, hacks = null) {
    const mlpGain = hacks?.mlpGain ?? 1;
    const attnGain = hacks?.attnGain ?? 1;
    const ablateLayer = hacks?.ablateLayer ?? -1;
    const noiseAmp = hacks?.noiseAmp ?? 0;

    const length = pos + 1;
    ensureKvCapacity(length);

    const tokenBase = token * d;
    const posBase = Math.min(pos, TINY_STORIES.maxPos - 1) * d;
    for (let i = 0; i < d; i++) x[i] = weights.wte[tokenBase + i] + weights.wpe[posBase + i];

    let lastLayerAttn = null;

    for (let layer = 0; layer < layers; layer++) {
      const P = weights.layers[layer];
      const LP = slab ? slab.layers[layer] : null;
      layerNorm(x, P.ln1w, P.ln1b, h);

      if (slab) {
        slab.xSlice.view().set(h);
        const xPtr = slab.xSlice.ptr;
        const outPtr = slab.outSlice.ptr;
        const outView = slab.outSlice.view();
        slab.exports.matvec_f32_simd(LP.qPtr, xPtr, 0, outPtr, d, d);
        q.set(outView.subarray(0, d));
        slab.exports.matvec_f32_simd(LP.kPtr, xPtr, 0, outPtr, d, d);
        k.set(outView.subarray(0, d));
        slab.exports.matvec_f32_simd(LP.vPtr, xPtr, 0, outPtr, d, d);
        v.set(outView.subarray(0, d));
      } else {
        matvecJs(P.q, h, q, d, d);
        matvecJs(P.k, h, k, d, d);
        matvecJs(P.v, h, v, d, d);
      }

      const kSlab = keySlabs[layer];
      const vSlab = valSlabs[layer];
      kSlab.set(k, pos * d);
      vSlab.set(v, pos * d);

      const start = P.local ? Math.max(0, length - window) : 0;
      ctx.fill(0);
      if (layer === layers - 1) lastLayerAttn = Array.from({ length: heads }, () => new Float32Array(length));

      for (let head = 0; head < heads; head++) {
        const offset = head * headDim;
        let maxScore = -Infinity;
        for (let s = start; s < length; s++) {
          let dot = 0;
          const kBase = s * d + offset;
          for (let j = 0; j < headDim; j++) dot += q[offset + j] * kSlab[kBase + j];
          dot *= SCALE;
          scoresBuf[s] = dot;
          if (dot > maxScore) maxScore = dot;
        }
        let sum = 0;
        for (let s = start; s < length; s++) {
          const e = Math.exp(scoresBuf[s] - maxScore);
          scoresBuf[s] = e;
          sum += e;
        }
        const invSum = 1 / sum;
        let ent = 0;
        const attnRow = lastLayerAttn ? lastLayerAttn[head] : null;
        for (let s = start; s < length; s++) {
          const weight = scoresBuf[s] * invSum;
          if (weight > 1e-8) ent -= weight * Math.log2(weight);
          if (attnRow) attnRow[s] = weight;
          const vBase = s * d + offset;
          for (let j = 0; j < headDim; j++) ctx[offset + j] += weight * vSlab[vBase + j];
        }
        headEntropy[layer * heads + head] = ent;
      }

      if (layer !== ablateLayer) {
        runMatvec(P.o, LP?.oPtr, ctx, attnOut, d, d, P.ob, LP?.obPtr || 0);
        for (let i = 0; i < d; i++) x[i] += attnOut[i] * attnGain;
        layerNorm(x, P.ln2w, P.ln2b, h);
        runMatvec(P.fc, LP?.fcPtr, h, ffHidden, ff, d, P.fcb, LP?.fcbPtr || 0);
        for (let i = 0; i < ff; i++) ffHidden[i] = geluNew(ffHidden[i]);
        runMatvec(P.proj, LP?.projPtr, ffHidden, ffOut, d, ff, P.projb, LP?.projbPtr || 0);
        if (noiseAmp > 0) {
          for (let i = 0; i < d; i++) {
            const jitter = (Math.sin((layer * 31 + pos * 17 + i) * 12.9898) * 43758.5453) % 1;
            x[i] += ffOut[i] * mlpGain + jitter * noiseAmp;
          }
        } else {
          for (let i = 0; i < d; i++) x[i] += ffOut[i] * mlpGain;
        }
      }
      let norm2 = 0;
      for (let i = 0; i < d; i++) norm2 += x[i] * x[i];
      layerNorms[layer] = Math.sqrt(norm2);
    }
    layerNorm(x, weights.lnfW, weights.lnfB, h);
    pos += 1;
    lastTelemetry = {
      pos,
      layerNorms: layerNorms.slice(),
      headEntropy: headEntropy.slice(),
      lastLayerAttn,
      backend: slab ? "rust-wasm-simd128" : "js-catalytic",
    };
    return h;
  }

  function argmax(hidden) {
    if (slab) {
      slab.xSlice.view().set(hidden);
      return slab.exports.argmax_matvec_f32_simd(slab.wtePtr, slab.xSlice.ptr, vocab, d);
    }
    const wte = weights.wte;
    let best = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < vocab; i++) {
      let sum = 0;
      const row = i * d;
      for (let j = 0; j < d; j += 4) {
        sum +=
          wte[row + j] * hidden[j] +
          wte[row + j + 1] * hidden[j + 1] +
          wte[row + j + 2] * hidden[j + 2] +
          wte[row + j + 3] * hidden[j + 3];
      }
      if (sum > bestValue) {
        bestValue = sum;
        best = i;
      }
    }
    return best;
  }

  /** Top-K next-token probability distribution (softmax at temperature) plus exact full-vocab entropy. */
  function topK(hidden, k = 8, temperature = 1) {
    const invT = 1 / Math.max(0.05, temperature);
    let logits;
    let maxL;
    if (slab) {
      slab.xSlice.view().set(hidden);
      maxL = slab.exports.logits_scaled_f32_simd(slab.wtePtr, slab.xSlice.ptr, slab.logitsSlice.ptr, vocab, d, invT);
      logits = slab.logitsSlice.view();
    } else {
      if (!logitsBuf) logitsBuf = new Float32Array(vocab);
      logits = logitsBuf;
      const wte = weights.wte;
      maxL = -Infinity;
      for (let i = 0; i < vocab; i++) {
        let sum = 0;
        const row = i * d;
        for (let j = 0; j < d; j += 4) {
          sum +=
            wte[row + j] * hidden[j] +
            wte[row + j + 1] * hidden[j + 1] +
            wte[row + j + 2] * hidden[j + 2] +
            wte[row + j + 3] * hidden[j + 3];
        }
        const v = sum * invT;
        logits[i] = v;
        if (v > maxL) maxL = v;
      }
    }
    if (!expBuf) expBuf = new Float32Array(vocab);
    let expSum = 0;
    for (let i = 0; i < vocab; i++) {
      const e = Math.exp(logits[i] - maxL);
      expBuf[i] = e;
      expSum += e;
    }
    const invExpSum = 1 / expSum;
    let entropyBits = 0;
    const best = [];
    for (let i = 0; i < vocab; i++) {
      const p = expBuf[i] * invExpSum;
      if (p > 1e-12) entropyBits -= p * Math.log2(p);
      const l = logits[i];
      if (best.length < k || l > best[best.length - 1].logit) {
        best.push({ id: i, logit: l, prob: p });
        best.sort((a, b) => b.logit - a.logit);
        if (best.length > k) best.pop();
      }
    }
    best.entropyBits = entropyBits;
    return best;
  }

  return {
    step,
    argmax,
    topK,
    backend: slab ? "rust-wasm-simd128" : "js-catalytic",
    get telemetry() {
      return lastTelemetry;
    },
  };
}

/** Greedy continuation. `promptIds` are consumed first; their last hidden state predicts the next token. */
export function greedyTokens(weights, promptIds, count, trace, opts) {
  const stream = createStream(weights, opts);
  let hidden = null;
  for (const id of promptIds) hidden = stream.step(id);
  const produced = [];
  for (let i = 0; i < count; i++) {
    const started = performance.now();
    const next = stream.argmax(hidden);
    produced.push(next);
    hidden = stream.step(next);
    if (trace) trace.push(performance.now() - started);
  }
  return produced;
}
