/**
 * Safetensors reader for F32 and F16 tensors, plus deterministic shard
 * reassembly with optional WebCrypto SHA-256 verification.
 *
 * The TinyStories-8M FP16 checkpoint (39,417,097 bytes) is stored as 9
 * byte-exact shards (<= 4.5 MB each) under vendor/tinystories/shards/ so every
 * tracked repository file stays under the 5 MiB Build Standard A24 limit while
 * keeping GitHub Pages 100% self-hosted and offline-capable.
 */

export function parseSafetensors(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 8) {
    throw new RangeError("safetensors buffer must be an ArrayBuffer of at least 8 bytes");
  }
  const view = new DataView(buffer);
  const headerLenBig = view.getBigUint64(0, true);
  if (headerLenBig > BigInt(buffer.byteLength - 8)) {
    throw new RangeError(`safetensors header length (${headerLenBig}) exceeds buffer size (${buffer.byteLength})`);
  }
  const headerLen = Number(headerLenBig);
  const headerBytes = new Uint8Array(buffer, 8, headerLen);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));
  const dataStart = 8 + headerLen;
  const tensors = {};
  for (const [name, meta] of Object.entries(header)) {
    if (name === "__metadata__") continue;
    const [start, end] = meta.data_offsets;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end < start ||
      dataStart + end > buffer.byteLength
    ) {
      throw new RangeError(`safetensors tensor "${name}" offsets [${start}, ${end}] out of bounds`);
    }
    const raw = buffer.slice(dataStart + start, dataStart + end);
    if (meta.dtype === "F32") tensors[name] = new Float32Array(raw);
    else if (meta.dtype === "F16") tensors[name] = float16ToFloat32(raw);
    // BOOL causal masks and scalar bookkeeping are rebuilt in the forward pass.
  }
  return { header, tensors };
}

/** Concatenate ordered ArrayBuffer / Uint8Array shards into one exact ArrayBuffer. */
export function assembleShards(chunks, expectedBytes = null) {
  let total = 0;
  const views = chunks.map((c) => {
    const v = c instanceof Uint8Array ? c : new Uint8Array(c);
    total += v.byteLength;
    return v;
  });
  if (expectedBytes != null && total !== expectedBytes) {
    throw new RangeError(`Shard byte total (${total}) does not match expected (${expectedBytes})`);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const v of views) {
    out.set(v, offset);
    offset += v.byteLength;
  }
  return out.buffer;
}

/** Fetch sharded safetensors checkpoint in parallel and verify SHA-256 when WebCrypto is available. */
export async function fetchShardedSafetensors(baseUrl, { verifySha256 = true } = {}) {
  const manifestRes = await fetch(new URL("shards.json", baseUrl));
  if (!manifestRes.ok) {
    throw new Error(`Failed to fetch shards.json (${manifestRes.status})`);
  }
  const manifest = await manifestRes.json();
  const buffers = await Promise.all(
    manifest.shards.map(async (shard) => {
      const res = await fetch(new URL(shard.path, baseUrl));
      if (!res.ok) throw new Error(`Failed to fetch ${shard.path} (${res.status})`);
      const ab = await res.arrayBuffer();
      if (ab.byteLength !== shard.bytes) {
        throw new RangeError(`Shard ${shard.path} size ${ab.byteLength} !== expected ${shard.bytes}`);
      }
      return ab;
    }),
  );
  const full = assembleShards(buffers, manifest.totalBytes);
  if (verifySha256 && globalThis.crypto?.subtle && manifest.sha256) {
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", full));
    const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
    if (hex !== manifest.sha256) {
      throw new Error(`TinyStories SHA-256 mismatch: got ${hex}, expected ${manifest.sha256}`);
    }
  }
  return full;
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
