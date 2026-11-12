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
  ["#/litho", "litho"],
  ["#/transistor", "transistor"],
  ["#/compare", "compare"],
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
    if (process.env.SHOOT) {
      await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true });
    }
  }
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
