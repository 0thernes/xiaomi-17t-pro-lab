/**
 * Fixed-step RK4 and adaptive Dormand–Prince 5(4).
 * Used by the scientific workload. The coefficients are the standard
 * Dormand–Prince pair (the ode45 pair), not a fit to a phone measurement.
 */

export function rk4Step(deriv, y, t, dt) {
  const k1 = deriv(t, y);
  const k2 = deriv(t + dt / 2, addScaled(y, k1, dt / 2));
  const k3 = deriv(t + dt / 2, addScaled(y, k2, dt / 2));
  const k4 = deriv(t + dt, addScaled(y, k3, dt));
  const next = new Float64Array(y.length);
  for (let i = 0; i < y.length; i++) next[i] = y[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  return next;
}

export function rk4(deriv, y0, { t0 = 0, t1, dt }) {
  let y = Float64Array.from(y0);
  let t = t0;
  let steps = 0;
  while (t < t1 - dt * 1e-9) {
    const h = Math.min(dt, t1 - t);
    y = rk4Step(deriv, y, t, h);
    t += h;
    steps += 1;
    if (steps > 1e7) break;
  }
  return { y, t, steps };
}

const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const B5 = A[6];
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1];

export function dopri54(deriv, y0, { t0 = 0, t1, dt = 0.1, tol = 1e-6, maxSteps = 200000 }) {
  let y = Float64Array.from(y0);
  let t = t0;
  let h = Math.min(dt, t1 - t0);
  let steps = 0;
  let accepted = 0;
  while (t < t1) {
    if (t + h > t1) h = t1 - t;
    const k = Array.from({ length: 7 }, () => new Float64Array(y.length));
    k[0] = deriv(t, y);
    for (let stage = 1; stage <= 5; stage++) {
      const guess = Float64Array.from(y);
      for (let j = 0; j < stage; j++) addInto(guess, k[j], h * A[stage][j]);
      k[stage] = deriv(t + C[stage] * h, guess);
    }
    const y5 = Float64Array.from(y);
    const y4 = Float64Array.from(y);
    for (let j = 0; j < 6; j++) {
      addInto(y5, k[j], h * B5[j]);
      addInto(y4, k[j], h * B4[j]);
    }
    k[6] = deriv(t + h, y5);
    let err = 0;
    for (let i = 0; i < y.length; i++) {
      const scale = tol * (1 + Math.max(Math.abs(y[i]), Math.abs(y5[i])));
      const e = Math.abs(y5[i] - y4[i]) / scale;
      if (e > err) err = e;
    }
    steps += 1;
    if (err <= 1 || h < 1e-8) {
      y = y5;
      t += h;
      accepted += 1;
    }
    const factor = err === 0 ? 4 : Math.min(4, Math.max(0.2, 0.9 * err ** -0.2));
    h *= factor;
    if (steps >= maxSteps) break;
  }
  return { y, t, steps, accepted };
}

export function lorenzDeriv(sigma = 10, rho = 28, beta = 8 / 3) {
  return (_t, y) => new Float64Array([sigma * (y[1] - y[0]), y[0] * (rho - y[2]) - y[1], y[0] * y[1] - beta * y[2]]);
}

export function vanDerPolDeriv(mu = 8) {
  return (_t, y) => new Float64Array([y[1], mu * (1 - y[0] * y[0]) * y[1] - y[0]]);
}

/** Robertson chemical kinetics, the usual stiff test. */
export function robertsonDeriv(_t, y) {
  const [y1, y2, y3] = y;
  return new Float64Array([-0.04 * y1 + 1e4 * y2 * y3, 0.04 * y1 - 1e4 * y2 * y3 - 3e7 * y2 * y2, 3e7 * y2 * y2]);
}

function addScaled(y, k, scale) {
  const out = new Float64Array(y.length);
  for (let i = 0; i < y.length; i++) out[i] = y[i] + scale * k[i];
  return out;
}

function addInto(y, k, scale) {
  for (let i = 0; i < y.length; i++) y[i] += scale * k[i];
}
