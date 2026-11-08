# PROGRESS — IngotKit

Claude Code: update this file at the end of every task. Tick boxes, add dated notes under
"Log". Never tick a gate unless you have actually verified it.

Target: v1 by 2027-01-03, public launch week of 2027-01-11. Budget ~15 h/week.

## Before Phase 1 (owner does these — see docs/SETUP-RUNBOOK.md)
- [ ] Accounts: Claude Pro/Max, GitHub org, Hostinger partner program
- [x] Tools: Git, Node 24 (`.node-version` is set), Docker, GitHub CLI, Claude Code
- [ ] Name checked (GitHub org, npm, domain, IPO Pakistan trademark search)
- [x] GitHub repo created from this folder and pushed

## Phase 1 — Scaffold (~1 day, week 1)
- [x] Next.js 16 + TS strict + Tailwind v4 + shadcn/ui
- [x] Drizzle + mysql2, `docker/dev.yml` with MySQL 8
- [x] Vitest + Playwright set up
- [x] `src/config/site.config.ts` and `src/lib/env.ts` (never throws on import)
- [x] GitHub Actions: typecheck, lint, test
- [x] Verify Better Auth MySQL support; Polar / Lemon Squeezy payouts to Pakistan (note below)
- [x] **Gate:** `npm run dev` shows a page; CI green on `main`

## Phase 2 — Setup page + auth (~2 days, weeks 1–2)
- [x] `/setup` lists missing env vars by feature, with where to get each
- [x] Middleware (Next 16 `proxy.ts`) redirects to `/setup` when core vars are missing
- [x] Better Auth: email/password + verification, magic link, Google, GitHub
- [x] Nodemailer SMTP adapter
- [x] Schema, migrations, e2e test for signup
- [x] **Gate:** fresh clone with no env shows `/setup`; with env, sign up + verify + log in work

## Payments check (by 2026-11-20)
- [ ] Decide which provider can onboard you and pay out in Pakistan (Stripe? Polar? Lemon Squeezy?)
- [ ] If Stripe can't onboard you: build the merchant-of-record adapter first in Phase 3

## Phase 3 — Billing + credits ledger (~3 days, weeks 2–4)
- [ ] `lib/credits`: append-only ledger — grant, reserve, commit, refund; idempotent
- [ ] Unit tests incl. concurrent reserves
- [ ] `lib/billing` BillingProvider interface + Stripe (and/or MoR) implementation
- [ ] Credit packs, monthly plan that refills credits, customer portal
- [ ] Signature-verified, idempotent webhook
- [ ] **Gate:** a test purchase adds credits; replaying the webhook adds none

## Phase 4 — AI tools + jobs (~4 days, weeks 4–6)
- [ ] `tools/registry.ts` + chat (streaming), text-to-image, image-to-video
- [ ] MediaProvider interface + Higgsfield implementation
- [ ] Jobs table, provider webhook, `/api/cron/poll-jobs` fallback (CRON_SECRET)
- [ ] **Gate:** chat, image and video work; a failed job refunds credits

## Phase 5 — App shell, admin, marketing (~3 days, weeks 6–8)
- [ ] Gallery (list, download, delete; optional R2)
- [ ] Admin: users, credit adjustments, failed jobs, revenue
- [ ] Landing + pricing pages from `site.config.ts`
- [ ] **Gate:** `npm run e2e` passes signup → buy → generate → gallery (Stripe test mode, mocked media)

## Phase 6 — Hostinger hardening (~2 days, week 8)
- [ ] Build/start commands, `engines`, `$PORT`, migration on deploy, hPanel cron
- [ ] `docs/deploy-hostinger.md` (10-minute guide) and `docs/add-a-tool.md`
- [ ] `.claude/commands/add-tool.md`
- [ ] README with Deploy on Hostinger button (partner code added after listing)
- [ ] **Gate:** someone else deploys a fresh fork on a Business plan in under 15 minutes

## Launch (weeks 9–10)
- [ ] Soft launch: 5–10 builders deploy; every blocker fixed
- [ ] Repo listed in the Hostinger partner dashboard; button updated with partner code
- [ ] CLA bot + branch ruleset live (runbook step 6)
- [ ] Public launch: Show HN, Product Hunt, Reddit, X, Higgsfield hero clip

## Targets by 2027-02-14 (goals, not forecasts)
500 stars · 50 deploys · 10 paying Hostinger users · 5 outside contributors with signed CLA

## Log
- 2026-11-08: Folder prepared; plan, brief and commands added. Nothing built yet.
- 2026-11-08: Slash commands copied into `.claude/commands/`.
- 2026-11-08: Tool check on this Mac. Present: Git 2.50.1, Docker 29.9.2 (daemon running),
  GitHub CLI 2.103.3 signed in as `cosmicmarkhor` (scopes repo, workflow, read:org, gist;
  no orgs yet). Missing: Node 24 (installed Node is v26.11.1 from the official pkg, no
  fnm/nvm), Homebrew, Claude Code CLI (`claude` not on PATH; desktop app in use). Folder
  is not a git repo yet; no GitHub remote.
- 2026-11-08: Name check (GitHub org/user, npm, .com/.dev via RDAP). `forgekit`: GitHub org
  taken (empty, 2018), npm taken (tuchk4/forgekit), forgekit.com and forgekit.dev taken,
  several small GitHub repos named ForgeKit. `brazekit`: all four free (one tiny personal
  repo of that name). `smeltkit`: npm and both domains free, GitHub org taken.
  `quenchkit`: GitHub, npm, .dev free; .com taken. IPO Pakistan search not done (owner).
- 2026-11-08: Better Auth: Drizzle adapter docs list `provider: "mysql"` with a
  `mysqlTable` schema example; MySQL string datetimes stored as UTC. Doc-level only; prove
  it in Phase 2 against MySQL 8.
- 2026-11-08: Payments (doc-level, confirm at signup): Polar's MoR supported-countries
  page lists Pakistan (payouts via Stripe Connect Express; payout bank must be in the
  business's country and currency, Wise/Payoneer may be rejected). Lemon Squeezy's page
  lists Pakistan for bank payouts, but only if Stripe pre-approves the merchant. Stripe
  direct does not list Pakistan as a supported merchant country. Leading option: Polar.
  Decision still owner's, due 2026-11-20.
- 2026-11-08: Installed fnm (no Homebrew, `--force-no-brew`) with `--use-on-cd`, Node
  v24.22.2 as default (verified in a fresh zsh), and Claude Code CLI 2.1.319. Ran
  `git init -b main` locally; nothing committed, no GitHub remote yet.
- 2026-11-08: Phase 1 scaffold built (Next.js 16.4.5, React 19.3, TS 5.9 strict, Tailwind 4.3,
  shadcn/ui base-nova, Drizzle 0.45 + mysql2, Zod 4, Vitest 5, Playwright 1.65). Verified:
  typecheck, lint, 9 unit tests pass; `next build` succeeds with an empty environment;
  `npm start` serves the page on `$PORT`; Playwright e2e passes against `next dev`;
  `docker/dev.yml` MySQL 8.4.13 healthy; `db:seed` connects, and exits with a clear message
  when DATABASE_URL is missing; `db:generate` and `db:migrate` run. `npm audit --omit=dev`
  clean. CI workflow written (`.github/workflows/ci.yml`, Node from `.node-version`) but not
  yet run on GitHub, so the CI item and the gate stay open until the repo exists.
- 2026-11-08: Name chosen: IngotKit. GitHub org `IngotKit` created by owner (I am admin);
  `ingotkit` was free on npm, .com and .dev; owner bought ingotkit.com. npm name not yet
  claimed; IPO Pakistan search for "IngotKit" still to do. Renamed ForgeKit to IngotKit in
  code, config and docs (folder name unchanged).
- 2026-11-08: Repos: public https://github.com/IngotKit/ingotkit (pushed by owner; Issues,
  Discussions, topics, homepage set) and private, empty IngotKit/ingotkit-pro. MIT LICENSE
  added. CI run 42450991232 green on `main` (typecheck, lint, test, build without env).
  Phase 1 gate verified: `npm run dev` page checked by Playwright, CI green on `main`.
  CI actions bumped to checkout@v7 / setup-node@v7 (Node 24 runtime) after a Node 20
  deprecation warning.
- 2026-11-08: npm: owner created npm org `ingotkit` (misspelled `ingokit` deleted) and
  published the placeholder from `setup/npm-placeholder/`. Registry lists `ingotkit` with
  maintainer `uzairmirza`; 0.0.1 is `latest` (live 10:09 UTC after npm's processing step). IPO Pakistan search still to do, so the "Name checked" box stays open.
- 2026-11-08: Hostinger open-source partners program is waitlist-only for now. Owner joined
  the waitlist with github.com/IngotKit/ingotkit (Hostinger's repo check passed after a
  GitHub web 504 glitch). Paid add-on question for Hostinger support still open.
- 2026-11-08: Trademark: IPO search is a paid form (TM 55, PKR 1,000 per class; TM 01 filing
  PKR 3,000 and TM 11 registration PKR 9,000 per class, per the IPO portal). Owner asked a
  trademark agent to run the INGOTKIT search (classes 9 and 42); result pending.
- 2026-11-08: GitHub OAuth app "IngotKit (local dev)" registered in the IngotKit org; client
  ID and secret are in `.env.local` (format checked). Google OAuth not set up yet.
- 2026-11-08: Phase 2 built on branch `phase-2-auth`: /setup (per-feature status, DB and
  migration check, secrets never shown), `src/proxy.ts` redirects, Better Auth 1.7.18 on
  MySQL via Drizzle (email/password with required verification, password reset, magic
  link, Google and GitHub when their keys exist, MySQL-backed rate limiting), Nodemailer
  SMTP adapter with console fallback in dev, Mailpit in docker/dev.yml, migration
  `0000_auth`. Verified locally: typecheck, lint, 26 unit tests, 8 Playwright tests on a
  production build (no-env server shows /setup and the auth API returns 503; sign-up then
  email confirmation then sign-out then sign-in; magic link; password reset; /setup hidden
  when configured). Not yet verified: Google and GitHub sign-in (manual, needs a real
  account), SMTP against a real Hostinger mailbox, CI run with the new services.
- Phase 6 note: Better Auth reads the client IP from `X-Forwarded-For` and only trusts a
  single value. If Hostinger's proxy sends a chain, rate limiting falls back to one shared
  bucket per path; set `advanced.ipAddress.trustedProxies` after checking Hostinger's headers.
- 2026-11-08: PR #1 CI failed: a build made with no settings prerendered /dashboard with
  "signed out" baked in (getSession checked env before reading the request). Fixed by
  reading headers first; `npm run e2e` now builds with blank settings like CI.
- 2026-11-08: Phase 2 gate verified. CI green on PR #1 (no-env server shows /setup; sign up,
  email verification, sign out, sign in; magic link; password reset). Owner signed in with
  GitHub locally (port 3001, since port 3000 is used by another project); the database has
  the GitHub-linked account with a verified email. The "Better Auth" item stays open until
  Google sign-in is checked (Google OAuth keys not set up yet).
- 2026-11-08: Google sign-in verified by the owner locally (Google Cloud project "IngotKit
  Dev", consent screen in Testing with the owner as test user). Google and GitHub are linked
  to the same user by verified email, as configured. All Phase 2 items are done.
