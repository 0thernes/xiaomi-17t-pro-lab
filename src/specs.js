import specs from "../data/specs.json" with { type: "json" };

/** Single door for hardware leaves. Views read this module, not copied numbers. */
export function getSpecs() {
  return specs;
}

export function leaf(path) {
  let node = specs;
  for (const part of path.split(".")) {
    if (!node || typeof node !== "object") return null;
    node = node[part];
  }
  if (!node || typeof node !== "object" || !("status" in node) || !("value" in node)) return null;
  return node;
}

export function isOpen(entry) {
  if (!entry) return true;
  return entry.status === "unknown" || entry.status === "unconfirmed";
}

/**
 * Leaves still open after the 2026-11-12 pass 2.
 * DRAM vendor and the PMIC set are confirmed from FCC markings and are not in this list.
 * Reasons stay on the leaves so a later specs.json edit flows through.
 */
export const OPEN_PATHS = [
  "device.ufs_lane_count_device",
  "browser.webgpu_mali_g1_ultra_specific",
  "competitors.iphone_18_pro_max.3dmark_wle_high_phonearena",
  "device.rear_cover",
  "device.wireless_reverse_w",
  "competitors.galaxy_s26_ultra.price_us_street_256_nbc",
  "competitors.galaxy_s26_ultra.price_us_street_512_nbc",
];

export function recordEntries(section) {
  const node = specs[section];
  if (!node || typeof node !== "object") return [];
  return Object.entries(node)
    .filter(([key, value]) => key !== "_note" && value && typeof value === "object" && "status" in value)
    .map(([id, entry]) => ({ id, entry }));
}

export function openItems() {
  return OPEN_PATHS.map((path) => {
    const row = leaf(path);
    const reason = row?.searched_2026_11_12 || row?.notes || "No settled source.";
    return { path, row, reason };
  });
}

export function conflictsById(ids) {
  const want = new Set(ids);
  return (specs.conflicts || []).filter((item) => want.has(item.id));
}

/** Kurnal's "10.88 mm x 12.92 mm" lives in the die-size note. Area is the leaf value. */
export function parseDieMm(source = specs) {
  const row = source.soc.die_size_mm2;
  const notes = String(row?.notes || "");
  const match = notes.match(/([\d.]+)\s*mm\s*x\s*([\d.]+)\s*mm/i);
  if (!match || typeof row.value !== "number") return null;
  return {
    widthMm: Number(match[1]),
    heightMm: Number(match[2]),
    areaMm2: row.value,
    entry: row,
  };
}

/** "16.40 x 14.00 mm" inside the package sentence. Status stays whatever the leaf says. */
export function parsePackageMm(source = specs) {
  const row = source.soc.package_this_phone;
  const match = String(row?.value || "").match(/([\d.]+)\s*x\s*([\d.]+)\s*mm/i);
  if (!match) return null;
  const thick = String(row.value).match(/([\d.]+)\s*mm thick/i);
  return {
    widthMm: Number(match[1]),
    heightMm: Number(match[2]),
    thickMm: thick ? Number(thick[1]) : null,
    entry: row,
  };
}

/**
 * Stack the published block areas into the die rectangle.
 * Positions are a reconstruction that preserves area. They are not a trace of Kurnal's photograph.
 */
export function floorplan(source = specs) {
  const die = parseDieMm(source);
  if (!die) return null;
  const blocks = [
    ["cpu", source.soc.die_block_cpu_cluster_mm2],
    ["gpu", source.soc.die_block_gpu_mm2],
    ["npu", source.soc.die_block_npu990_mm2],
  ];
  let y = 0;
  const placed = [];
  for (const [id, row] of blocks) {
    if (typeof row?.value !== "number") continue;
    const height = row.value / die.widthMm;
    placed.push({
      id,
      xMm: 0,
      yMm: y,
      widthMm: die.widthMm,
      heightMm: height,
      areaMm2: row.value,
      entry: row,
    });
    y += height;
  }
  const cores = placeCores(
    source,
    placed.find((block) => block.id === "cpu"),
  );
  return { die, blocks: placed, cores, label: "reconstruction" };
}

function placeCores(source, cpu) {
  if (!cpu) return [];
  const rows = [
    ["C1-Ultra", 1, source.soc.die_block_c1_ultra_core_mm2],
    ["C1-Premium", 3, source.soc.die_block_c1_premium_core_mm2],
    ["C1-Pro", 4, source.soc.die_block_c1_pro_core_mm2],
  ];
  const cores = [];
  let cursor = 0;
  for (const [name, count, row] of rows) {
    if (typeof row?.value !== "number") continue;
    const side = Math.sqrt(row.value);
    for (let i = 0; i < count; i++) {
      const x = (cursor % 4) * (cpu.widthMm / 4);
      const y = cpu.yMm + Math.floor(cursor / 4) * side;
      cores.push({
        name,
        index: i,
        xMm: x,
        yMm: y,
        sideMm: side,
        areaMm2: row.value,
        entry: row,
      });
      cursor += 1;
    }
  }
  return cores;
}

export function npuCounts(source = specs) {
  const text = String(source.soc.npu_structure?.value || "");
  const mdla = text.match(/(\d+)\s*x\s*MDLA/i);
  const mvpu = text.match(/(\d+)\s*x\s*MVPU/i);
  return {
    mdla: mdla ? Number(mdla[1]) : null,
    mvpu: mvpu ? Number(mvpu[1]) : null,
    entry: source.soc.npu_structure,
  };
}
