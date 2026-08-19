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
});
