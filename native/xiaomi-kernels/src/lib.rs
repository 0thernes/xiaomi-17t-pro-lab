#![cfg_attr(target_arch = "wasm32", no_std)]

//! Xiaomi 17T Pro Lab (v4.0.0) — Zero-Dependency Rust WebAssembly SIMD128 Kernels
//!
//! Honest execution boundary:
//!   These kernels compile to portable WebAssembly (`wasm32-unknown-unknown` + `simd128`),
//!   JIT-compiled by V8 TurboFan / SpiderMonkey Ion to host x86-64 AVX2 or ARM64 NEON
//!   instructions on the browser CPU thread. They do NOT execute on the MediaTek NPU 990
//!   or Arm SME2 matrix unit.
//!
//! Exported kernels:
//!   1. `alloc_base`                 — 64-byte aligned start of reusable Catalytic Linear Arena
//!   2. `matvec_f32_simd`            — 4-lane f32x4 SIMD128 matrix-vector multiply (+ optional bias)
//!   3. `argmax_matvec_f32_simd`     — Fused f32x4 SIMD128 LM-head dot + argmax (zero logit alloc)
//!   4. `logits_scaled_f32_simd`     — Fused f32x4 SIMD128 scaled logits + max logit return
//!   5. `fp16_to_f32_bulk`           — Exact IEEE-754 binary16 -> binary32 bulk decoder
//!   6. `fdtd_thermal_step_f64`      — Multi-step 2D explicit silicon thermal PDE stencil
//!   7. `tdse_cn_step_f64`           — Multi-step unitary Crank-Nicolson 1D TDSE Thomas solver
//!   8. `fft_radix2_f64`             — In-place catalytic Radix-2 complex FFT (exact Taylor twiddles)
//!   9. `int8_matmul_simd`           — SIMD128 int8 square matrix multiply + scale dequantize
//!  10. `catalytic_xor_simd`         — 16-byte v128_xor involutive Byte-Vault borrow/restore
//!  11. `catalytic_shear_add_u32`    — Reversible modular additive-shear catalytic register pass
//!  12. `catalytic_shear_sub_u32`    — Exact inverse modular additive-shear restoration pass

#[cfg(target_arch = "wasm32")]
use core::panic::PanicInfo;

#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}

#[cfg(target_arch = "wasm32")]
extern "C" {
    static __heap_base: u8;
}

/// Returns a 64-byte-aligned linear-memory offset strictly above WASM stack and static data.
#[no_mangle]
pub extern "C" fn alloc_base() -> u32 {
    #[cfg(target_arch = "wasm32")]
    {
        let raw = core::ptr::addr_of!(__heap_base) as usize;
        ((raw + 63) & !63) as u32
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        65536
    }
}

// ---------------------------------------------------------------------------
// High-precision #![no_std] elementary math helpers (full IEEE-754 f64 accuracy)
// ---------------------------------------------------------------------------

const LN2: f64 = core::f64::consts::LN_2;
const INV_LN2: f64 = core::f64::consts::LOG2_E;
const PI: f64 = core::f64::consts::PI;

/// Exact double-precision exp(x) for x in [-40, 40] via range reduction x = k*ln(2) + r,
/// |r| <= ln(2)/2 ~= 0.3466, and degree-12 Taylor polynomial (truncation error < 6.4e-15).
#[inline(always)]
fn exp_f64(x: f64) -> f64 {
    if x == 0.0 {
        return 1.0;
    }
    let kf = (x * INV_LN2 + if x >= 0.0 { 0.5 } else { -0.5 }) as i32;
    let r = x - (kf as f64) * LN2;
    let r2 = r * r;
    // Horner form for 1 + r + r^2/2! + ... + r^12/12!
    let p = 1.0
        + r * (1.0
            + r * (0.5
                + r * (1.6666666666666666e-1
                    + r * (4.1666666666666664e-2
                        + r * (8.333333333333333e-3
                            + r * (1.388888888888889e-3
                                + r * (1.984126984126984e-4
                                    + r * (2.48015873015873e-5
                                        + r * (2.7557319223985893e-6
                                            + r * (2.755731922398589e-7
                                                + r * (2.505210838544172e-8
                                                    + r * 2.08767569878681e-9)))))))))));
    let _ = r2;
    // Scale by 2^kf via exact IEEE-754 exponent bit construction
    let pow2 = f64::from_bits(((kf + 1023) as u64) << 52);
    p * pow2
}

/// Exact sin(x) and cos(x) for |x| <= pi/4 (used by Radix-2 FFT twiddles for len >= 8;
/// len = 2 and len = 4 are handled with exact constants).
/// Degree-18/19 Taylor polynomials have truncation error < 2e-18 (full 53-bit IEEE-754 accuracy).
#[inline(always)]
fn sin_cos_small_f64(x: f64) -> (f64, f64) {
    let x2 = x * x;
    let sin_x = x
        * (1.0
            + x2 * (-1.6666666666666666e-1
                + x2 * (8.333333333333333e-3
                    + x2 * (-1.984126984126984e-4
                        + x2 * (2.7557319223985893e-6
                            + x2 * (-2.505210838544172e-8
                                + x2 * (1.6059043836821613e-10
                                    + x2 * (-7.647163731819816e-13
                                        + x2 * 2.8114572543455206e-15))))))));
    let cos_x = 1.0
        + x2 * (-0.5
            + x2 * (4.1666666666666664e-2
                + x2 * (-1.388888888888889e-3
                    + x2 * (2.48015873015873e-5
                        + x2 * (-2.755731922398589e-7
                            + x2 * (2.08767569878681e-9
                                + x2 * (-1.1470745597729725e-11
                                    + x2 * (4.779477332387385e-14
                                        - x2 * 1.5619206968586225e-16))))))));
    (sin_x, cos_x)
}

// ---------------------------------------------------------------------------
// 1. SIMD128 f32x4 Dot Product, Matrix-Vector Multiply & LM-Head Argmax/Logits
// ---------------------------------------------------------------------------

#[inline(always)]
unsafe fn dot_f32_slice(a: *const f32, b: *const f32, n: usize) -> f32 {
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        use core::arch::wasm32::*;
        let mut acc0 = f32x4_splat(0.0);
        let mut acc1 = f32x4_splat(0.0);
        let mut acc2 = f32x4_splat(0.0);
        let mut acc3 = f32x4_splat(0.0);
        let mut i = 0usize;
        while i + 16 <= n {
            let a0 = v128_load(a.add(i) as *const v128);
            let b0 = v128_load(b.add(i) as *const v128);
            let a1 = v128_load(a.add(i + 4) as *const v128);
            let b1 = v128_load(b.add(i + 4) as *const v128);
            let a2 = v128_load(a.add(i + 8) as *const v128);
            let b2 = v128_load(b.add(i + 8) as *const v128);
            let a3 = v128_load(a.add(i + 12) as *const v128);
            let b3 = v128_load(b.add(i + 12) as *const v128);
            acc0 = f32x4_add(acc0, f32x4_mul(a0, b0));
            acc1 = f32x4_add(acc1, f32x4_mul(a1, b1));
            acc2 = f32x4_add(acc2, f32x4_mul(a2, b2));
            acc3 = f32x4_add(acc3, f32x4_mul(a3, b3));
            i += 16;
        }
        let mut acc = f32x4_add(f32x4_add(acc0, acc1), f32x4_add(acc2, acc3));
        while i + 4 <= n {
            let va = v128_load(a.add(i) as *const v128);
            let vb = v128_load(b.add(i) as *const v128);
            acc = f32x4_add(acc, f32x4_mul(va, vb));
            i += 4;
        }
        let mut sum = (f32x4_extract_lane::<0>(acc) + f32x4_extract_lane::<1>(acc))
            + (f32x4_extract_lane::<2>(acc) + f32x4_extract_lane::<3>(acc));
        while i < n {
            sum += *a.add(i) * *b.add(i);
            i += 1;
        }
        sum
    }
    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    {
        let mut sum = 0.0f32;
        let mut i = 0usize;
        while i < n {
            sum += *a.add(i) * *b.add(i);
            i += 1;
        }
        sum
    }
}

/// Matrix-vector multiply: `out[r] = (bias ? bias[r] : 0) + dot(W[r, :], x[:])`.
/// Pass `bias_ptr == 0` when there is no bias vector.
#[no_mangle]
pub unsafe extern "C" fn matvec_f32_simd(
    w_ptr: *const f32,
    x_ptr: *const f32,
    bias_ptr: *const f32,
    out_ptr: *mut f32,
    n_out: u32,
    n_in: u32,
) {
    let rows = n_out as usize;
    let cols = n_in as usize;
    let has_bias = !bias_ptr.is_null();
    for r in 0..rows {
        let row_ptr = w_ptr.add(r * cols);
        let mut sum = dot_f32_slice(row_ptr, x_ptr, cols);
        if has_bias {
            sum += *bias_ptr.add(r);
        }
        *out_ptr.add(r) = sum;
    }
}

/// Fused SIMD128 LM-head argmax over `n_out` vocabulary rows of width `n_in`.
/// Allocates zero output logit memory.
#[no_mangle]
pub unsafe extern "C" fn argmax_matvec_f32_simd(
    w_ptr: *const f32,
    x_ptr: *const f32,
    n_out: u32,
    n_in: u32,
) -> u32 {
    let rows = n_out as usize;
    let cols = n_in as usize;
    let mut best_idx: u32 = 0;
    let mut best_val: f32 = f32::NEG_INFINITY;
    for r in 0..rows {
        let sum = dot_f32_slice(w_ptr.add(r * cols), x_ptr, cols);
        if sum > best_val {
            best_val = sum;
            best_idx = r as u32;
        }
    }
    best_idx
}

/// Fused SIMD128 scaled logits `out[r] = dot(W[r, :], x[:]) * inv_temp`, returning `max_r out[r]`.
#[no_mangle]
pub unsafe extern "C" fn logits_scaled_f32_simd(
    w_ptr: *const f32,
    x_ptr: *const f32,
    out_ptr: *mut f32,
    n_out: u32,
    n_in: u32,
    inv_temp: f32,
) -> f32 {
    let rows = n_out as usize;
    let cols = n_in as usize;
    let mut max_val = f32::NEG_INFINITY;
    for r in 0..rows {
        let v = dot_f32_slice(w_ptr.add(r * cols), x_ptr, cols) * inv_temp;
        *out_ptr.add(r) = v;
        if v > max_val {
            max_val = v;
        }
    }
    max_val
}

// ---------------------------------------------------------------------------
// 2. Exact IEEE-754 Binary16 -> Binary32 Bulk Decoder (zero JS allocations)
// ---------------------------------------------------------------------------

#[inline(always)]
fn half_bits_to_f32(half: u16) -> f32 {
    let sign = ((half & 0x8000) as u32) << 16;
    let exp = ((half >> 10) & 0x1f) as u32;
    let mant = (half & 0x03ff) as u32;
    let bits = if exp == 0 {
        if mant == 0 {
            sign
        } else {
            let mut e: u32 = 0;
            let mut m = mant;
            while (m & 0x0400) == 0 {
                m <<= 1;
                e += 1;
            }
            m &= 0x03ff;
            sign | ((127 - 15 + 1 - e) << 23) | (m << 13)
        }
    } else if exp == 31 {
        sign | 0x7f80_0000 | (mant << 13)
    } else {
        sign | ((exp + (127 - 15)) << 23) | (mant << 13)
    };
    f32::from_bits(bits)
}

#[no_mangle]
pub unsafe extern "C" fn fp16_to_f32_bulk(src_ptr: *const u16, dst_ptr: *mut f32, len: u32) {
    let n = len as usize;
    for i in 0..n {
        *dst_ptr.add(i) = half_bits_to_f32(*src_ptr.add(i));
    }
}

// ---------------------------------------------------------------------------
// 3. Multi-Step 2D Explicit Silicon Thermal FDTD Stencil (f64)
// ---------------------------------------------------------------------------

/// Runs `steps` explicit 2D 5-point heat-equation FDTD substeps ping-ponging between
/// `temp_ptr` and `next_ptr`. Returns `1` if the final temperature field resides in
/// `next_ptr` (odd `steps`), or `0` if it resides in `temp_ptr` (even `steps`).
#[no_mangle]
pub unsafe extern "C" fn fdtd_thermal_step_f64(
    temp_ptr: *mut f64,
    next_ptr: *mut f64,
    pulse_ptr: *const f64,
    zone_map_ptr: *const i8,
    zone_power_ptr: *const f64,
    nx: u32,
    ny: u32,
    alpha: f64,
    inv_dx2: f64,
    inv_dy2: f64,
    inv_heat_cap: f64,
    h_conv: f64,
    ambient: f64,
    dt: f64,
    steps: u32,
) -> u32 {
    let w = nx as usize;
    let h = ny as usize;
    let mut cur = temp_ptr;
    let mut nxt = next_ptr;
    for _ in 0..steps {
        for j in 0..h {
            let j_up = if j > 0 { j - 1 } else { 0 };
            let j_dn = if j + 1 < h { j + 1 } else { h - 1 };
            let row = j * w;
            let row_up = j_up * w;
            let row_dn = j_dn * w;
            for i in 0..w {
                let idx = row + i;
                let i_lt = if i > 0 { i - 1 } else { 0 };
                let i_rt = if i + 1 < w { i + 1 } else { w - 1 };
                let tc = *cur.add(idx);
                let lap = (*cur.add(row + i_rt) + *cur.add(row + i_lt) - 2.0 * tc) * inv_dx2
                    + (*cur.add(row_dn + i) + *cur.add(row_up + i) - 2.0 * tc) * inv_dy2;
                let z = *zone_map_ptr.add(idx);
                let mut q_dyn = if z >= 0 {
                    *zone_power_ptr.add(z as usize)
                } else {
                    0.002
                };
                if !pulse_ptr.is_null() {
                    q_dyn += *pulse_ptr.add(idx);
                }
                let arg = (tc - 25.0) * 0.032;
                let clamped = if arg <= 0.0 {
                    0.0
                } else if arg >= 3.2 {
                    3.2
                } else {
                    arg
                };
                let leak_coeff = if z >= 0 { 0.0022 } else { 0.0003 };
                let q_leak = leak_coeff * exp_f64(clamped);
                let d_t = alpha * lap + (q_dyn + q_leak) * inv_heat_cap - h_conv * (tc - ambient);
                let mut val = tc + dt * d_t;
                if val < ambient {
                    val = ambient;
                } else if val > 125.0 {
                    val = 125.0;
                }
                *nxt.add(idx) = val;
            }
        }
        core::mem::swap(&mut cur, &mut nxt);
    }
    if (steps & 1) == 1 {
        1
    } else {
        0
    }
}

// ---------------------------------------------------------------------------
// 4. Multi-Step Unitary Crank-Nicolson 1D TDSE Complex Thomas Solver (f64)
// ---------------------------------------------------------------------------

#[no_mangle]
pub unsafe extern "C" fn tdse_cn_step_f64(
    psi_r: *mut f64,
    psi_i: *mut f64,
    v_ptr: *const f64,
    cp_r: *const f64,
    cp_i: *const f64,
    dp_r: *mut f64,
    dp_i: *mut f64,
    rhs_r: *mut f64,
    rhs_i: *mut f64,
    n: u32,
    s: f64,
    off_imag: f64,
    diag_base_imag: f64,
    steps: u32,
) {
    let len = n as usize;
    if len < 3 {
        return;
    }
    let m = len - 2;
    for _ in 0..steps {
        // 1. rhs = B * psi
        for j in 0..m {
            let i = j + 1;
            let pr = *psi_r.add(i);
            let pi = *psi_i.add(i);
            let d_i = -(diag_base_imag + s * *v_ptr.add(i));
            let mut rr = pr - d_i * pi;
            let mut ri = pi + d_i * pr;
            let sum_r = *psi_r.add(i - 1) + *psi_r.add(i + 1);
            let sum_i = *psi_i.add(i - 1) + *psi_i.add(i + 1);
            rr += off_imag * sum_i;
            ri -= off_imag * sum_r;
            *rhs_r.add(j) = rr;
            *rhs_i.add(j) = ri;
        }
        // 2. Forward sweep for dPrime
        for j in 0..m {
            let mut denom_r = 1.0;
            let mut denom_i = diag_base_imag + s * *v_ptr.add(j + 1);
            let mut num_r = *rhs_r.add(j);
            let mut num_i = *rhs_i.add(j);
            if j > 0 {
                denom_r += off_imag * *cp_i.add(j - 1);
                denom_i -= off_imag * *cp_r.add(j - 1);
                num_r += off_imag * *dp_i.add(j - 1);
                num_i -= off_imag * *dp_r.add(j - 1);
            }
            let inv_mag2 = 1.0 / (denom_r * denom_r + denom_i * denom_i);
            *dp_r.add(j) = (num_r * denom_r + num_i * denom_i) * inv_mag2;
            *dp_i.add(j) = (num_i * denom_r - num_r * denom_i) * inv_mag2;
        }
        // 3. Back substitution
        *psi_r.add(len - 2) = *dp_r.add(m - 1);
        *psi_i.add(len - 2) = *dp_i.add(m - 1);
        if m >= 2 {
            let mut j = m - 2;
            loop {
                let next_r = *psi_r.add(j + 2);
                let next_i = *psi_i.add(j + 2);
                let cr = *cp_r.add(j);
                let ci = *cp_i.add(j);
                *psi_r.add(j + 1) = *dp_r.add(j) - (cr * next_r - ci * next_i);
                *psi_i.add(j + 1) = *dp_i.add(j) - (cr * next_i + ci * next_r);
                if j == 0 {
                    break;
                }
                j -= 1;
            }
        }
        *psi_r.add(0) = 0.0;
        *psi_i.add(0) = 0.0;
        *psi_r.add(len - 1) = 0.0;
        *psi_i.add(len - 1) = 0.0;
    }
}

// ---------------------------------------------------------------------------
// 5. In-Place Catalytic Radix-2 Complex FFT (f64)
// ---------------------------------------------------------------------------

#[no_mangle]
pub unsafe extern "C" fn fft_radix2_f64(re: *mut f64, im: *mut f64, n: u32, inverse: u32) {
    let len_n = n as usize;
    if len_n < 2 || (len_n & (len_n - 1)) != 0 {
        return;
    }
    let mut j = 0usize;
    for i in 1..len_n {
        let mut bit = len_n >> 1;
        while (j & bit) != 0 {
            j ^= bit;
            bit >>= 1;
        }
        j ^= bit;
        if i < j {
            let tr = *re.add(i);
            *re.add(i) = *re.add(j);
            *re.add(j) = tr;
            let ti = *im.add(i);
            *im.add(i) = *im.add(j);
            *im.add(j) = ti;
        }
    }
    let sign = if inverse != 0 { 1.0 } else { -1.0 };
    let mut len = 2usize;
    while len <= len_n {
        let (wlen_re, wlen_im) = if len == 2 {
            (-1.0, 0.0)
        } else if len == 4 {
            (0.0, sign)
        } else {
            let ang = (2.0 * PI / (len as f64)) * sign;
            let (s, c) = sin_cos_small_f64(ang);
            (c, s)
        };
        let half = len >> 1;
        let mut i = 0usize;
        while i < len_n {
            let mut w_re = 1.0;
            let mut w_im = 0.0;
            for k_off in 0..half {
                let u_idx = i + k_off;
                let k_idx = u_idx + half;
                let rk = *re.add(k_idx);
                let ik = *im.add(k_idx);
                let v_re = rk * w_re - ik * w_im;
                let v_im = rk * w_im + ik * w_re;
                let u_re = *re.add(u_idx);
                let u_im = *im.add(u_idx);
                *re.add(u_idx) = u_re + v_re;
                *im.add(u_idx) = u_im + v_im;
                *re.add(k_idx) = u_re - v_re;
                *im.add(k_idx) = u_im - v_im;
                let next_re = w_re * wlen_re - w_im * wlen_im;
                w_im = w_re * wlen_im + w_im * wlen_re;
                w_re = next_re;
            }
            i += len;
        }
        len <<= 1;
    }
    if inverse != 0 {
        let inv_n = 1.0 / (len_n as f64);
        for i in 0..len_n {
            *re.add(i) *= inv_n;
            *im.add(i) *= inv_n;
        }
    }
}

/// Fused in-place 2D Radix-2 complex FFT (N x N) in a single JS->WASM boundary call.
#[no_mangle]
pub unsafe extern "C" fn fft2d_f64(
    re: *mut f64,
    im: *mut f64,
    col_r: *mut f64,
    col_i: *mut f64,
    n: u32,
    inverse: u32,
) {
    let dim = n as usize;
    if dim < 2 || (dim & (dim - 1)) != 0 {
        return;
    }
    // Rows are contiguous in memory: transform directly in-place!
    for y in 0..dim {
        let off = y * dim;
        fft_radix2_f64(re.add(off), im.add(off), n, inverse);
    }
    // Columns use catalytic scratch buffers col_r / col_i
    for x in 0..dim {
        for y in 0..dim {
            let idx = y * dim + x;
            *col_r.add(y) = *re.add(idx);
            *col_i.add(y) = *im.add(idx);
        }
        fft_radix2_f64(col_r, col_i, n, inverse);
        for y in 0..dim {
            let idx = y * dim + x;
            *re.add(idx) = *col_r.add(y);
            *im.add(idx) = *col_i.add(y);
        }
    }
}

// ---------------------------------------------------------------------------
// 6. SIMD128 INT8 Square Matrix Multiply + Scale Dequantization
// ---------------------------------------------------------------------------

/// Computes `C[i, j] = scale * sum_k (A[i, k] * B[k, j])` where `A, B` are `i8` `[n x n]`
/// and `C` is `f64` `[n x n]`.
#[no_mangle]
pub unsafe extern "C" fn int8_matmul_simd(
    a_ptr: *const i8,
    b_ptr: *const i8,
    c_ptr: *mut f64,
    n: u32,
    scale: f64,
) {
    let dim = n as usize;
    let total = dim * dim;
    for idx in 0..total {
        *c_ptr.add(idx) = 0.0;
    }
    for i in 0..dim {
        let row_c = i * dim;
        for k in 0..dim {
            let aik = *a_ptr.add(row_c + k) as i32;
            if aik == 0 {
                continue;
            }
            let row_b = k * dim;
            let aik_f = aik as f64;
            #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
            {
                use core::arch::wasm32::*;
                let va = f64x2_splat(aik_f);
                let mut j = 0usize;
                while j + 2 <= dim {
                    let b0 = *b_ptr.add(row_b + j) as f64;
                    let b1 = *b_ptr.add(row_b + j + 1) as f64;
                    let vb = f64x2(b0, b1);
                    let vc = v128_load(c_ptr.add(row_c + j) as *const v128);
                    v128_store(c_ptr.add(row_c + j) as *mut v128, f64x2_add(vc, f64x2_mul(va, vb)));
                    j += 2;
                }
                while j < dim {
                    *c_ptr.add(row_c + j) += aik_f * (*b_ptr.add(row_b + j) as f64);
                    j += 1;
                }
            }
            #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
            {
                for j in 0..dim {
                    *c_ptr.add(row_c + j) += aik_f * (*b_ptr.add(row_b + j) as f64);
                }
            }
        }
    }
    for idx in 0..total {
        *c_ptr.add(idx) *= scale;
    }
}

// ---------------------------------------------------------------------------
// 7. Catalytic Byte-Vault Reversible Primitives (Catalytic Register Frontiers)
// ---------------------------------------------------------------------------

/// 16-byte SIMD128 involutive XOR borrow/restore: `buf[i] ^= mask[i]`.
/// Applying twice restores `buf` bit-for-bit (`(b ^ m) ^ m == b`).
#[no_mangle]
pub unsafe extern "C" fn catalytic_xor_simd(buf_ptr: *mut u8, mask_ptr: *const u8, len: u32) {
    let n = len as usize;
    let mut i = 0usize;
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        use core::arch::wasm32::*;
        while i + 16 <= n {
            let vb = v128_load(buf_ptr.add(i) as *const v128);
            let vm = v128_load(mask_ptr.add(i) as *const v128);
            v128_store(buf_ptr.add(i) as *mut v128, v128_xor(vb, vm));
            i += 16;
        }
    }
    while i < n {
        *buf_ptr.add(i) ^= *mask_ptr.add(i);
        i += 1;
    }
}

/// Reversible modular additive-shear catalytic register pass over Z/mZ:
/// `buf[i] = (buf[i] + delta[i]) mod m` (for `m >= 2`).
#[no_mangle]
pub unsafe extern "C" fn catalytic_shear_add_u32(
    buf_ptr: *mut u32,
    delta_ptr: *const u32,
    len: u32,
    modulus: u32,
) {
    if modulus < 2 {
        return;
    }
    let m = modulus as u64;
    let n = len as usize;
    for i in 0..n {
        let a = (*buf_ptr.add(i) as u64) % m;
        let d = (*delta_ptr.add(i) as u64) % m;
        *buf_ptr.add(i) = ((a + d) % m) as u32;
    }
}

/// Exact inverse of `catalytic_shear_add_u32`:
/// `buf[i] = (buf[i] + m - (delta[i] mod m)) mod m`, restoring every `buf[i] < m` identically.
#[no_mangle]
pub unsafe extern "C" fn catalytic_shear_sub_u32(
    buf_ptr: *mut u32,
    delta_ptr: *const u32,
    len: u32,
    modulus: u32,
) {
    if modulus < 2 {
        return;
    }
    let m = modulus as u64;
    let n = len as usize;
    for i in 0..n {
        let a = (*buf_ptr.add(i) as u64) % m;
        let d = (*delta_ptr.add(i) as u64) % m;
        *buf_ptr.add(i) = ((a + m - d) % m) as u32;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exp_matches_std() {
        for k in 0..=64 {
            let x = (k as f64) * 0.05;
            let got = exp_f64(x);
            let refv = x.exp();
            let rel = (got - refv).abs() / refv;
            assert!(rel < 1e-13, "exp({x}) rel err = {rel}");
        }
    }

    #[test]
    fn sin_cos_matches_std() {
        for k in 3..=12 {
            let len = 1usize << k;
            let ang = 2.0 * PI / (len as f64);
            let (s, c) = sin_cos_small_f64(ang);
            assert!((s - ang.sin()).abs() < 1e-15);
            assert!((c - ang.cos()).abs() < 1e-15);
        }
    }

    #[test]
    fn catalytic_xor_and_shear_are_exact_inverses() {
        let mut bytes = [0x17u8, 0x95, 0x00, 0xff, 0x42, 0xa5, 0x5a, 0x3c, 0xde, 0xad, 0xbe, 0xef, 1, 2, 3, 4, 99];
        let orig = bytes;
        let mask = [0xaa, 0x55, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0xfe];
        unsafe {
            catalytic_xor_simd(bytes.as_mut_ptr(), mask.as_ptr(), bytes.len() as u32);
            assert_ne!(bytes, orig);
            catalytic_xor_simd(bytes.as_mut_ptr(), mask.as_ptr(), bytes.len() as u32);
        }
        assert_eq!(bytes, orig);

        let mut regs = [0u32, 1, 42, 255, 256, 17];
        let orig_regs = regs;
        let delta = [13u32, 999, 256, 257, 1000, 77];
        unsafe {
            catalytic_shear_add_u32(regs.as_mut_ptr(), delta.as_ptr(), regs.len() as u32, 257);
            catalytic_shear_sub_u32(regs.as_mut_ptr(), delta.as_ptr(), regs.len() as u32, 257);
        }
        assert_eq!(regs, orig_regs);
    }

    #[test]
    fn fp16_exact_special_values() {
        let src = [0x0000u16, 0x3c00, 0xbc00, 0x4000, 0x0001, 0x7c00];
        let mut dst = [0.0f32; 6];
        unsafe {
            fp16_to_f32_bulk(src.as_ptr(), dst.as_mut_ptr(), src.len() as u32);
        }
        assert_eq!(dst[0], 0.0);
        assert_eq!(dst[1], 1.0);
        assert_eq!(dst[2], -1.0);
        assert_eq!(dst[3], 2.0);
        assert!((dst[4] - 5.9604645e-8).abs() < 1e-13);
        assert!(dst[5].is_infinite() && dst[5].is_sign_positive());
    }
}
