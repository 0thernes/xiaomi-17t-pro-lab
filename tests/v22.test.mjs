import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import specs from "../data/specs.json" with { type: "json" };

describe("2.2.0 citations and assets", () => {
  it("gives conflicts 16 through 22 a precedence sentence", () => {
    for (let id = 16; id <= 22; id++) {
      const row = specs.conflicts.find((item) => item.id === id);
      assert.ok(row, `missing conflict ${id}`);
      assert.equal(typeof row.resolution, "string");
      assert.ok(row.resolution.length > 40, row.resolution);
    }
  });

  it("ships three CC0 percussion hits and does not invent a battery watt-hour leaf", () => {
    for (const name of ["claves_pp1.wav", "snare_pp2.wav", "shake8.wav"]) {
      const bytes = readFileSync(new URL(`../vendor/audio/vsco-ce/${name}`, import.meta.url));
      assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
    }
    const notice = readFileSync(new URL("../vendor/audio/vsco-ce/NOTICE.md", import.meta.url), "utf8");
    assert.match(notice, /CC0/);
    assert.equal(specs.device.battery_typical_mah.value, 7000);
    assert.equal(specs.device.battery_label_wh, undefined);
  });

  it("keeps style-src on self in both the page and the dev server", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const server = readFileSync(new URL("../tools/serve.mjs", import.meta.url), "utf8");
    const htmlPolicy = html.match(/content="([^"]*style-src[^"]*)"/)[1];
    const serverPolicy = server.match(/default-src 'self'[^"]+/)[0];
    assert.equal(htmlPolicy.includes("unsafe-inline"), false);
    assert.equal(serverPolicy.includes("unsafe-inline"), false);
    assert.match(htmlPolicy, /style-src 'self'/);
    assert.match(serverPolicy, /style-src 'self'/);
  });
});
