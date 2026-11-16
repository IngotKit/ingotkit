// Zod-validated environment. Never throws, at import time or later: it reports which keys
// are missing or invalid so the app can render /setup instead of crashing.
// When you add a variable: add it here and to .env.example. /setup reads this file.
import { z } from "zod";

export type Feature =
  | "core"
  | "email"
  | "google"
  | "github"
  | "polar"
  | "stripe"
  | "anthropic"
  | "openai"
  | "media"
  | "storage"
  | "jobs";

export const FEATURES: Record<Feature, { label: string; enables: string }> = {
  core: {
    label: "Core",
    enables: "Required. The app shows this setup page until these are set.",
  },
  email: {
    label: "Email (SMTP)",
    enables: "Email verification, sign-in links and password reset. Without it, only Google/GitHub sign-in works.",
  },
  google: { label: "Google sign-in", enables: 'The "Continue with Google" button.' },
  github: { label: "GitHub sign-in", enables: 'The "Continue with GitHub" button.' },
  polar: {
    label: "Payments: Polar",
    enables: "Credit packs and the monthly plan, with Polar as merchant of record (handles tax; pays out in many countries, including Pakistan).",
  },
  stripe: {
    label: "Payments: Stripe",
    enables: "Credit packs and the monthly plan through Stripe (for sellers in Stripe-supported countries).",
  },
  anthropic: { label: "Text AI: Anthropic", enables: "The AI chat tool, using Claude." },
  openai: { label: "Text AI: OpenAI", enables: "The AI chat tool, using OpenAI (if Anthropic isn't set up)." },
  media: {
    label: "Image and video AI",
    enables: "The image and image-to-video tools (Higgsfield). Results come back by webhook, or by checking while the page is open, or by the cron job.",
  },
  storage: {
    label: "Media storage (S3 / R2)",
    enables: "Keeps generated media permanently. Without it, provider URLs are stored and may expire.",
  },
  jobs: { label: "Background jobs (cron)", enables: "The /api/cron/* routes that hPanel cron calls." },
};

type VarSpec = {
  feature: Feature;
  /** Core vars block the app. The rest only switch their feature on or off. */
  required: boolean;
  /** Not needed for its feature to work (e.g. SMTP login on a server without auth). */
  optionalInFeature?: boolean;
  /** Safe to show on /setup (non-secret). Secrets are only ever reported as set/missing. */
  public?: boolean;
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
    help: "hPanel → Databases → MySQL. Locally: mysql://ingotkit:ingotkit@127.0.0.1:3306/ingotkit",
  },
  APP_URL: {
    feature: "core",
    required: true,
    public: true,
    schema: url,
    help: "Public URL of the app, e.g. https://yourdomain.com (http://localhost:3000 locally).",
  },
  BETTER_AUTH_SECRET: {
    feature: "core",
    required: true,
    schema: z.string().min(32, "must be at least 32 characters"),
    help: "Any random string of 32+ characters: run `openssl rand -base64 32`.",
  },

  SMTP_HOST: { feature: "email", required: false, public: true, schema: nonEmpty, help: "hPanel → Emails → your mailbox → connect apps (smtp.hostinger.com). Locally: 127.0.0.1 (Mailpit)." },
  SMTP_PORT: { feature: "email", required: false, public: true, schema: z.string().regex(/^\d+$/, "must be a port number"), help: "465 (SSL) or 587 (STARTTLS) on Hostinger. Locally: 1025 (Mailpit)." },
  SMTP_USER: { feature: "email", required: false, optionalInFeature: true, public: true, schema: nonEmpty, help: "The mailbox address. Leave empty for Mailpit." },
  SMTP_PASSWORD: { feature: "email", required: false, optionalInFeature: true, schema: nonEmpty, help: "The mailbox password. Leave empty for Mailpit." },
  EMAIL_FROM: { feature: "email", required: false, public: true, schema: nonEmpty, help: 'Sender, e.g. "IngotKit <hello@yourdomain.com>".' },

  GOOGLE_CLIENT_ID: { feature: "google", required: false, public: true, schema: nonEmpty, help: "Google Cloud Console → Google Auth Platform → Clients. Redirect URI: <APP_URL>/api/auth/callback/google" },
  GOOGLE_CLIENT_SECRET: { feature: "google", required: false, schema: nonEmpty, help: "Same OAuth client as GOOGLE_CLIENT_ID." },
  GITHUB_CLIENT_ID: { feature: "github", required: false, public: true, schema: nonEmpty, help: "GitHub → Settings → Developer settings → OAuth Apps. Callback URL: <APP_URL>/api/auth/callback/github" },
  GITHUB_CLIENT_SECRET: { feature: "github", required: false, schema: nonEmpty, help: "Same OAuth app as GITHUB_CLIENT_ID." },

  POLAR_ACCESS_TOKEN: { feature: "polar", required: false, schema: z.string().regex(/^polar_/, "must start with polar_"), help: "Polar → Settings → Developers → New token (sandbox.polar.sh for test mode). Scopes: products, checkouts, customer sessions." },
  POLAR_WEBHOOK_SECRET: { feature: "polar", required: false, schema: nonEmpty, help: "Polar → Settings → Webhooks → add endpoint <APP_URL>/api/webhooks/polar (format: Raw, API version 2026-10, event order.paid) → copy the secret." },
  POLAR_SERVER: { feature: "polar", required: false, optionalInFeature: true, public: true, schema: z.enum(["sandbox", "production"], "must be sandbox or production"), help: "sandbox (test payments, default) or production (real money). Tokens differ per environment." },

  STRIPE_SECRET_KEY: { feature: "stripe", required: false, schema: z.string().regex(/^sk_/, "must start with sk_"), help: "Stripe Dashboard → Developers → API keys." },
  STRIPE_WEBHOOK_SECRET: { feature: "stripe", required: false, schema: z.string().regex(/^whsec_/, "must start with whsec_"), help: "Stripe Dashboard → Developers → Webhooks → endpoint <APP_URL>/api/webhooks/stripe. Events: checkout.session.completed, invoice.paid." },

  ANTHROPIC_API_KEY: { feature: "anthropic", required: false, schema: nonEmpty, help: "console.anthropic.com → Settings → API keys." },
  OPENAI_API_KEY: { feature: "openai", required: false, schema: nonEmpty, help: "platform.openai.com → API keys." },

  HIGGSFIELD_API_KEY_ID: { feature: "media", required: false, schema: nonEmpty, help: "console.higgsfield.ai → API keys (the key ID)." },
  HIGGSFIELD_API_KEY_SECRET: { feature: "media", required: false, schema: nonEmpty, help: "console.higgsfield.ai → API keys (the key secret, shown once)." },
  HIGGSFIELD_WEBHOOK_SECRET: { feature: "media", required: false, optionalInFeature: true, schema: z.string().regex(/^whsec_/, "must start with whsec_"), help: "console.higgsfield.ai → Settings → webhook signing secret. Recommended: without it, webhooks are unsigned (the app still re-checks every result with Higgsfield)." },
  WEBHOOK_BASE_URL: { feature: "media", required: false, optionalInFeature: true, public: true, schema: z.url().regex(/^https:\/\//, "must start with https://"), help: "Only if APP_URL isn't reachable from the internet (local testing through a tunnel): the public https address providers send webhooks to. Defaults to APP_URL." },
  FAKE_MEDIA_PROVIDER: { feature: "media", required: false, optionalInFeature: true, public: true, schema: z.enum(["0", "1"], "must be 0 or 1"), help: "Automated tests only: 1 replaces Higgsfield with a fake that returns placeholder images for free. Never set it on a live site." },

  S3_ENDPOINT: { feature: "storage", required: false, public: true, schema: url, help: "Cloudflare R2 → bucket → S3 API endpoint." },
  S3_BUCKET: { feature: "storage", required: false, public: true, schema: nonEmpty, help: "Bucket name." },
  S3_ACCESS_KEY_ID: { feature: "storage", required: false, schema: nonEmpty, help: "R2 → Manage API tokens." },
  S3_SECRET_ACCESS_KEY: { feature: "storage", required: false, schema: nonEmpty, help: "R2 → Manage API tokens." },
  S3_PUBLIC_URL: { feature: "storage", required: false, public: true, schema: url, help: "Public bucket URL or custom domain." },

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

export const ENV_KEYS = Object.keys(ENV_VARS) as EnvKey[];

export function getVarSpec(key: EnvKey): VarSpec {
  return ENV_VARS[key];
}

export function readEnv(source: EnvSource = process.env): EnvReport {
  const values: Env = {};
  const missing: EnvIssue[] = [];
  const invalid: InvalidEnvIssue[] = [];

  for (const key of ENV_KEYS) {
    const spec = getVarSpec(key);
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

export function featureKeys(feature: Feature): EnvKey[] {
  return ENV_KEYS.filter((key) => getVarSpec(key).feature === feature);
}

/**
 * A feature is ready when every variable it needs is present and valid, and no optional
 * variable of it is set to an invalid value.
 */
export function isFeatureReady(feature: Feature, report: EnvReport = readEnv()): boolean {
  return featureKeys(feature).every((key) => {
    const spec = getVarSpec(key);
    if (report.values[key] !== undefined) return true;
    const isInvalid = report.invalid.some((issue) => issue.key === key);
    return spec.optionalInFeature === true && !isInvalid;
  });
}
