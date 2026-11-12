/**
 * Walk taxonomy.json. Device is a tree. CPU, GPU, and NPU are flat zoom stacks.
 * Shared physics nodes are referenced, not copied.
 */

export function stackList(taxonomy) {
  return [
    { id: "device", name: taxonomy.device_taxonomy.name, kind: "tree" },
    { id: "cpu", name: taxonomy.cpu.name, kind: "stack" },
    { id: "gpu", name: taxonomy.gpu.name, kind: "stack" },
    { id: "npu", name: taxonomy.npu.name, kind: "stack" },
  ];
}

export function engineLevels(taxonomy, stackId) {
  const stack = taxonomy[stackId];
  if (!stack?.zoom_stack) return null;
  return stack.zoom_stack;
}

/** Follow child ids from the device root. Unknown id returns null. */
export function deviceChain(taxonomy, ids) {
  const chain = [taxonomy.device_taxonomy];
  let node = taxonomy.device_taxonomy;
  for (const id of ids) {
    const child = (node.children || []).find((c) => c.id === id);
    if (!child) return null;
    chain.push(child);
    node = child;
  }
  return chain;
}

export function findEngineLevel(taxonomy, stackId, levelId) {
  const levels = engineLevels(taxonomy, stackId);
  if (!levels) return null;
  return levels.find((level) => level.id === levelId) || null;
}

export function childrenOf(node) {
  return node.children || [];
}

export function sharedNode(taxonomy, ref) {
  return taxonomy.shared?.[ref] || null;
}

export function facetCoverage(facets) {
  const keys = Object.keys(facets || {});
  let confirmed = 0;
  let unconfirmed = 0;
  let unknown = 0;
  for (const key of keys) {
    const status = facets[key]?.status;
    if (status === "confirmed") confirmed += 1;
    else if (status === "unconfirmed") unconfirmed += 1;
    else unknown += 1;
  }
  return {
    total: keys.length,
    confirmed,
    unconfirmed,
    unknown,
    confirmedFraction: keys.length ? confirmed / keys.length : 0,
  };
}
