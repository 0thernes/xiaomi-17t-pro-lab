const STATUSES = new Set(["confirmed", "unconfirmed", "unknown"]);
const CONFLICT_CLASSES = new Set(["bug", "error", "issue", "problem", "dilemma", "conflict"]);

export function isSpecLeaf(node) {
  return (
    node &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    "value" in node &&
    "unit" in node &&
    "source" in node &&
    "status" in node
  );
}

/**
 * Every specs.json number is a leaf with value, unit, source, and status.
 * confirmed → non-null value and a source URL or citation string
 * unknown → value is null (nothing invented)
 * unconfirmed → if a value is present, a source is present too
 */
export function validateSpecs(specs) {
  const errors = [];
  if (!specs || typeof specs !== "object") {
    return ["specs root is not an object"];
  }
  walk(specs, "$", errors, true);
  if (!Array.isArray(specs.conflicts)) {
    errors.push("conflicts must be an array");
  } else {
    for (const c of specs.conflicts) {
      if (!CONFLICT_CLASSES.has(c.classification)) {
        errors.push(`conflict ${c.id} has classification ${c.classification}`);
      }
      if (!c.topic || !c.summary) errors.push(`conflict ${c.id} is missing topic or summary`);
    }
  }
  if (!Array.isArray(specs.unknowns) || specs.unknowns.some((u) => typeof u !== "string")) {
    errors.push("unknowns must be an array of strings");
  }
  for (const section of ["parts", "versions", "supply_chain"]) {
    const node = specs[section];
    if (!node || typeof node !== "object") {
      errors.push(`${section} must be an object`);
      continue;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "_note") continue;
      checkRecord(value, `${section}.${key}`, errors);
    }
  }
  if (!Array.isArray(specs.issues) || specs.issues.length < 12) {
    errors.push("issues must list I1–I12");
  } else {
    for (const item of specs.issues) {
      if (!CONFLICT_CLASSES.has(item.classification)) {
        errors.push(`issue ${item.id} has classification ${item.classification}`);
      }
      checkRecord(item, `issues.${item.id}`, errors);
      if (!item.topic || !item.summary) errors.push(`issue ${item.id} is missing topic or summary`);
    }
  }
  return errors;
}

function checkRecord(node, path, errors) {
  if (!node || typeof node !== "object" || !("status" in node)) {
    errors.push(`${path} is missing status`);
    return;
  }
  const status = String(node.status);
  if (!/^(confirmed|unconfirmed|unknown)\b/.test(status)) {
    errors.push(`${path} status ${status} is not a known status`);
  }
}

function walk(node, path, errors, isRoot) {
  if (!node || typeof node !== "object") return;
  if (isSpecLeaf(node)) {
    checkLeaf(node, path, errors);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${path}[${i}]`, errors, false));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (
      isRoot &&
      (key === "meta" ||
        key === "conflicts" ||
        key === "unknowns" ||
        key === "parts" ||
        key === "versions" ||
        key === "issues" ||
        key === "supply_chain")
    ) {
      continue;
    }
    walk(value, `${path}.${key}`, errors, false);
  }
}

function checkLeaf(node, path, errors) {
  if (!STATUSES.has(node.status)) {
    errors.push(`${path} status ${node.status} is not confirmed|unconfirmed|unknown`);
  }
  if (!("unit" in node)) errors.push(`${path} is missing unit`);
  if (node.status === "confirmed") {
    if (node.value === null || node.value === undefined || node.value === "") {
      errors.push(`${path} is confirmed but has an empty value`);
    }
    if (typeof node.source !== "string" || node.source.length === 0) {
      errors.push(`${path} is confirmed but has no source`);
    }
  }
  if (node.status === "unknown" && node.value !== null) {
    errors.push(`${path} is unknown but value is ${JSON.stringify(node.value)}`);
  }
  if (node.status === "unconfirmed" && node.value !== null) {
    if (typeof node.source !== "string" || node.source.length === 0) {
      errors.push(`${path} is unconfirmed with a value but no source`);
    }
  }
  if ("confidence" in node && (typeof node.confidence !== "string" || node.confidence.length === 0)) {
    errors.push(`${path} confidence must be a non-empty string when present`);
  }
}
