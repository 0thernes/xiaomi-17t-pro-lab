export function fmt(value, digits = 4) {
  if (value == null || Number.isNaN(value)) return "UNKNOWN";
  if (typeof value !== "number") return String(value);
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e7)) return value.toExponential(3);
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: digits }).format(value);
}

export function fmtBytes(bytes) {
  if (bytes == null) return "UNKNOWN";
  if (bytes >= 1024 * 1024) return `${fmt(bytes / (1024 * 1024), 3)} MB`;
  if (bytes >= 1024) return `${fmt(bytes / 1024, 3)} KB`;
  return `${fmt(bytes, 3)} B`;
}
