import { expect, test } from "@playwright/test";

const routes = [
  ["#/", "phone"],
  ["#/zoom", "zoom"],
  ["#/zoom/cpu/cpu_l14_litho/physics", "zoom-litho"],
  ["#/zoom/gpu/gpu_l8_alu/throughput", "zoom-gpu"],
  ["#/zoom/npu/npu_l7_bitnet/structure", "zoom-npu"],
  ["#/cpu", "cpu"],
  ["#/gpu", "gpu"],
  ["#/npu", "npu"],
  ["#/memory", "memory"],
  ["#/thermal", "thermal"],
  ["#/litho", "litho"],
  ["#/transistor", "transistor"],
  ["#/compare", "compare"],
  ["#/work", "work"],
  ["#/work/llm", "work-llm"],
  ["#/work/life", "work-life"],
  ["#/work/sci", "work-sci"],
  ["#/work/browser", "work-browser"],
  ["#/specs", "specs"],
];

test("every route at a phone viewport", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [hash, name] of routes) {
    await page.goto(`/${hash}`);
    await expect(page.locator("#main[data-ready='true']")).toBeVisible();
    await expect(page.locator("#main h1")).toBeVisible();
    const sound = page.locator("#sound");
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    if (name === "gpu") {
      await expect(page.locator("#main")).toContainText("within tolerance");
    }
    if (name === "cpu") {
      await expect(page.locator("#main")).toContainText("ns/load");
    }
    if (name === "litho") {
      await expect(page.locator("#main")).toContainText("k1");
    }
    if (name === "transistor") {
      await expect(page.locator("#main")).toContainText("analytic");
    }
    if (name === "compare") {
      await expect(page.locator("#main")).toContainText("UNKNOWN");
    }
    if (name === "npu") {
      await expect(page.locator("#main")).toContainText("do not run on the MediaTek NPU");
    }
    const dock = page.locator("nav.nav a").first();
    const box = await dock.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    if (process.env.SHOOT) {
      await page.screenshot({ path: `docs/screenshots/phone/${name}.png` });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({ path: `docs/screenshots/desktop/${name}.png` });
      await page.setViewportSize({ width: 412, height: 915 });
    }
  }
  expect(errors).toEqual([]);
});

async function brightestCanvas(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("#main canvas");
    const probe = document.createElement("canvas");
    probe.width = 48;
    probe.height = 48;
    const ctx = probe.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, 48, 48);
    const data = ctx.getImageData(0, 0, 48, 48).data;
    let max = 0;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i + 1], data[i + 2]);
    return max;
  });
}

test("high tier hero is not a black canvas", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?tier=high#/");
  await expect(page.locator("#main[data-ready='true'] canvas")).toBeVisible();
  await page.waitForTimeout(800);
  expect(await brightestCanvas(page)).toBeGreaterThan(12);
  expect(errors).toEqual([]);
});

test("memory, thermal, lithography, and transistor views are not black canvases", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const hash of ["#/memory", "#/thermal", "#/litho", "#/transistor"]) {
    await page.goto(`/?tier=high${hash}`);
    await expect(page.locator("#main[data-ready='true'] canvas").first()).toBeVisible();
    await page.waitForTimeout(800);
    expect(await brightestCanvas(page)).toBeGreaterThan(12);
  }
  expect(errors).toEqual([]);
});

test("Ctrl+K command palette opens and navigates to Thermal PDE", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#/");
  await expect(page.locator("#main[data-ready='true'] h1")).toBeVisible();
  await page.click("#cmd-open");
  await expect(page.locator("dialog.cmd-dialog")).toBeVisible();
  await page.fill("input.cmd-input", "Thermal");
  await page.keyboard.press("Enter");
  await expect(page.locator("#main[data-ready='true'] h1")).toContainText("Thermal PDE");
  expect(errors).toEqual([]);
});

test("WebGL2 matmul matches the CPU reference", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?webgl=1#/gpu");
  await expect(page.locator("#main[data-ready='true']")).toContainText("webgl2");
  await expect(page.locator("#main")).toContainText("within tolerance");
  expect(errors).toEqual([]);
});

test("subpath hosting still reaches the CPU lab", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/xiaomi-17t-pro-lab/#/cpu");
  await expect(page.locator("#main[data-ready='true'] h1")).toContainText("CPU");
  expect(errors).toEqual([]);
});

test("every route is error-free and any canvas is not black", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  for (const [hash, name] of routes) {
    await page.goto(`/?tier=high${hash}`);
    await expect(page.locator("#main[data-ready='true']")).toBeVisible();
    await page.waitForTimeout(500);
    const canvases = await page.locator("#main canvas").count();
    if (canvases > 0) {
      const bright = await brightestCanvas(page);
      expect(bright, `${name} canvas peak`).toBeGreaterThan(12);
    }
  }
  expect(errors).toEqual([]);
});

test("desktop layout places nav sidebar beside main without overlap", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#/");
  await expect(page.locator("#main[data-ready='true'] h1")).toBeVisible();
  const navBox = await page.locator("nav.nav").boundingBox();
  const mainBox = await page.locator("#main").boundingBox();
  expect(navBox.width).toBeLessThanOrEqual(260);
  expect(mainBox.x).toBeGreaterThanOrEqual(navBox.x + navBox.width - 1);
});
