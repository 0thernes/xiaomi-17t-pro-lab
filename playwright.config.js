import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:47321",
    ...devices["Pixel 7"],
    ...(process.env.CI ? {} : { channel: "chrome" }),
  },
  webServer: {
    command: "node tools/serve.mjs 47321",
    url: "http://127.0.0.1:47321/",
    reuseExistingServer: false,
    timeout: 20000,
  },
});
