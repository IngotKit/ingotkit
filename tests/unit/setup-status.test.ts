import { describe, expect, it } from "vitest";

import { readEnv } from "@/lib/env";
import { checkDatabase, describeFeatures } from "@/lib/setup/status";

const core = {
  DATABASE_URL: "mysql://user:secret-pass@127.0.0.1:3306/ingotkit",
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "s".repeat(40),
};

function feature(name: string, env: Record<string, string>) {
  const found = describeFeatures(readEnv(env)).find((f) => f.feature === name);
  if (!found) throw new Error(`no feature ${name}`);
  return found;
}

describe("describeFeatures", () => {
  it("never exposes secret values, only public ones", () => {
    const all = JSON.stringify(describeFeatures(readEnv({ ...core, GITHUB_CLIENT_ID: "Ov23abc", GITHUB_CLIENT_SECRET: "topsecret" })));
    expect(all).not.toContain("secret-pass");
    expect(all).not.toContain("s".repeat(40));
    expect(all).not.toContain("topsecret");
    expect(all).toContain("http://localhost:3000");
    expect(all).toContain("Ov23abc");
  });

  it("marks a fully set feature ready and a half-set one partial", () => {
    expect(feature("github", { GITHUB_CLIENT_ID: "a", GITHUB_CLIENT_SECRET: "b" }).state).toBe("ready");
    expect(feature("github", { GITHUB_CLIENT_ID: "a" }).state).toBe("partial");
    expect(feature("github", {}).state).toBe("missing");
  });

  it("treats SMTP login as optional, so a local mail catcher counts as ready", () => {
    const email = feature("email", { SMTP_HOST: "127.0.0.1", SMTP_PORT: "1025", EMAIL_FROM: "a@b.test" });
    expect(email.state).toBe("ready");
    expect(email.vars.find((v) => v.key === "SMTP_USER")?.state).toBe("optional");
  });

  it("flags invalid values", () => {
    const email = feature("email", { SMTP_HOST: "x", SMTP_PORT: "abc", EMAIL_FROM: "a@b.test" });
    expect(email.state).toBe("invalid");
    expect(email.vars.find((v) => v.key === "SMTP_PORT")?.message).toMatch(/port/);
  });
});

describe("checkDatabase", () => {
  it("reports not-configured without touching the network when DATABASE_URL is missing", async () => {
    expect(await checkDatabase(readEnv({}))).toEqual({ state: "not-configured" });
  });
});
