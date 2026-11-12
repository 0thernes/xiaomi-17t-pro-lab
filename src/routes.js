export const ROUTES = [
  { id: "hub", hash: "#/", label: "Phone" },
  { id: "zoom", hash: "#/zoom", label: "Zoom" },
  { id: "cpu", hash: "#/cpu", label: "CPU" },
  { id: "gpu", hash: "#/gpu", label: "GPU" },
  { id: "npu", hash: "#/npu", label: "NPU" },
  { id: "litho", hash: "#/litho", label: "Litho" },
  { id: "transistor", hash: "#/transistor", label: "Transistor" },
  { id: "compare", hash: "#/compare", label: "Compare" },
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
