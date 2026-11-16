import { describe, expect, it } from "vitest";

import { decideRoute, safeNextPath, type RouteInput } from "@/lib/routing";

const base: RouteInput = {
  pathname: "/",
  search: "",
  coreReady: true,
  hasSessionCookie: false,
  isProduction: true,
};

describe("decideRoute", () => {
  it("sends every page to /setup while core settings are missing", () => {
    for (const pathname of ["/", "/dashboard", "/sign-in", "/pricing"]) {
      expect(decideRoute({ ...base, pathname, coreReady: false })).toEqual({ type: "redirect", to: "/setup" });
    }
  });

  it("lets /setup render while core settings are missing", () => {
    expect(decideRoute({ ...base, pathname: "/setup", coreReady: false })).toEqual({ type: "next" });
  });

  it("hides /setup on a configured production site but not in development", () => {
    expect(decideRoute({ ...base, pathname: "/setup" })).toEqual({ type: "redirect", to: "/" });
    expect(decideRoute({ ...base, pathname: "/setup", isProduction: false })).toEqual({ type: "next" });
  });

  it("sends signed-out visitors from protected pages to sign-in, keeping the destination", () => {
    expect(decideRoute({ ...base, pathname: "/dashboard/settings", search: "?tab=1" })).toEqual({
      type: "redirect",
      to: "/sign-in?next=%2Fdashboard%2Fsettings%3Ftab%3D1",
    });
  });

  it("does not treat look-alike paths as protected", () => {
    expect(decideRoute({ ...base, pathname: "/dashboards" })).toEqual({ type: "next" });
  });

  it("protects /billing and the tools too", () => {
    expect(decideRoute({ ...base, pathname: "/billing" })).toEqual({ type: "redirect", to: "/sign-in?next=%2Fbilling" });
    expect(decideRoute({ ...base, pathname: "/tools/image" })).toEqual({ type: "redirect", to: "/sign-in?next=%2Ftools%2Fimage" });
  });

  it("lets visitors with a session cookie through", () => {
    expect(decideRoute({ ...base, pathname: "/dashboard", hasSessionCookie: true })).toEqual({ type: "next" });
  });
});

describe("safeNextPath", () => {
  it("accepts same-site paths", () => {
    expect(safeNextPath("/dashboard?x=1")).toBe("/dashboard?x=1");
  });

  it("rejects external and protocol-relative URLs", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "dashboard", "", null, undefined]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
    }
  });
});
