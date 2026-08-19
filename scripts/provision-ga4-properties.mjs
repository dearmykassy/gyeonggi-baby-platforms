import { createSign } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildGa4DryRunReport,
  resolveGa4Account,
} from "./lib/ga4-public-config.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const inventory = JSON.parse(
  await readFile(path.join(ROOT, "src/data/city-regions.generated.json"), "utf8"),
);
const args = new Map();
const cliArgs = process.argv.slice(2).filter((argument) => argument !== "--");
for (let index = 0; index < cliArgs.length; index += 2) {
  args.set(cliArgs[index], cliArgs[index + 1]);
}
const apply = args.get("--apply") === "yes";
const account = resolveGa4Account({
  cliAccount: args.get("--account"),
  envAccount: process.env.BABY_GA4_ACCOUNT,
});
const credentialsPath =
  args.get("--credentials") ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  throw new Error("BABY_GA4_GOOGLE_APPLICATION_CREDENTIALS_REQUIRED");
}

const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
if (
  credentials.type !== "service_account" ||
  !credentials.client_email ||
  !credentials.private_key
) {
  throw new Error("BABY_GA4_SERVICE_ACCOUNT_CREDENTIAL_INVALID");
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
    throw new Error(`BABY_GA4_TOKEN_FAILED:${response.status}:${data.error ?? "unknown"}`);
  }
  return data.access_token;
}

const token = await getAccessToken();
async function gaRequest(url, options = {}) {
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
  if (!response.ok) {
    throw new Error(
      `BABY_GA4_ADMIN_REQUEST_FAILED:${response.status}:${data.error?.status ?? "unknown"}:${data.error?.message ?? "unknown"}`,
    );
  }
  return data;
}

async function listAccountProperties() {
  const results = [];
  let pageToken = "";
  do {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await gaRequest(url);
    const summary = (data.accountSummaries ?? []).find(
      (entry) => entry.account === account,
    );
    results.push(...(summary?.propertySummaries ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return results;
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

let properties = await listAccountProperties();
const configured = [];
for (const site of inventory.sites) {
  const displayName = `${site.brandName} · ${site.projectName}.pages.dev`;
  let property = properties.find((entry) => entry.displayName === displayName);
  if (!property) {
    if (!apply) {
      configured.push({ siteKey: site.key, action: "CREATE_PROPERTY_AND_STREAM" });
      continue;
    }
    property = await gaRequest(
      "https://analyticsadmin.googleapis.com/v1beta/properties",
      {
        method: "POST",
        body: JSON.stringify({
          parent: account,
          displayName,
          timeZone: "Asia/Seoul",
          currencyCode: "KRW",
          industryCategory: "BEAUTY_AND_FITNESS",
        }),
      },
    );
    properties = [...properties, property];
  }

  let streams = await listStreams(property.property ?? property.name);
  let stream = streams.find(
    (entry) => entry.webStreamData?.defaultUri === site.plannedOrigin,
  );
  if (!stream) {
    if (!apply) {
      configured.push({
        siteKey: site.key,
        property: property.property ?? property.name,
        action: "CREATE_STREAM",
      });
      continue;
    }
    stream = await gaRequest(
      `https://analyticsadmin.googleapis.com/v1beta/${property.property ?? property.name}/dataStreams`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "WEB_DATA_STREAM",
          displayName: site.brandName,
          webStreamData: { defaultUri: site.plannedOrigin },
        }),
      },
    );
    streams = [...streams, stream];
  }
  const measurementId = stream.webStreamData?.measurementId;
  const propertyName = property.property ?? property.name;
  const propertyId = String(propertyName).split("/").at(-1);
  if (!/^G-[A-Z0-9]{4,15}$/u.test(measurementId ?? "") || !/^\d+$/u.test(propertyId ?? "")) {
    throw new Error(`BABY_GA4_CREATED_RESOURCE_INVALID:${site.key}`);
  }
  configured.push({
    siteKey: site.key,
    propertyName,
    propertyId,
    dataStreamName: stream.name,
    measurementId,
    defaultUri: stream.webStreamData.defaultUri,
    action: "READY",
  });
}

if (!apply) {
  console.log(
    JSON.stringify(
      buildGa4DryRunReport({ account, configured }),
      null,
      2,
    ),
  );
  process.exit(0);
}

if (configured.length !== 27 || configured.some((item) => item.action !== "READY")) {
  throw new Error(`BABY_GA4_PROVISION_COUNT:${configured.length}`);
}

const envPath = path.join(ROOT, ".env.local");
let envText = "";
try {
  envText = await readFile(envPath, "utf8");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const retainedLines = envText
  .split(/\r?\n/u)
  .filter(
    (line) =>
      line &&
      !/^NEXT_PUBLIC_GA_MEASUREMENT_ID_[A-Z0-9_]+=/u.test(line) &&
      !/^GA4_PROPERTY_ID_[A-Z0-9_]+=/u.test(line),
  );
const envLines = [];
for (const item of configured) {
  const site = inventory.sites.find((candidate) => candidate.key === item.siteKey);
  envLines.push(`${site.gaMeasurementIdEnv}=${item.measurementId}`);
  envLines.push(`${site.gaPropertyIdEnv}=${item.propertyId}`);
}
await writeFile(envPath, `${[...retainedLines, ...envLines].join("\n")}\n`, {
  mode: 0o600,
});
const receiptPath = path.join(ROOT, "artifacts/ga4/ga4-properties.v1.json");
await mkdir(path.dirname(receiptPath), { recursive: true });
await writeFile(
  receiptPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      account,
      serviceAccount: credentials.client_email,
      siteCount: configured.length,
      configured,
    },
    null,
    2,
  )}\n`,
);
console.log(
  JSON.stringify(
    { status: "PASS", siteCount: configured.length, envPath, receiptPath },
    null,
    2,
  ),
);
