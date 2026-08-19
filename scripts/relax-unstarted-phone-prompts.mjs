import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const campaignFile = path.join(ROOT, "artifacts", "image-campaign", "gyeonggi-baby-template11-v1", "campaign.v1.json");
const campaign = JSON.parse(await readFile(campaignFile, "utf8"));
const oldText = "plain unbranded matte phone back with exactly one small flat camera lens and no other circles, dots, marks, camera island, logo, text, or decoration";
const newText = "plain unbranded matte phone back with one or two small flat camera lenses and at most one ordinary tiny flash; no raised camera island, central mark, logo, text, or decoration";
let changed = 0;

for (const entry of campaign.jobs) {
  const jobFile = path.join(ROOT, "artifacts", "image-campaign", "gyeonggi-baby-template11-v1", "jobs", entry.siteKey, `${entry.logicalAssetId}.json`);
  const job = JSON.parse(await readFile(jobFile, "utf8"));
  try {
    await access(path.join(ROOT, job.receiptFile));
    continue;
  } catch {}
  const promptFile = path.join(ROOT, job.promptPath);
  const original = await readFile(promptFile, "utf8");
  if (!original.includes(oldText)) continue;
  const revised = original.replace(oldText, newText);
  const promptSha256 = createHash("sha256").update(revised).digest("hex");
  job.promptSha256 = promptSha256;
  entry.promptSha256 = promptSha256;
  await writeFile(promptFile, revised);
  await writeFile(jobFile, `${JSON.stringify(job, null, 2)}\n`);
  changed += 1;
}
await writeFile(campaignFile, `${JSON.stringify(campaign, null, 2)}\n`);
console.log(JSON.stringify({ changed, preservedStartedJobs: campaign.jobs.length - changed }, null, 2));
