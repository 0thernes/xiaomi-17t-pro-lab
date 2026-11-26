/**
 * Capture fresh phone (412x915) and desktop (1440x900) route screenshots via Playwright.
 * Usage: node tools/shoot.mjs  (or: npm run screenshots)
 */
import { spawnSync } from "node:child_process";

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(cmd, ["playwright", "test", "--grep", "every route at a phone viewport"], {
  stdio: "inherit",
  env: { ...process.env, SHOOT: "1" },
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
