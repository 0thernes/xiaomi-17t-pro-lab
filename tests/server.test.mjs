import assert from "node:assert/strict";
import { describe, it } from "node:test";
import os from "node:os";
import path from "node:path";
import { resolveSafe } from "../tools/serve.mjs";
import { binTriangles } from "../src/sim/dvs.js";
import { largestStep } from "../src/sim/chase.js";
import { probeTimer } from "../src/sim/timing.js";

describe("static server paths", () => {
  const root = path.join(os.tmpdir(), "lab-root");
  it("rejects traversal and prefix siblings", () => {
    assert.equal(resolveSafe(root, "/../secret.txt"), null);
    assert.equal(resolveSafe(root, "/..%2fsecret.txt"), null);
    assert.equal(resolveSafe(root, "/%2e%2e/secret.txt"), null);
    const sibling = path.resolve(root + "-secret", "file.txt");
    assert.notEqual(resolveSafe(root, sibling), sibling);
    const inside = resolveSafe(root, "/src/main.js");
    assert.ok(inside && inside.startsWith(root + path.sep));
  });

  it("strips the GitHub Pages prefix", () => {
    const file = resolveSafe(root, "/xiaomi-17t-pro-lab/index.html");
    assert.equal(file, path.join(root, "index.html"));
  });
});

describe("timing and binning helpers", () => {
  it("reads a fake clock quantum", () => {
    let t = 0;
    const probe = probeTimer(() => {
      t += 0.1;
      return t;
    }, 5);
    assert.ok(Math.abs(probe.minDeltaMs - 0.1) < 1e-9);
  });

  it("finds the largest chase step and counts a full-frame bin", () => {
    const step = largestStep([
      { bytes: 10, nsPerLoad: 1 },
      { bytes: 20, nsPerLoad: 4 },
      { bytes: 40, nsPerLoad: 5 },
    ]);
    assert.equal(step.from.bytes, 10);
    const full = binTriangles({
      count: 1,
      binsX: 4,
      binsY: 2,
      random: () => 0.5,
    });
    // Three identical points are a degenerate triangle; bounds are one bin.
    assert.equal(full.touched, 1);
    const cover = binTriangles({
      count: 1,
      binsX: 2,
      binsY: 2,
      random: sequence([0, 0, 1, 0, 0.99, 0.99]),
    });
    assert.equal(cover.touched, 4);
  });
});

function sequence(values) {
  let i = 0;
  return () => values[i++ % values.length];
}
