// Builds what /setup shows. Never returns secret values: only set / missing / invalid.
import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  FEATURES,
  featureKeys,
  getVarSpec,
  isFeatureReady,
  type EnvKey,
  type EnvReport,
  type Feature,
} from "@/lib/env";

export type VarState = "set" | "missing" | "invalid" | "optional";

export type VarStatus = {
  key: EnvKey;
  state: VarState;
  help: string;
  message?: string;
  /** Shown only for non-secret variables. */
  value?: string;
};

export type FeatureState = "ready" | "missing" | "partial" | "invalid";

export type FeatureStatus = {
  feature: Feature;
  label: string;
  enables: string;
  state: FeatureState;
  vars: VarStatus[];
};

export function describeFeatures(report: EnvReport): FeatureStatus[] {
  return (Object.keys(FEATURES) as Feature[]).map((feature) => {
    const vars: VarStatus[] = featureKeys(feature).map((key) => {
      const spec = getVarSpec(key);
      const invalid = report.invalid.find((issue) => issue.key === key);
      const value = report.values[key];
      if (invalid) return { key, state: "invalid", help: spec.help, message: invalid.message };
      if (value !== undefined) {
        return { key, state: "set", help: spec.help, value: spec.public ? value : undefined };
      }
      return { key, state: spec.optionalInFeature ? "optional" : "missing", help: spec.help };
    });

    let state: FeatureState;
    if (vars.some((v) => v.state === "invalid")) state = "invalid";
    else if (isFeatureReady(feature, report)) state = "ready";
    else if (vars.some((v) => v.state === "set")) state = "partial";
    else state = "missing";

    return { feature, ...FEATURES[feature], state, vars };
  });
}

export const AUTH_TABLES = ["user", "session", "account", "verification", "rate_limit"] as const;

export type DatabaseStatus =
  | { state: "not-configured" }
  | { state: "unreachable"; error: string }
  | { state: "needs-migration"; missingTables: string[] }
  | { state: "ready" };

export async function checkDatabase(report: EnvReport): Promise<DatabaseStatus> {
  if (!report.values.DATABASE_URL) return { state: "not-configured" };
  try {
    const [rows] = await getDb().execute(
      sql`select table_name as name from information_schema.tables where table_schema = database()`,
    );
    const existing = new Set(
      (rows as unknown as Array<{ name?: string; NAME?: string; TABLE_NAME?: string }>).map(
        (row) => row.name ?? row.NAME ?? row.TABLE_NAME ?? "",
      ),
    );
    const missingTables = AUTH_TABLES.filter((table) => !existing.has(table));
    return missingTables.length ? { state: "needs-migration", missingTables } : { state: "ready" };
  } catch (error) {
    const err = error as { code?: string; message?: string };
    return { state: "unreachable", error: [err.code, err.message].filter(Boolean).join(": ") };
  }
}
