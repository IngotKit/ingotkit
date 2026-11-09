// Better Auth on MySQL (Drizzle). Created on first use, never at import time, so a missing
// DATABASE_URL or BETTER_AUTH_SECRET renders /setup instead of crashing the app.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";

import { siteConfig } from "@/config/site.config";
import { getDb, type Db } from "@/db/client";
import * as schema from "@/db/schema";
import { grant } from "@/lib/credits";
import { getEmailSender, sendEmail } from "@/lib/email";
import { magicLinkTemplate, resetPasswordTemplate, verifyEmailTemplate } from "@/lib/email/templates";
import { isFeatureReady, readEnv, type Env } from "@/lib/env";

export type AuthOptions = {
  db: Db;
  env: Env;
  /** Email delivery works (SMTP configured, or console fallback in development). */
  emailEnabled: boolean;
  google: boolean;
  github: boolean;
};

export function createAuth({ db, env, emailEnabled, google, github }: AuthOptions) {
  return betterAuth({
    appName: "IngotKit",
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.APP_URL ? [env.APP_URL] : [],
    database: drizzleAdapter(db, { provider: "mysql", schema }),

    emailAndPassword: {
      // Without email we cannot verify addresses, so password sign-up is off.
      enabled: emailEnabled,
      requireEmailVerification: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...resetPasswordTemplate(url) });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...verifyEmailTemplate(url) });
      },
    },

    socialProviders: {
      ...(google && {
        google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! },
      }),
      ...(github && {
        github: { clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET! },
      }),
    },
    account: {
      // Signing in with Google/GitHub using an already verified email links to that account.
      accountLinking: { enabled: true, trustedProviders: ["google", "github"] },
    },

    databaseHooks: {
      user: {
        create: {
          // Free starting credits from site.config.ts, granted once per user.
          after: async (createdUser) => {
            if (siteConfig.signupCredits > 0) {
              await grant(db, {
                userId: createdUser.id,
                amount: siteConfig.signupCredits,
                kind: "signup",
                idempotencyKey: `signup:${createdUser.id}`,
              });
            }
          },
        },
      },
    },

    // No Redis on Hostinger: rate-limit counters live in MySQL.
    rateLimit: { enabled: true, storage: "database" },

    plugins: [
      magicLink({
        expiresIn: 5 * 60,
        disableSignUp: !emailEnabled,
        sendMagicLink: async ({ email, url }) => {
          await sendEmail({ to: email, ...magicLinkTemplate(url) });
        },
      }),
      // Must stay last: lets server actions set auth cookies.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { ingotkitAuth?: Auth };

/** The auth instance, or null while core settings are missing (the app shows /setup). */
export function getAuth(): Auth | null {
  if (globalForAuth.ingotkitAuth) return globalForAuth.ingotkitAuth;

  const report = readEnv();
  if (!report.coreReady) return null;

  const auth = createAuth({
    db: getDb(),
    env: report.values,
    emailEnabled: getEmailSender() !== null,
    google: isFeatureReady("google", report),
    github: isFeatureReady("github", report),
  });
  globalForAuth.ingotkitAuth = auth;
  return auth;
}

/** Which sign-in methods the UI should offer. Cheap; reads env only. */
export function getSignInMethods() {
  const report = readEnv();
  const email = getEmailSender() !== null;
  return {
    password: email,
    magicLink: email,
    google: isFeatureReady("google", report),
    github: isFeatureReady("github", report),
  };
}
