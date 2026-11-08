// Zod-validated environment. Never throws, at import time or later: it reports which keys
// are missing or invalid so the app can render /setup instead of crashing.
// When you add a variable: add it here, to .env.example, and (from Phase 2) to /setup.
import { z } from "zod";

export type Feature = "core" | "auth" | "email" | "billing" | "ai" | "media" | "storage" | "jobs";

export const FEATURE_LABELS: Record<Feature, string> = {
  core: "Core (required to run)",
  auth: "Social sign-in",
  email: "Email (SMTP)",
  billing: "Payments",
  ai: "Text AI",
  media: "Image and video AI",
  storage: "Media storage (S3 / R2)",
  jobs: "Background jobs (cron)",
};

type VarSpec = {
  feature: Feature;
  /** Core vars block the app. The rest only switch their feature on or off. */
  required: boolean;
  schema: z.ZodType<string>;
  /** Where to get the value; shown on /setup. */
  help: string;
};

const nonEmpty = z.string().min(1);
const url = z.url();

export const ENV_VARS = {
  DATABASE_URL: {
    feature: "core",
    required: true,
    schema: z.string().regex(/^mysql:\/\//, "must start with mysql://"),
    help: "hPanel → Databases → MySQL. Locally: mysql://forgekit:forgekit@127.0.0.1:3306/forgekit",
  },
  APP_URL: {
    feature: "core",
    required: true,
    schema: url,
    help: "Public URL of the app, e.g. https://yourdomain.com (http://localhost:3000 locally).",
  },
  BETTER_AUTH_SECRET: {
    feature: "core",
    required: true,
    schema: z.string().min(32, "must be at least 32 characters"),
    help: "Any random string of 32+ characters: run `openssl rand -base64 32`.",
  },

  GOOGLE_CLIENT_ID: { feature: "auth", required: false, schema: nonEmpty, help: "Google Cloud Console → APIs & Services → Credentials." },
  GOOGLE_CLIENT_SECRET: { feature: "auth", required: false, schema: nonEmpty, help: "Same OAuth client as GOOGLE_CLIENT_ID." },
  GITHUB_CLIENT_ID: { feature: "auth", required: false, schema: nonEmpty, help: "GitHub → Settings → Developer settings → OAuth Apps." },
  GITHUB_CLIENT_SECRET: { feature: "auth", required: false, schema: nonEmpty, help: "Same OAuth app as GITHUB_CLIENT_ID." },

  SMTP_HOST: { feature: "email", required: false, schema: nonEmpty, help: "hPanel → Emails → your mailbox → connect apps (e.g. smtp.hostinger.com)." },
  SMTP_PORT: { feature: "email", required: false, schema: z.string().regex(/^\d+$/, "must be a port number"), help: "Usually 465 (SSL) or 587 (STARTTLS)." },
  SMTP_USER: { feature: "email", required: false, schema: nonEmpty, help: "The mailbox address." },
  SMTP_PASSWORD: { feature: "email", required: false, schema: nonEmpty, help: "The mailbox password." },
  EMAIL_FROM: { feature: "email", required: false, schema: nonEmpty, help: 'Sender, e.g. "ForgeKit <hello@yourdomain.com>".' },

  STRIPE_SECRET_KEY: { feature: "billing", required: false, schema: z.string().regex(/^sk_/, "must start with sk_"), help: "Stripe Dashboard → Developers → API keys." },
  STRIPE_WEBHOOK_SECRET: { feature: "billing", required: false, schema: z.string().regex(/^whsec_/, "must start with whsec_"), help: "Stripe Dashboard → Developers → Webhooks → your endpoint." },

  ANTHROPIC_API_KEY: { feature: "ai", required: false, schema: nonEmpty, help: "console.anthropic.com → API keys." },
  OPENAI_API_KEY: { feature: "ai", required: false, schema: nonEmpty, help: "platform.openai.com → API keys." },

  HIGGSFIELD_API_KEY_ID: { feature: "media", required: false, schema: nonEmpty, help: "Higgsfield dashboard → API keys (key ID)." },
  HIGGSFIELD_API_KEY_SECRET: { feature: "media", required: false, schema: nonEmpty, help: "Higgsfield dashboard → API keys (key secret)." },

  S3_ENDPOINT: { feature: "storage", required: false, schema: url, help: "Cloudflare R2 → bucket → S3 API endpoint." },
  S3_BUCKET: { feature: "storage", required: false, schema: nonEmpty, help: "Bucket name." },
  S3_ACCESS_KEY_ID: { feature: "storage", required: false, schema: nonEmpty, help: "R2 → Manage API tokens." },
  S3_SECRET_ACCESS_KEY: { feature: "storage", required: false, schema: nonEmpty, help: "R2 → Manage API tokens." },
  S3_PUBLIC_URL: { feature: "storage", required: false, schema: url, help: "Public bucket URL or custom domain." },

  CRON_SECRET: { feature: "jobs", required: false, schema: z.string().min(16, "must be at least 16 characters"), help: "Any random string; hPanel cron sends it to /api/cron/*." },
} as const satisfies Record<string, VarSpec>;

export type EnvKey = keyof typeof ENV_VARS;
export type Env = Partial<Record<EnvKey, string>>;

export type EnvIssue = { key: EnvKey; feature: Feature; required: boolean; help: string };
export type InvalidEnvIssue = EnvIssue & { message: string };

export type EnvReport = {
  /** Valid values only. Missing or invalid keys are absent. */
  values: Env;
  missing: EnvIssue[];
  invalid: InvalidEnvIssue[];
  /** True when every core variable is present and valid. */
  coreReady: boolean;
};

type EnvSource = Record<string, string | undefined>;

const ENV_KEYS = Object.keys(ENV_VARS) as EnvKey[];

export function readEnv(source: EnvSource = process.env): EnvReport {
  const values: Env = {};
  const missing: EnvIssue[] = [];
  const invalid: InvalidEnvIssue[] = [];

  for (const key of ENV_KEYS) {
    const spec: VarSpec = ENV_VARS[key];
    const issue: EnvIssue = { key, feature: spec.feature, required: spec.required, help: spec.help };
    const raw = source[key]?.trim();

    if (!raw) {
      missing.push(issue);
      continue;
    }
    const parsed = spec.schema.safeParse(raw);
    if (parsed.success) {
      values[key] = parsed.data;
    } else {
      invalid.push({ ...issue, message: parsed.error.issues[0]?.message ?? "invalid value" });
    }
  }

  const coreReady = ![...missing, ...invalid].some((issue) => issue.required);
  return { values, missing, invalid, coreReady };
}

/** Current valid values from process.env. Read fresh each call; it is cheap and never throws. */
export function getEnv(): Env {
  return readEnv().values;
}

/** Whether every variable of a feature is present and valid. */
export function isFeatureReady(feature: Feature, report: EnvReport = readEnv()): boolean {
  return ENV_KEYS.filter((key) => ENV_VARS[key].feature === feature).every(
    (key) => report.values[key] !== undefined,
  );
}
