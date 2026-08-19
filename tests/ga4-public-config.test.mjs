import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildGa4DryRunReport,
  resolveGa4Account,
} from "../scripts/lib/ga4-public-config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("GA4 public configuration", () => {
  it("requires an explicit account and accepts only accounts/<digits>", () => {
    expect(() => resolveGa4Account()).toThrow("BABY_GA4_ACCOUNT_REQUIRED");
    expect(() => resolveGa4Account({ envAccount: "" })).toThrow(
      "BABY_GA4_ACCOUNT_REQUIRED",
    );

    for (const account of [
      "123456789",
      "accounts/",
      "accounts/12a",
      "accounts/123/456",
      " accounts/123",
      "accounts/123 ",
    ]) {
      expect(() => resolveGa4Account({ envAccount: account })).toThrow(
        "BABY_GA4_ACCOUNT_INVALID",
      );
    }

    expect(resolveGa4Account({ envAccount: "accounts/123456789" })).toBe(
      "accounts/123456789",
    );
  });

  it("lets an explicit CLI account override the environment account", () => {
    expect(
      resolveGa4Account({
        cliAccount: "accounts/222",
        envAccount: "accounts/111",
      }),
    ).toBe("accounts/222");
  });

  it("omits service-account identity from dry-run output", () => {
    const report = buildGa4DryRunReport({
      account: "accounts/123456789",
      serviceAccount: "PRIVATE_SERVICE_ACCOUNT_SENTINEL",
      configured: [
        { siteKey: "suwon", action: "READY" },
        { siteKey: "goyang", action: "CREATE_PROPERTY_AND_STREAM" },
      ],
    });

    expect(report).toEqual({
      status: "DRY_RUN",
      account: "accounts/123456789",
      ready: 1,
      create: 1,
      configured: [
        { siteKey: "suwon", action: "READY" },
        { siteKey: "goyang", action: "CREATE_PROPERTY_AND_STREAM" },
      ],
    });
    expect(JSON.stringify(report)).not.toContain("PRIVATE_SERVICE_ACCOUNT_SENTINEL");
    expect(report).not.toHaveProperty("serviceAccount");
  });

  it("does not hardcode a numeric account resource in the executable", async () => {
    const source = await readFile(
      path.join(ROOT, "scripts/provision-ga4-properties.mjs"),
      "utf8",
    );
    expect(source).not.toMatch(/["']accounts\/\d+["']/u);
    expect(source).toContain("process.env.BABY_GA4_ACCOUNT");
  });

  it("normalizes the pnpm argument separator before parsing option pairs", async () => {
    const source = await readFile(
      path.join(ROOT, "scripts/provision-ga4-properties.mjs"),
      "utf8",
    );

    expect(source).toContain(
      'process.argv.slice(2).filter((argument) => argument !== "--")',
    );
    expect(source).toContain("args.set(cliArgs[index], cliArgs[index + 1])");
  });

  it("creates a property with its parent in the request body", async () => {
    const source = await readFile(
      path.join(ROOT, "scripts/provision-ga4-properties.mjs"),
      "utf8",
    );

    expect(source).toContain(
      '"https://analyticsadmin.googleapis.com/v1beta/properties"',
    );
    expect(source).toContain("parent: account");
    expect(source).not.toMatch(/v1beta\/properties\?parent=/u);
  });

  it("loads the ignored local GA IDs for every command that builds public HTML", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(ROOT, "package.json"), "utf8"),
    );

    for (const script of [
      "build:site",
      "build:all",
      "test:browser:production",
    ]) {
      expect(packageJson.scripts[script]).toContain(
        "node --env-file-if-exists=.env.local",
      );
    }
  });
});
