import { HBAR2_OVER_2M_EV_NM2 } from "./constants.js";

/**
 * Eigenvalues of a real symmetric matrix stored densely, via Jacobi rotations.
 * Returns eigenvalues sorted ascending. Used for the 1D finite-difference
 * Hamiltonian, which is small (N ≤ ~80 in the lab).
 */
export function jacobiEigenvalues(matrix) {
  const n = matrix.length;
  const A = matrix.map((row) => Float64Array.from(row));
  const scale0 = maxAbsDiag(A) + 1e-30;
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    }
    if (Math.sqrt(off) <= 1e-12 * scale0 * n) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) <= 1e-15 * scale0) continue;
        const app = A[p][p];
        const aqq = A[q][q];
        const tau = (aqq - app) / (2 * apq);
        const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        A[p][p] = app - t * apq;
        A[q][q] = aqq + t * apq;
        A[p][q] = 0;
        A[q][p] = 0;
        for (let k = 0; k < n; k++) {
          if (k === p || k === q) continue;
          const aik = A[p][k];
          const ajk = A[q][k];
          const np = c * aik - s * ajk;
          const nq = s * aik + c * ajk;
          A[p][k] = np;
          A[k][p] = np;
          A[q][k] = nq;
          A[k][q] = nq;
        }
      }
    }
  }
  const ev = [];
  for (let i = 0; i < n; i++) ev.push(A[i][i]);
  ev.sort((a, b) => a - b);
  return ev;
}

function maxAbsDiag(A) {
  let m = 0;
  for (let i = 0; i < A.length; i++) m = Math.max(m, Math.abs(A[i][i]));
  return m;
}

/** Build the tridiagonal FD Hamiltonian as a dense matrix, in eV, x in nm. */
export function finiteDifferenceHamiltonian(nPoints, dxNm, potentialEv) {
  const C = HBAR2_OVER_2M_EV_NM2;
  const diag = (2 * C) / (dxNm * dxNm);
  const off = -C / (dxNm * dxNm);
  const H = Array.from({ length: nPoints }, () => new Float64Array(nPoints));
  for (let i = 0; i < nPoints; i++) {
    const V = potentialEv ? potentialEv[i] : 0;
    H[i][i] = diag + V;
    if (i + 1 < nPoints) {
      H[i][i + 1] = off;
      H[i + 1][i] = off;
    }
  }
  return H;
}

/**
 * Infinite square well from 0 to L. Grid points are interior only
 * (Dirichlet walls). Energies in eV, L in nm.
 */
export function infiniteWellEnergies(lengthNm, nPoints) {
  const dx = lengthNm / (nPoints + 1);
  const H = finiteDifferenceHamiltonian(nPoints, dx, null);
  return jacobiEigenvalues(H);
}

/** Analytic infinite-well energies, eV. n = 1, 2, 3, … */
export function infiniteWellAnalyticEv(lengthNm, n) {
  const C = HBAR2_OVER_2M_EV_NM2;
  return (n * n * Math.PI * Math.PI * C) / (lengthNm * lengthNm);
}

/** Analytic infinite-well wavefunction samples on the interior grid. Not normalized to the FD basis. */
export function infiniteWellWave(lengthNm, nPoints, n) {
  const dx = lengthNm / (nPoints + 1);
  const psi = new Float64Array(nPoints);
  for (let i = 0; i < nPoints; i++) {
    const x = (i + 1) * dx;
    psi[i] = Math.sin((n * Math.PI * x) / lengthNm);
  }
  return psi;
}
