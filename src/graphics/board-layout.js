/**
 * Placements on the ~58 × 72 mm Compeq board named in the FCC sample notes.
 * The internal photos are not shipped and do not publish a coordinate table.
 * Positions are a reconstruction: PoP and UFS in the upper half, SPMI PMICs
 * and the charger along the power side, radios toward the antenna end, gauges
 * and the wireless receiver toward the battery.
 */
export const BOARD_MM = { width: 58, height: 72 };

export function boardPlacements() {
  const cluster = { x: 14, y: -4 };
  const pmics = [
    ["MT6661BP", -5, 2.2],
    ["MT6661DP", -1.6, 2.2],
    ["MT6661FP", 1.8, 2.2],
    ["MT6661GP", -3.4, -1.4],
    ["MT6667AP", 0.2, -1.4],
    ["MT6667CP", 3.6, -1.4],
  ].map(([label, dx, dy]) => ({
    id: label.toLowerCase(),
    label,
    x: cluster.x + dx,
    y: cluster.y + dy,
    w: 3.1,
    h: 3.1,
    d: 0.55,
    tone: "frame",
  }));
  return [
    {
      id: "dram",
      label: "H58GG6AV9H",
      x: 0,
      y: 8,
      w: 16.4,
      h: 14,
      d: 1.7,
      tone: "silicon",
    },
    {
      id: "ufs",
      label: "HN8T271EJK",
      x: -18,
      y: 4,
      w: 11,
      h: 13,
      d: 1.05,
      tone: "substrate",
    },
    ...pmics,
    {
      id: "mt6379",
      label: "MT6379",
      x: 16,
      y: -16,
      w: 6.5,
      h: 6.5,
      d: 0.7,
      tone: "copper",
    },
    {
      id: "mt6681",
      label: "MT6681",
      x: -16,
      y: -10,
      w: 5.5,
      h: 5.5,
      d: 0.6,
      tone: "gold",
    },
    {
      id: "mt6199w",
      label: "MT6199W",
      x: 1,
      y: 26,
      w: 8,
      h: 7,
      d: 0.8,
      tone: "frame",
    },
    {
      id: "mt6653",
      label: "MT6653",
      x: 18,
      y: 24,
      w: 7,
      h: 6.5,
      d: 0.75,
      tone: "silicon",
    },
    {
      id: "nfc",
      label: "NXP NFC",
      x: -18,
      y: 24,
      w: 6.5,
      h: 5.5,
      d: 0.6,
      tone: "gold",
    },
    {
      id: "amps",
      label: "TFA9874 / RT5512",
      x: 0,
      y: -26,
      w: 16,
      h: 4.2,
      d: 0.55,
      tone: "copper",
    },
    {
      id: "aw86927",
      label: "AW86927",
      x: 20,
      y: -24,
      w: 4.5,
      h: 3.6,
      d: 0.45,
      tone: "frame",
    },
    {
      id: "gt9916r",
      label: "GT9916R",
      x: -20,
      y: -24,
      w: 5.5,
      h: 3.8,
      d: 0.45,
      tone: "silicon",
    },
    {
      id: "bq28z610",
      label: "BQ28Z610",
      x: -14,
      y: -18,
      w: 5.2,
      h: 3.6,
      d: 0.45,
      tone: "gold",
    },
    {
      id: "sc858x",
      label: "SC858x",
      x: 18,
      y: -8,
      w: 5,
      h: 3.6,
      d: 0.45,
      tone: "copper",
    },
    {
      id: "nu1671",
      label: "NU1671",
      x: -18,
      y: -30,
      w: 5.5,
      h: 4.2,
      d: 0.5,
      tone: "frame",
    },
  ];
}

/** Camera modules sit on the rear plateau, not as soldered board chips. */
export function cameraModules() {
  return [
    { id: "camera_main", label: "OVX9500", dx: -10, fromTop: 24, w: 12, h: 12, d: 5.2 },
    { id: "camera_ultrawide", label: "OV13B", dx: 8, fromTop: 22, w: 8, h: 8, d: 4.4 },
    { id: "camera_tele", label: "JN5", dx: -1, fromTop: 42, w: 8, h: 14, d: 4.6 },
  ];
}
