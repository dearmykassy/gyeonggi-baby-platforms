import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const inventory = JSON.parse(
  await readFile(path.join(ROOT, "src/data/city-regions.generated.json"), "utf8"),
);
const completed = [];
for (const site of inventory.sites) {
  const result = spawnSync(
    process.execPath,
    ["scripts/build-site.mjs", "--site", site.key],
    { cwd: ROOT, env: process.env, stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`BABY_BUILD_ALL_STOPPED:${site.key}:${result.status ?? "signal"}`);
  }
  completed.push(site.key);
}
if (completed.length !== 27) {
  throw new Error(`BABY_BUILD_ALL_COUNT:${completed.length}`);
}
console.log(JSON.stringify({ status: "PASS", sites: completed }, null, 2));
