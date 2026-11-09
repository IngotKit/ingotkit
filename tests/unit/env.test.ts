import { describe, expect, it } from "vitest";

import { ENV_VARS, isFeatureReady, readEnv } from "@/lib/env";

const validCore = {
  DATABASE_URL: "mysql://user:pass@127.0.0.1:3306/ingotkit",
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "x".repeat(32),
};

describe("readEnv", () => {
  it("reports every variable as missing for an empty environment, without throwing", () => {
    const report = readEnv({});
    expect(report.coreReady).toBe(false);
    expect(report.values).toEqual({});
    expect(report.invalid).toEqual([]);
    expect(report.missing.map((issue) => issue.key).sort()).toEqual(Object.keys(ENV_VARS).sort());
  });

  it("is core-ready when only the core variables are set", () => {
    const report = readEnv(validCore);
    expect(report.coreReady).toBe(true);
    expect(report.values).toEqual(validCore);
    expect(report.missing.every((issue) => !issue.required)).toBe(true);
  });

  it("treats blank and whitespace-only values as missing", () => {
    const report = readEnv({ ...validCore, BETTER_AUTH_SECRET: "   " });
    expect(report.coreReady).toBe(false);
    expect(report.missing.find((issue) => issue.key === "BETTER_AUTH_SECRET")).toMatchObject({
      feature: "core",
      required: true,
    });
  });

  it("reports invalid values with a message and leaves them out of values", () => {
    const report = readEnv({
      ...validCore,
      DATABASE_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "pk_test_123",
    });
    expect(report.coreReady).toBe(false);
    expect(report.values.DATABASE_URL).toBeUndefined();
    expect(report.invalid.map((issue) => issue.key).sort()).toEqual([
      "DATABASE_URL",
      "STRIPE_SECRET_KEY",
    ]);
    expect(report.invalid.find((issue) => issue.key === "DATABASE_URL")?.message).toMatch(/mysql:\/\//);
  });

  it("does not block core when an optional feature is invalid", () => {
    const report = readEnv({ ...validCore, SMTP_PORT: "not-a-port" });
    expect(report.coreReady).toBe(true);
    expect(report.invalid.map((issue) => issue.key)).toEqual(["SMTP_PORT"]);
  });

  it("gives every variable a feature and help text for /setup", () => {
    for (const spec of Object.values(ENV_VARS)) {
      expect(spec.help.length).toBeGreaterThan(0);
      expect(spec.feature).toBeTruthy();
    }
  });
});

describe("isFeatureReady", () => {
  it("is true only when every variable of the feature is valid", () => {
    const partial = readEnv({ ...validCore, HIGGSFIELD_API_KEY_ID: "id" });
    expect(isFeatureReady("core", partial)).toBe(true);
    expect(isFeatureReady("media", partial)).toBe(false);

    const full = readEnv({ ...validCore, HIGGSFIELD_API_KEY_ID: "id", HIGGSFIELD_API_KEY_SECRET: "secret" });
    expect(isFeatureReady("media", full)).toBe(true);
    expect(isFeatureReady("anthropic", readEnv({ ...validCore, ANTHROPIC_API_KEY: "a" }))).toBe(true);
    expect(isFeatureReady("openai", readEnv({ ...validCore, ANTHROPIC_API_KEY: "a" }))).toBe(false);
  });
});
