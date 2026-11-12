/**
 * GPT-Neo forward pass for roneneldan/TinyStories-8M.
 * Architecture from the model's config.json: 8 layers, d=256, 16 heads,
 * gelu_new, alternating global/local attention, window 256.
 * The matvec layout matches Hugging Face Linear weights stored as [out, in].
 * This is the lab's own loop. Neuralese (MIT) is the browser project that
 * established this weight layout for the same checkpoint.
 *
 * The run is JavaScript on the CPU thread. It is not the NPU 990.
 */

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

function matvec(matrix, x, out, nOut, nIn, bias) {
  for (let i = 0; i < nOut; i++) {
    let sum = bias ? bias[i] : 0;
    const row = i * nIn;
    for (let j = 0; j < nIn; j++) sum += matrix[row + j] * x[j];
    out[i] = sum;
  }
}

function geluNew(x) {
  return 0.5 * x * (1 + Math.tanh(0.7978845608028654 * (x + 0.044715 * x * x * x)));
}

export function createStream(weights) {
  const { d, heads, headDim, ff, layers, window } = TINY_STORIES;
  const keys = Array.from({ length: layers }, () => []);
  const values = Array.from({ length: layers }, () => []);
  let pos = 0;

  function step(token) {
    const x = new Float32Array(d);
    const tokenBase = token * d;
    const posBase = Math.min(pos, TINY_STORIES.maxPos - 1) * d;
    for (let i = 0; i < d; i++) x[i] = weights.wte[tokenBase + i] + weights.wpe[posBase + i];
    const h = new Float32Array(d);
    const q = new Float32Array(d);
    const k = new Float32Array(d);
    const v = new Float32Array(d);
    const ctx = new Float32Array(d);
    const attnOut = new Float32Array(d);
    const ffHidden = new Float32Array(ff);
    const ffOut = new Float32Array(d);

    for (let layer = 0; layer < layers; layer++) {
      const P = weights.layers[layer];
      layerNorm(x, P.ln1w, P.ln1b, h);
      matvec(P.q, h, q, d, d);
      matvec(P.k, h, k, d, d);
      matvec(P.v, h, v, d, d);
      keys[layer].push(k.slice());
      values[layer].push(v.slice());
      const length = keys[layer].length;
      const start = P.local ? Math.max(0, length - window) : 0;
      ctx.fill(0);
      for (let head = 0; head < heads; head++) {
        const offset = head * headDim;
        let maxScore = -Infinity;
        const scores = new Float32Array(length);
        for (let s = start; s < length; s++) {
          let dot = 0;
          const key = keys[layer][s];
          for (let j = 0; j < headDim; j++) dot += q[offset + j] * key[offset + j];
          dot *= SCALE;
          scores[s] = dot;
          if (dot > maxScore) maxScore = dot;
        }
        let sum = 0;
        for (let s = start; s < length; s++) {
          scores[s] = Math.exp(scores[s] - maxScore);
          sum += scores[s];
        }
        for (let s = start; s < length; s++) {
          const weight = scores[s] / sum;
          const value = values[layer][s];
          for (let j = 0; j < headDim; j++) ctx[offset + j] += weight * value[offset + j];
        }
      }
      matvec(P.o, ctx, attnOut, d, d, P.ob);
      for (let i = 0; i < d; i++) x[i] += attnOut[i];
      layerNorm(x, P.ln2w, P.ln2b, h);
      matvec(P.fc, h, ffHidden, ff, d, P.fcb);
      for (let i = 0; i < ff; i++) ffHidden[i] = geluNew(ffHidden[i]);
      matvec(P.proj, ffHidden, ffOut, d, ff, P.projb);
      for (let i = 0; i < d; i++) x[i] += ffOut[i];
    }
    layerNorm(x, weights.lnfW, weights.lnfB, h);
    pos += 1;
    return h;
  }

  function argmax(hidden) {
    const { vocab } = TINY_STORIES;
    const wte = weights.wte;
    let best = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < vocab; i++) {
      let sum = 0;
      const row = i * d;
      for (let j = 0; j < d; j++) sum += wte[row + j] * hidden[j];
      if (sum > bestValue) {
        bestValue = sum;
        best = i;
      }
    }
    return best;
  }

  return { step, argmax };
}

/** Greedy continuation. `promptIds` are consumed first; their last hidden state predicts the next token. */
export function greedyTokens(weights, promptIds, count, trace) {
  const stream = createStream(weights);
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
