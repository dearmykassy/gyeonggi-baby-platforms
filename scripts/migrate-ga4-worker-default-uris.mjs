import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  assessGa4State,
  buildExpectedGa4Sites,
  buildSafeReport,
  parseEnvFile,
} from "./lib/ga4-worker-uri-migration.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const cliArgs = process.argv.slice(2).filter((argument) => argument !== "--");
const args = new Map();
for (let index = 0; index < cliArgs.length; index += 2) {
  args.set(cliArgs[index], cliArgs[index + 1]);
}
const apply = args.get("--apply") === "yes";
const credentialsPath =
  args.get("--credentials") ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  throw new Error("BABY_GA4_MIGRATION_CREDENTIALS_REQUIRED");
}

const inventory = JSON.parse(
  await readFile(path.join(ROOT, "src/data/city-regions.generated.json"), "utf8"),
);
const env = parseEnvFile(await readFile(path.join(ROOT, ".env.local"), "utf8"));
const expectedSites = buildExpectedGa4Sites({ inventory, env });
const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
if (
  credentials.type !== "service_account" ||
  !credentials.client_email ||
  !credentials.private_key
) {
  throw new Error("BABY_GA4_MIGRATION_CREDENTIAL_INVALID");
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/analytics.edit",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(credentials.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`BABY_GA4_MIGRATION_TOKEN_FAILED:${response.status}`);
  }
  return data.access_token;
}

const token = await getAccessToken();
async function gaRequest(url, options = {}) {
  const retryable = new Set([429, 500, 502, 503, 504]);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (response.ok) return data;
    if (!retryable.has(response.status) || attempt === 5) {
      throw new Error(
        `BABY_GA4_MIGRATION_API_FAILED:${response.status}:${data.error?.status ?? "unknown"}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
  }
  throw new Error("BABY_GA4_MIGRATION_API_RETRY_EXHAUSTED");
}

async function listStreams(propertyName) {
  const results = [];
  let pageToken = "";
  do {
    const url = new URL(
      `https://analyticsadmin.googleapis.com/v1beta/${propertyName}/dataStreams`,
    );
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await gaRequest(url);
    results.push(...(data.dataStreams ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return results;
}

async function readState(site) {
  const streams = await listStreams(site.propertyName);
  const webStreams = streams.filter((stream) => stream.type === "WEB_DATA_STREAM");
  const stream = webStreams[0];
  let enhanced = {};
  if (stream?.name) {
    enhanced = await gaRequest(
      `https://analyticsadmin.googleapis.com/v1alpha/${stream.name}/enhancedMeasurementSettings`,
    );
  }
  return {
    key: site.key,
    propertyName: site.propertyName,
    streamCount: streams.length,
    webStreamCount: webStreams.length,
    streamName: stream?.name ?? null,
    measurementId: stream?.webStreamData?.measurementId ?? null,
    defaultUri: stream?.webStreamData?.defaultUri ?? null,
    // Google omits protobuf default `false` fields from JSON responses. Page
    // history auto-tracking is effective only when enhanced measurement and
    // its page-change option are both enabled.
    enhancedPageHistoryEffective:
      (enhanced.streamEnabled ?? false) &&
      (enhanced.pageChangesEnabled ?? false),
  };
}

async function audit() {
  const states = [];
  for (let index = 0; index < expectedSites.length; index += 5) {
    states.push(
      ...(await Promise.all(expectedSites.slice(index, index + 5).map(readState))),
    );
  }
  return assessGa4State({ expectedSites, states });
}

const before = await audit();
console.log(JSON.stringify(buildSafeReport({ phase: "BEFORE", assessment: before }), null, 2));

if (!apply) process.exit(0);

for (const site of before.migrationPlan) {
  const url = new URL(
    `https://analyticsadmin.googleapis.com/v1beta/${site.streamName}`,
  );
  url.searchParams.set("updateMask", "webStreamData.defaultUri");
  await gaRequest(url, {
    method: "PATCH",
    body: JSON.stringify({
      name: site.streamName,
      webStreamData: { defaultUri: site.targetOrigin },
    }),
  });
}

const after = await audit();
if (after.migrationPlan.length !== 0) {
  throw new Error(`BABY_GA4_MIGRATION_INCOMPLETE:${after.migrationPlan.length}`);
}
console.log(JSON.stringify(buildSafeReport({ phase: "AFTER", assessment: after }), null, 2));
