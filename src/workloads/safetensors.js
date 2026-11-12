/**
 * Safetensors reader for F32 and F16 tensors.
 * The TinyStories file vendored with this lab is F16 so it stays under GitHub's
 * 100 MB file limit. Values are expanded to Float32 for the matvecs.
 */

export function parseSafetensors(buffer) {
  const view = new DataView(buffer);
  const headerLen = Number(view.getBigUint64(0, true));
  const headerBytes = new Uint8Array(buffer, 8, headerLen);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));
  const dataStart = 8 + headerLen;
  const tensors = {};
  for (const [name, meta] of Object.entries(header)) {
    if (name === "__metadata__") continue;
    const [start, end] = meta.data_offsets;
    const raw = buffer.slice(dataStart + start, dataStart + end);
    if (meta.dtype === "F32") tensors[name] = new Float32Array(raw);
    else if (meta.dtype === "F16") tensors[name] = float16ToFloat32(raw);
    // BOOL causal masks and scalar bookkeeping are rebuilt in the forward pass.
  }
  return { header, tensors };
}

export function float16ToFloat32(buffer) {
  const src = new Uint16Array(buffer);
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = halfToFloat(src[i]);
  return out;
}

export function floatToHalf(value) {
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  f32[0] = value;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  const mant = x & 0x7fffff;
  const exp = (x >>> 23) & 0xff;
  if (exp === 255) return sign | 0x7c00 | (mant ? 0x200 : 0);
  const rounded = mant + 0x1000;
  let exp16 = exp - 127 + 15;
  let mant16 = rounded >> 13;
  if (rounded & 0x800000) {
    mant16 = 0;
    exp16 += 1;
  }
  if (exp16 >= 31) return sign | 0x7c00;
  if (exp16 <= 0) return sign;
  return sign | (exp16 << 10) | (mant16 & 0x3ff);
}

function halfToFloat(half) {
  const sign = (half & 0x8000) << 16;
  const exp = (half >> 10) & 0x1f;
  const mant = half & 0x3ff;
  const u32 = new Uint32Array(1);
  const f32 = new Float32Array(u32.buffer);
  if (exp === 0) {
    if (mant === 0) {
      u32[0] = sign;
      return f32[0];
    }
    let e = -1;
    let m = mant;
    do {
      e += 1;
      m <<= 1;
    } while ((m & 0x400) === 0);
    m &= 0x3ff;
    u32[0] = sign | ((127 - 15 + 1 - e) << 23) | (m << 13);
    return f32[0];
  }
  if (exp === 31) {
    u32[0] = sign | 0x7f800000 | (mant << 13);
    return f32[0];
  }
  u32[0] = sign | ((exp + (127 - 15)) << 23) | (mant << 13);
  return f32[0];
}
