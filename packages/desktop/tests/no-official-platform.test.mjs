import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

// Harness regression: official z.ai platform code was physically removed
// (specs/harness-simplification.md). This scan fails if such code reappears.

const root = new URL("../../../", import.meta.url);
const SCAN_DIRS = [
  "packages/desktop/src",
  "packages/ui/src",
  "packages/services/src",
  "packages/shared/src",
  "packages/client/src",
  "packages/server/src",
  "packages/provider/src",
  "packages/provider-node/src",
];
const FORBIDDEN = [
  "api.z.ai",
  "zcode.z.ai",
  "cdn-zcode",
  "open.bigmodel.cn",
  "officialPlatformPolicy",
  "assertOfficialServiceAvailable",
  "coding-plan-subscription",
  "CodingPlanSubscription",
  "LoginApiKeyForm",
  "WelcomeScreen",
  "zcodeEndpoint",
  "remoteCdn",
  "official-marketplace",
  "offPeakTaskService",
];

async function* walk(dir) {
  const entries = await readdir(new URL(dir, root), { withFileTypes: true });
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) yield path;
  }
}

test("official z.ai identifiers are absent from scanned sources", async () => {
  const offenders = [];
  for (const dir of SCAN_DIRS) {
    for await (const file of walk(dir)) {
      const text = await readFile(new URL(file, root), "utf8");
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) offenders.push(`${file}: ${needle}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
