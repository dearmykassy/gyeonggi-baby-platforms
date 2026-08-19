import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CAMPAIGN_ID = "gyeonggi-baby-template11-v1";
const CAMPAIGN_ROOT = path.join(ROOT, "artifacts", "image-campaign", CAMPAIGN_ID);

const sites = [
  ["goyang", "고양", 7], ["gwacheon", "과천", 5],
  ["gwangmyeong", "광명", 5], ["gwangju-gyeonggi", "광주", 5],
  ["guri", "구리", 5], ["gunpo", "군포", 5], ["gimpo", "김포", 5],
  ["namyangju", "남양주", 5], ["dongducheon", "동두천", 5],
  ["bucheon", "부천", 5], ["seongnam", "성남", 7], ["suwon", "수원", 7],
  ["siheung", "시흥", 5], ["ansan", "안산", 5], ["anseong", "안성", 5],
  ["anyang", "안양", 5], ["yangju", "양주", 5], ["yeoncheon", "연천", 5],
  ["osan", "오산", 5], ["yongin", "용인", 7], ["uiwang", "의왕", 5],
  ["uijeongbu", "의정부", 5], ["paju", "파주", 5], ["pyeongtaek", "평택", 5],
  ["pocheon", "포천", 5], ["hanam", "하남", 5], ["hwaseong", "화성", 5],
];

const concepts = [
  {
    key: "mirror-selfie",
    scene: "a refined apartment entry lounge with a large clean wall mirror, no bed and no bathroom fixtures",
    subject: "one adult Korean woman massage practitioner, age 28 to 36, taking a natural mirror selfie; her full face is visible beside the phone and there is exactly one coherent reflection",
    composition: "landscape editorial photograph, three-quarter body, eye-level, subject near the center third; keep face, hands, phone, and reflection inside both wide and mobile crop-safe zones",
    constraint: "plain unbranded matte phone back with one or two small flat camera lenses and at most one ordinary tiny flash; no raised camera island, central mark, logo, text, or decoration",
  },
  {
    key: "tailored-portrait",
    scene: "a quiet contemporary wellness reception with warm wood, soft stone, and no visible brand signage",
    subject: "one adult Korean woman massage practitioner, age 28 to 36, standing naturally in tasteful fitted business-casual clothing",
    composition: "landscape lifestyle portrait, three-quarter body, natural relaxed posture, face and both hands clearly visible, generous crop-safe margins",
    constraint: "no phone, no massage client, no suggestive pose",
  },
  {
    key: "towel-prep",
    scene: "a clean private wellness preparation counter in a bright apartment-style interior, with neatly folded plain towels and one unlabeled neutral pump bottle",
    subject: "one adult Korean woman massage practitioner, age 28 to 36, calmly arranging towels before a visit",
    composition: "landscape candid editorial photo, waist-up to three-quarter body, face and both hands visible, crop-safe centered action",
    constraint: "no phone, no client, no treatment bed, no readable packaging",
  },
  {
    key: "window-lounge",
    scene: "a modern residential lounge beside a large window with soft daylight and understated neutral furniture, no bed",
    subject: "one adult Korean woman massage practitioner, age 28 to 36, standing with a composed friendly expression in polished everyday attire",
    composition: "landscape natural-light portrait, three-quarter body, subtle off-center framing with safe margins for responsive crops",
    constraint: "no phone, no client, no suggestive pose",
  },
  {
    key: "seated-consultation",
    scene: "a calm modern consultation corner with one simple chair, a small table, and plain interior materials, no bed or bathroom",
    subject: "one adult Korean woman massage practitioner, age 28 to 36, seated upright with a welcoming professional expression",
    composition: "landscape editorial portrait, knees-up framing, hands resting naturally and fully visible, face centered for mobile crop safety",
    constraint: "no phone, no client, no clipboard text, no suggestive pose",
  },
];

const outfits = [
  "an opaque ivory blouse with tailored charcoal slacks",
  "a muted rose cardigan over an opaque cream top with dark tailored trousers",
  "a soft taupe knit top with a knee-length A-line skirt and opaque tights",
  "a slate-blue blouse with high-waisted black slacks",
  "a warm beige fitted cardigan with straight dark-brown trousers",
  "a burgundy long-sleeve blouse with a modest neckline and tailored navy slacks",
  "a dusty mauve knit jacket with an opaque white inner top and charcoal trousers",
  "a forest-green blouse with a modest collar and cream tailored slacks",
  "a cocoa-brown knit top with a midi skirt below the knee",
  "a pale blue button blouse with dark plum tailored trousers",
];

const lighting = [
  "soft late-afternoon window light with realistic skin texture",
  "bright diffused morning light with gentle natural shadows",
  "warm indirect interior light balanced with cool window daylight",
  "clean overcast daylight with subtle film grain",
  "soft golden-hour side light without dramatic glamour styling",
];

const accents = [
  "warm oak and ivory", "stone gray and muted rose", "cream and walnut",
  "soft sage and sand", "charcoal and warm beige", "dusty blue and light wood",
  "terracotta and off-white", "mauve and dark walnut", "olive and pale stone",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function promptFor(siteKey, cityName, localIndex, globalIndex) {
  const concept = concepts[(globalIndex + localIndex * 2) % concepts.length];
  const outfit = outfits[(globalIndex * 3 + localIndex) % outfits.length];
  const light = lighting[(globalIndex + siteKey.length) % lighting.length];
  const accent = accents[(globalIndex * 5 + localIndex) % accents.length];
  return [
    "Use case: photorealistic-natural",
    `Asset type: responsive regional and editorial website banner for the ${cityName} baby platform`,
    `Primary request: a distinct, natural Korean lifestyle photograph for asset ${siteKey}-${String(localIndex).padStart(2, "0")}; mature feminine styling with a polished Dongtan-inspired look, tasteful and professional rather than provocative`,
    `Scene/backdrop: ${concept.scene}`,
    `Subject: ${concept.subject}; wearing ${outfit}; fully opaque complete clothing with no exposed cleavage, lingerie, swimwear, transparent fabric, or fetish styling`,
    "Style/medium: photorealistic Korean lifestyle photography, realistic pores and fabric texture, restrained retouching, not an advertisement mockup",
    `Composition/framing: ${concept.composition}`,
    `Lighting/mood: ${light}; calm, confident, approachable`,
    `Color palette: ${accent}`,
    `Constraints: ${concept.constraint}; exactly one adult woman; Korean adult appearance; normal anatomy and hands; nonsexual; no extra people; no duplicated body or reflection; no bed; no bathroom; no medical machine; no text; no letters; no numbers; no logo; no brand mark; no watermark`,
    "Avoid: celebrity likeness, school uniform, youthful or underage appearance, lingerie, cleavage emphasis, exaggerated body proportions, seductive pose, selfie-face obstruction, Apple-style marks, recognizable phone branding, malformed fingers, extra limbs, plastic skin, visible signage",
  ].join("\n");
}

async function writeExact(filePath, content) {
  try {
    const existing = await readFile(filePath, "utf8");
    if (existing !== content) throw new Error(`IMMUTABLE_FILE_MISMATCH:${filePath}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }
}

const jobs = [];
let globalIndex = 0;
for (const [siteKey, cityName, count] of sites) {
  for (let localIndex = 1; localIndex <= count; localIndex += 1) {
    globalIndex += 1;
    const id = `gbt11-${siteKey}-${String(localIndex).padStart(2, "0")}-v1`;
    const prompt = `${promptFor(siteKey, cityName, localIndex, globalIndex)}\n`;
    const promptPath = path.join(CAMPAIGN_ROOT, "prompts", siteKey, `${id}.txt`);
    const jobPath = path.join(CAMPAIGN_ROOT, "jobs", siteKey, `${id}.json`);
    const generatedPath = path.join(CAMPAIGN_ROOT, "generated", siteKey, `${id}.png`);
    const receiptPath = path.join(CAMPAIGN_ROOT, "receipts", siteKey, `${id}.json`);
    const job = {
      schemaVersion: 1,
      campaignId: CAMPAIGN_ID,
      logicalAssetId: id,
      siteKey,
      cityName,
      localIndex,
      concept: concepts[(globalIndex + localIndex * 2) % concepts.length].key,
      promptPath: path.relative(ROOT, promptPath),
      promptSha256: sha256(prompt),
      outputFile: path.relative(ROOT, generatedPath),
      receiptFile: path.relative(ROOT, receiptPath),
      builtInImageGenCallCountRequired: 1,
      reviewStatus: "PENDING_ROOT_REVIEW",
    };
    await writeExact(promptPath, prompt);
    await writeExact(jobPath, `${JSON.stringify(job, null, 2)}\n`);
    jobs.push(job);
  }
}

const manifest = {
  schemaVersion: 1,
  campaignId: CAMPAIGN_ID,
  status: "READY_FOR_GENERATION",
  useCase: "photorealistic-natural",
  siteCount: sites.length,
  jobCount: jobs.length,
  maxPlacementsPerMaster: 6,
  allPlacementsIncludingHomeSlots: true,
  jobs: jobs.map((job) => ({
    logicalAssetId: job.logicalAssetId,
    siteKey: job.siteKey,
    promptSha256: job.promptSha256,
    outputFile: job.outputFile,
    receiptFile: job.receiptFile,
  })),
};
await writeExact(path.join(CAMPAIGN_ROOT, "campaign.v1.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({ campaignId: CAMPAIGN_ID, sites: sites.length, jobs: jobs.length }, null, 2));
