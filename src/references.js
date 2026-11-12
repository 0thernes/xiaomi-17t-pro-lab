/**
 * Modeling references. Copyrighted photographs are linked, not shipped.
 * A file is listed under `shipped` only when its license allows redistribution.
 */
export const REFERENCES = [
  {
    id: "xiaomi-product",
    title: "Xiaomi 17T Pro official product and spec imagery",
    use: "Exterior proportions, colors, camera-plateau layout",
    url: "https://www.mi.com/global/product/xiaomi-17t-pro/specs/",
    license: "Xiaomi copyright. Press and marketing. Not redistributed.",
    shipped: null,
  },
  {
    id: "xiaomi-repair",
    title: "Xiaomi 17T Pro repair manual, exploded views",
    use: "Named teardown layers: display, frame, mainboard, sub-board, dual-cell battery, vapor chamber, cameras, cover",
    url: "https://spare-parts.mi.com/cdn/shop/files/P12U_Xiaomi_17T_Pro_ERP_c1d3851e-b6a1-4622-b262-c160cb7fba23.pdf?v=18270098609428527401",
    license: "Xiaomi copyright, published for repair. Not redistributed.",
    shipped: null,
  },
  {
    id: "kurnal-die",
    title: "Kurnal Dimensity 9500 die shot and package photos",
    use: "Die 10.88 × 12.92 mm, block areas, package outline. Arrangement in the lab is a reconstruction, not a trace.",
    url: "https://kurnal-insights.com/dieshot/mediatek-dimensity-9500-mt6993/",
    license: "Copyright Kurnal. All rights reserved. Not redistributed.",
    shipped: null,
  },
  {
    id: "kurnal-pdf",
    title: "Kurnal D9500 report",
    use: "Package 16.40 × 14.00 mm, ball pitch, block areas",
    url: "https://kurnal-insights.com/uploads/Report/D9500%20V1.pdf",
    license: "Copyright Kurnal. All rights reserved. Not redistributed.",
    shipped: null,
  },
  {
    id: "techinsights",
    title: "TechInsights Dimensity 9500 floorplan and packaging notes",
    use: "PoP cross-section concept only",
    url: "https://www.techinsights.com/blog/mediatek-dimensity-9500-digital-floorplan-analysis",
    license: "TechInsights proprietary. Not redistributed.",
    shipped: null,
  },
  {
    id: "commons",
    title: "Wikimedia Commons, MediaTek integrated circuits",
    use: "Checked for a redistributable D9500 die shot. None is in the category.",
    url: "https://commons.wikimedia.org/wiki/Category:MediaTek_integrated_circuits",
    license: "Per-file Commons licenses. No Dimensity 9500 die photograph to ship.",
    shipped: null,
  },
];

export function shippableReferences() {
  return REFERENCES.filter((item) => item.shipped);
}

export function referencesById(ids) {
  const want = new Set(ids);
  return REFERENCES.filter((item) => want.has(item.id));
}
