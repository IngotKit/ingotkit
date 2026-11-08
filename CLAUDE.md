# CLAUDE.md — IngotKit (AI SaaS starter for Hostinger Web apps)

> Name: IngotKit. GitHub org `IngotKit` (public repo `ingotkit`, private `ingotkit-pro`), domain ingotkit.com.

## How to work in this folder (read first, every session)
1. Read `PROGRESS.md` — it says which phase we're in and what's done.
2. Read the matching phase in `docs/PLAN.md` (section "Build plan").
3. Work in plan mode first: propose a plan, wait for approval, then build.
4. At the end of a task: run the Definition of Done (below), tick boxes in
   `PROGRESS.md`, add a line to `CHANGELOG.md`, and commit.
5. Never start the next phase until the current phase's gate is checked off.
Slash commands: `/next` picks up the next unchecked item; `/phase-1` … `/phase-6` start a phase.
If `.claude/commands/` is missing, copy `setup/claude-commands/*.md` into it first
(ask me before running the copy). Until then, follow `setup/claude-commands/next.md` by hand.

## What this repo is
An open-source (MIT) Next.js starter for launching paid AI apps. A buyer forks it,
clicks "Deploy on Hostinger", fills env vars, and has signup → payment → AI generation
working on flat-rate Hostinger Web apps hosting. Every decision serves that path.
It earns through Hostinger's open-source partner program (20% referral commission on
hosting bought through the README's Deploy on Hostinger button). Details: `docs/HOSTINGER.md`.

## Hard constraints (Hostinger Web apps)
- **MySQL only.** No Postgres, Redis or MongoDB. Use Drizzle ORM with `mysql2`.
  `DATABASE_URL` starts with `mysql://`.
- **No always-on process.** The app is stopped after a period without traffic.
  Never use in-process queues, `setInterval`, or long-running workers.
  Long AI jobs: insert a row in `jobs` → call the provider with a webhook URL →
  finish the job in `/api/webhooks/<provider>`. Scheduled work lives in
  `/api/cron/*` routes protected by `CRON_SECRET`, triggered by hPanel cron.
- **Node 22 or 24.** Pin `"engines"` in package.json. Start with `next start -p $PORT`.
- **No local file persistence.** Don't write user files to disk. Store media in
  S3-compatible storage (R2) when configured; otherwise keep the provider URL.
- **Must boot with missing config.** If required env vars are absent, the app renders
  `/setup` listing what's missing instead of crashing. Never throw at import time
  because of a missing key.

## Stack
Next.js 16 App Router · TypeScript strict · Tailwind v4 + shadcn/ui · Drizzle + MySQL 8 ·
Better Auth · Stripe (+ one merchant-of-record adapter: Polar or Lemon Squeezy) ·
Vercel AI SDK (Anthropic, OpenAI) · media adapter with Higgsfield as default
(fal/Replicate alternates) · Nodemailer SMTP (Resend optional) · Zod · Vitest · Playwright.
Better Auth / Polar / Lemon Squeezy details were not re-verified — confirm MySQL support
and country/payout support in Phase 1 and note findings in `PROGRESS.md`.

## Structure
```
src/
  app/                    # routes: (marketing), (app), admin, setup, api/
  config/site.config.ts   # name, copy, pricing, credit costs — the ONE file buyers edit first
  db/schema/*.ts          # Drizzle schema, one file per domain
  db/migrations/
  lib/env.ts              # Zod-validated env; exposes missing keys, never throws on import
  lib/auth/               # Better Auth setup
  lib/billing/            # BillingProvider interface + stripe.ts, mor.ts
  lib/credits/            # ledger: grant, reserve, commit, refund
  lib/ai/text/            # AI SDK wrappers
  lib/ai/media/           # MediaProvider interface + higgsfield.ts, fal.ts
  lib/jobs/               # create, complete, fail, poll
  tools/<tool-name>/      # each AI tool: config.ts, form.tsx, run.ts — self-contained
  tools/registry.ts
```

## Conventions
- Server actions or route handlers validate input with Zod; never trust the client.
- All money and credit changes go through `lib/credits`. Balance = SUM of ledger rows.
  Reserve before calling a provider; commit on success; refund on failure. Idempotent
  by `jobId` / webhook event id.
- Webhooks verify signatures and are idempotent (store processed event ids).
- Provider-specific code stays inside its adapter file. Nothing else imports a vendor SDK.
- A new AI tool = a new folder in `src/tools/` + one line in `tools/registry.ts`.
  No changes elsewhere should be needed. Keep this true.
- Secrets only in env. Update `.env.example` and `/setup` whenever you add a variable.
- Prefer small files, named exports, no default exports except Next.js pages.
- No new dependency without a one-line reason in the PR/commit message.
- Core code never imports from Pro or checks a license. Pro attaches only through
  `tools/registry.ts` and the provider interfaces; keep those stable and documented.

## Commands (created in Phase 1)
- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run db:generate` · `npm run db:migrate` · `npm run db:seed`
- `npm test` (Vitest) · `npm run e2e` (Playwright)
- Local MySQL: `docker compose -f docker/dev.yml up -d`

## Definition of done (every task)
1. `npm run typecheck`, `npm run lint`, `npm test` pass.
2. The signup → buy credits (Stripe test mode) → generate → see in gallery path still
   works (`npm run e2e`) — once that path exists.
3. `.env.example`, `/setup`, and docs updated if behaviour or config changed.
4. Nothing assumes Postgres, Redis, Vercel-only APIs, or an always-on process.
5. `PROGRESS.md` and `CHANGELOG.md` updated.

## Don'ts
- Don't add Vercel-specific features (Edge Config, KV, Blob, `@vercel/*` runtime APIs).
- Don't use Edge runtime for routes that touch the database.
- Don't store credit balance as a mutable column.
- Don't hardcode prices, model names or credit costs outside `site.config.ts` / tool configs.
- Don't commit real keys, even test ones.
- Don't touch `docs/` planning files except to tick progress or when asked.
