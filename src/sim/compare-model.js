import specs from "../../data/specs.json" with { type: "json" };
import { computedPpi, parseResolution, upperHz } from "./device-math.js";

const X = specs.competitors.xiaomi_17t_pro;
const I = specs.competitors.iphone_18_pro_max;
const S = specs.competitors.galaxy_s26_ultra;

export function readCell(entry) {
  if (!entry || entry.status === "unknown" || entry.value === null || entry.value === undefined) {
    return { text: "UNKNOWN", numeric: null, entry: entry || null };
  }
  const text = Array.isArray(entry.value) ? entry.value.join(", ") : String(entry.value);
  const numeric = typeof entry.value === "number" ? entry.value : null;
  return { text, numeric, entry };
}

export function ratio(a, b) {
  if (typeof a !== "number" || typeof b !== "number" || b === 0) return null;
  return a / b;
}

function stability(lowEntry, highEntry) {
  const low = readCell(lowEntry);
  const high = readCell(highEntry);
  return {
    low,
    high,
    ratio: ratio(low.numeric, high.numeric),
  };
}

function ppiFrom(entryRes, entryIn) {
  const res = parseResolution(entryRes?.value);
  const diag = entryIn?.value;
  if (!res || typeof diag !== "number") return null;
  return {
    ppi: computedPpi(res.width, res.height, diag),
    formula: `hypot(${res.width}, ${res.height}) / ${diag}`,
  };
}

/**
 * Head-to-head rows. Winners come from the cited scoreboard.
 * Ratios are computed here from the cited numbers. Missing numbers stay null.
 */
export function buildComparison() {
  const snl = {
    xiaomi: stability(X["3dmark_snl_low_phonearena"], X["3dmark_snl_high_phonearena"]),
    iphone: stability(I["3dmark_snl_low_phonearena"], I["3dmark_snl_high_phonearena"]),
    samsung: stability(S["3dmark_snl_low_phonearena"], S["3dmark_snl_high_phonearena"]),
  };

  const rows = [
    row("weight_g", "Weight", "g", X.weight_g, I.weight_g, S.weight_g, "weight_thickness"),
    row(
      "refresh",
      "Max refresh",
      "Hz",
      X.display_refresh_hz_max,
      I.display_refresh_hz_max,
      { ...S.display_refresh_hz, value: upperHz(S.display_refresh_hz.value) },
      "max_refresh_hz",
    ),
    row(
      "battery",
      "Battery, typical",
      "mAh",
      X.battery_typical_mah,
      I.battery_typical_mah,
      S.battery_typical_mah,
      "battery_capacity_mah",
    ),
    row(
      "gb6_single",
      "Geekbench 6 single (PhoneArena)",
      "score",
      X.geekbench6_single_phonearena,
      I.geekbench6_single,
      S.geekbench6_single_phonearena,
      "geekbench6_cpu_phonearena",
    ),
    row(
      "gb6_multi",
      "Geekbench 6 multi (PhoneArena)",
      "score",
      X.geekbench6_multi_phonearena,
      I.geekbench6_multi,
      S.geekbench6_multi_phonearena,
      "geekbench6_cpu_phonearena",
    ),
    row(
      "snl_high",
      "3DMark Steel Nomad Light high",
      "score",
      X["3dmark_snl_high_phonearena"],
      I["3dmark_snl_high_phonearena"],
      S["3dmark_snl_high_phonearena"],
      "3dmark_snl_peak",
    ),
    row(
      "snl_low",
      "3DMark Steel Nomad Light low",
      "score",
      X["3dmark_snl_low_phonearena"],
      I["3dmark_snl_low_phonearena"],
      S["3dmark_snl_low_phonearena"],
      "3dmark_snl_sustained",
    ),
    row(
      "wle_high",
      "3DMark Wild Life Extreme high",
      "score",
      X["3dmark_wle_high_phonearena"],
      I["3dmark_wle_high_phonearena"],
      S["3dmark_wle_high_phonearena"],
      null,
    ),
  ];

  // The Samsung refresh cell above replaced the entry's value with a parsed number
  // but the original string must stay visible. Fix that row explicitly.
  const refresh = rows.find((r) => r.id === "refresh");
  refresh.samsung = {
    text: String(S.display_refresh_hz.value),
    numeric: upperHz(S.display_refresh_hz.value),
    entry: S.display_refresh_hz,
  };
  refresh.ratioVsSamsung = ratio(refresh.xiaomi.numeric, refresh.samsung.numeric);

  return {
    asOf: specs.competitors.compared_as_of,
    methodology: specs.competitors.methodology,
    phones: {
      xiaomi: readCell(X.name),
      iphone: readCell(I.name),
      samsung: readCell(S.name),
    },
    rows,
    snlStability: snl,
    scoreboard: specs.competitors.scoreboard,
    ppi: {
      xiaomiCited: readCell(X.display_ppi),
      xiaomiComputed: ppiFrom(X.display_resolution_px, X.display_size_in),
      iphoneCited: readCell(I.display_ppi),
      iphoneComputed: ppiFrom(I.display_resolution_px, I.display_size_in),
      samsungCited: null,
      samsungComputed: ppiFrom(S.display_resolution_px, S.display_size_in),
    },
    conflicts: specs.conflicts,
  };
}

function row(id, label, unit, xEntry, iEntry, sEntry, scoreboardKey) {
  const xiaomi = readCell(xEntry);
  const iphone = readCell(iEntry);
  const samsung = readCell(sEntry);
  return {
    id,
    label,
    unit,
    xiaomi,
    iphone,
    samsung,
    ratioVsIphone: ratio(xiaomi.numeric, iphone.numeric),
    ratioVsSamsung: ratio(xiaomi.numeric, samsung.numeric),
    scoreboardKey,
  };
}

export function scoreboardEntries() {
  return Object.entries(specs.competitors.scoreboard).map(([id, entry]) => ({
    id,
    entry,
    winner: entry.value,
  }));
}
