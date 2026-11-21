/**
 * Read a measured pointer-chase curve.
 * A jump is a rise in ns/load. Cited cache sizes may be drawn on the same
 * chart as reference marks. The curve does not, by itself, name a level L1
 * or prove a 9500 cache geometry. L1 sizes in specs.json come from the Arm manuals.
 */

export function chaseJumps(points, ratio = 1.35) {
  const jumps = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].nsPerLoad;
    const cur = points[i].nsPerLoad;
    if (!(prev > 0) || !(cur > 0)) continue;
    if (cur / prev >= ratio) jumps.push({ index: i, bytes: points[i].bytes, ratio: cur / prev });
  }
  return jumps;
}

export function referenceMarks(specs) {
  const marks = [];
  const cluster = specs?.soc?.cpu_cluster?.value;
  if (typeof cluster === "string") {
    if (cluster.includes("2MB")) marks.push({ bytes: 2 * 1024 * 1024, label: "C1-Ultra L2 2MB (cited)" });
    if (cluster.includes("1MB")) marks.push({ bytes: 1024 * 1024, label: "C1-Premium L2 1MB (cited)" });
    if (cluster.includes("512KB")) marks.push({ bytes: 512 * 1024, label: "C1-Pro L2 512KB (cited)" });
  }
  if (specs?.soc?.l3_mb?.value != null) {
    marks.push({ bytes: specs.soc.l3_mb.value * 1024 * 1024, label: `L3 ${specs.soc.l3_mb.value}MB (cited)` });
  }
  if (specs?.soc?.slc_mb?.value != null) {
    marks.push({ bytes: specs.soc.slc_mb.value * 1024 * 1024, label: `SLC ${specs.soc.slc_mb.value}MB (cited)` });
  }
  return marks;
}
