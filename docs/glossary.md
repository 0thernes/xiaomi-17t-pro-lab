# Glossary (`docs/glossary.md`)

Canonical technical glossary for `xiaomi-17t-pro-lab` (Build Standard v1.2.0 **A44**).

- **CFL (Courant–Friedrichs–Lewy) Condition:** Explicit finite-difference stability criterion $\alpha \Delta t (\Delta x^{-2} + \Delta y^{-2}) \le 1/2$ in 2D; proved in Lean (`ThermalFdtd.lean`) to guarantee the Discrete Minimum/Maximum Principle.
- **CHSH Inequality:** Clauser–Horne–Shimony–Holt Bell inequality; classical local hidden-variable models obey $|S| \le 2$ (Lean Theorem 5), whereas entangled Bell states reach Tsirelson's bound $2\sqrt{2} \approx 2.8284$.
- **Crank–Nicolson Method:** Implicit second-order time integrator $(I + i\frac{\Delta t}{2\hbar}H)\psi^{n+1} = (I - i\frac{\Delta t}{2\hbar}H)\psi^n$ whose Cayley transform is strictly unitary (Lean Theorem 3).
- **CXRO / Henke Constants:** X-ray and EUV complex refractive index optical constants $n = 1 - \delta + i\beta$ used in our 40-bilayer Mo/Si Bragg mirror transfer-matrix solver.
- **DOF (Depth of Focus):** Optical focus latitude $\mathrm{DOF} = k_2 \lambda / \mathrm{NA}^2$; moving from `0.33 NA` to `0.55 High-NA` shrinks DOF by exact factor `25/9` (Lean Theorem 2).
- **DVFS (Dynamic Voltage and Frequency Scaling):** Thermal control loop reducing SoC clocks when junction temperature exceeds the `84 °C` knee.
- **FinFET Natural Length ($\lambda$):** Double-gate electrostatic scale length $\lambda = \sqrt{\varepsilon_{\text{Si}} t_{\text{Si}} t_{\text{ox}} / (2\varepsilon_{\text{ox}})}$ governing short-channel potential decay.
- **Kurnal Die Analysis:** Public silicon micrograph measurement of the MediaTek Dimensity 9500 (`10.88 × 12.92 mm = 140.57 mm²`, major blocks CPU `28.75`, GPU `24.23`, NPU `12.60`, SLC `8.92 mm²`).
- **LER (Line-Edge Roughness):** $3\sigma$ edge variation in nm caused by EUV Poisson photon shot noise and acid diffusion.
- **MDLA / MVPU:** MediaTek Deep Learning Accelerator (`4×`) and MediaTek Vision Processing Unit (`2×`) comprising the Dimensity 9500 NPU 990.
- **Palomar Comparator (`lake comparator --paranoid`):** Six-kernel Lean 4.35.0 verifier matching statement-only `Challenge.lean` signatures strictly against sorry-free `Solution.lean` proofs inside an isolated bubblewrap sandbox.
- **Peres–Mermin Magic Square:** $3\times 3$ array of two-qubit Pauli observables proving state-independent quantum contextuality (`6/6` quantum contexts satisfied vs. `≤ 5/6` classical cap, Lean Theorem 6).
- **Provenance Badges (`cited`, `computed`, `measured`, `UNKNOWN`):** Mandatory schema labels distinguishing primary hardware facts from derived physics models, live browser timings, and unpublished `null` leaves.
- **Roofline Model:** Throughput bound $\min(\text{Peak Compute},\; \text{AI} \times \text{Memory Bandwidth})$ separating memory-bound from compute-bound kernels (Lean Theorem 1).
