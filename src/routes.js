export const ROUTES = [
  { id: "hub", hash: "#/", label: "Phone", scale: "10⁻¹ m", group: "Device & Scale" },
  { id: "zoom", hash: "#/zoom", label: "Zoom", scale: "10⁻¹→10⁻¹⁵m", group: "Device & Scale" },
  { id: "cpu", hash: "#/cpu", label: "CPU", scale: "28.8 mm²", group: "Dimensity 9500" },
  { id: "gpu", hash: "#/gpu", label: "GPU", scale: "24.2 mm²", group: "Dimensity 9500" },
  { id: "npu", hash: "#/npu", label: "NPU 990", scale: "12.6 mm²", group: "Dimensity 9500" },
  { id: "memory", hash: "#/memory", label: "RAM & UFS", scale: "76.8 GB/s", group: "Dimensity 9500" },
  { id: "litho", hash: "#/litho", label: "EUV Litho", scale: "13.5 nm", group: "Silicon & Quantum" },
  { id: "transistor", hash: "#/transistor", label: "Atom & QED", scale: "10⁻¹⁰→10⁻¹⁵m", group: "Silicon & Quantum" },
  { id: "work", hash: "#/work", label: "Workloads", scale: "Live Run", group: "Operational Labs" },
  { id: "compare", hash: "#/compare", label: "Versus", scale: "3-Way", group: "Forensic Evidence" },
  { id: "specs", hash: "#/specs", label: "Specs", scale: "FCC + Die", group: "Forensic Evidence" },
];

const IDS = new Set(ROUTES.map((route) => route.id));

export function parseHash(hash) {
  const raw = (hash || "#/").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { id: "hub", parts: [] };
  const head = parts[0] === "phone" ? "hub" : parts[0];
  if (!IDS.has(head)) return { id: "hub", parts, missing: true };
  return { id: head, parts: parts.slice(1) };
}
