# Billet master playbook

The long-range guide to building, improving and growing **Billet**, for the owner and for the
AI models (Claude Opus 5.5 or newer) that do most of the work.

- Written 2026-11-16. Status facts are dated; re-check anything older than a month.
- Authority, highest first: the owner's instructions in chat → `CLAUDE.md` → `docs/PLAN.md` →
  this playbook. When this file disagrees with those, they win; fix this file.
- `PROGRESS.md` is the source of truth for what is done. This playbook says what comes next and how
  to do it well.

---

## Contents
1. [What Billet is](#1-what-billet-is)
2. [Where things stand (2026-11-16)](#2-where-things-stand-2026-11-16)
3. [Non-negotiables](#3-non-negotiables)
4. [Architecture map](#4-architecture-map)
5. [How a model works on Billet](#5-how-a-model-works-on-billet)
6. [Roadmap: v1, v1.x, v2 (Pro), later](#6-roadmap)
7. [Feature briefs, ready to hand to a model](#7-feature-briefs)
8. [Improvement tracks](#8-improvement-tracks)
9. [Design](#9-design)
10. [Automations](#10-automations)
11. [Launch, growth and community](#11-launch-growth-and-community)
12. [Risks and how to handle them](#12-risks)
13. [Decision log](#13-decision-log)
14. [Owner-only work](#14-owner-only-work)
15. [Prompt templates](#15-prompt-templates)
16. [Glossary](#16-glossary)
17. [Keeping this playbook current](#17-keeping-this-playbook-current)

---

## 1. What Billet is

**One line:** an open-source (MIT) Next.js starter that lets a solo builder launch a paid AI app on
flat-rate Hostinger hosting in a weekend: sign-up, credits, payments and AI image/video generation
already working.

### Names (read this before writing any copy)
| Name | What it is |
| --- | --- |
| **Billet** | The product: this starter kit. Use it in user-facing copy, the README title and launch posts. |
| **IngotKit** | The parent brand and company (ingotkit.com, GitHub org `IngotKit`). Billet's siblings: Assay (profit calculator), Assay Lite (free), Journeyline (WordPress plugin, coming). |
| `ingotkit` | The current repo (`IngotKit/ingotkit`), npm package and code identifiers (`package.json` name, `ingotkit_` Stripe lookup keys, `ingotkit_item` Polar metadata). |
| ForgeKit | The original working name. It survives only in the local folder name (`01-ForgeKit-Hostinger`). Never use it in anything public. |

The code and docs still say "IngotKit" where they mean the starter. Renaming them to Billet is an
open owner decision (see [13](#13-decision-log), D-14). Until it's decided, don't rename code
identifiers; product-facing copy written from now on may say Billet.

### Who it is for
Indie hackers, "vibe coders" using Claude Code or Cursor, and freelancers building AI tools for
clients. They want to charge money for an AI app this weekend, on cheap hosting they already
understand, without stitching together auth, billing and job queues themselves.

### Why it wins (the wedge)
Most AI SaaS starters assume Vercel plus Postgres/Supabase plus Redis. Hostinger's Web apps plans
give you Node.js and **MySQL only**, and they **stop the app when idle**. Billet is built for exactly
that: MySQL everywhere, no always-on process, and webhooks plus cron for anything slow. Nobody
else targets this.

### How it earns
1. **Hostinger open-source partner program:** the README's "Deploy on Hostinger" button carries a
   partner code; 20% of the hosting each referred user buys. (Status: on the waitlist.)
2. **Billet Pro** (later, not before mid-February 2027): a paid add-on for people already making
   money. See `docs/PRO-ROADMAP.md`.
3. **Halo for the IngotKit family:** Billet sends developers to ingotkit.com, where Assay is sold.

### What success looks like
| Horizon | Target |
| --- | --- |
| v1 done | 2027-01-03 (all six phase gates ticked) |
| Public launch | week of 2027-01-11 |
| 90 days after launch | 1,000+ GitHub stars, partner listing approved, steady tracked deploys |
| Pro decision | mid-February 2027, only if the free kit has steady deploys |

Weekly numbers to watch after launch: stars, forks, tracked deploys (partner dashboard), issues
opened and closed, and first payments taken by Billet-based apps (ask in the showcase).

---

## 2. Where things stand (2026-11-16)

### Done and merged to `main`
- **Phase 1, scaffold:** Next.js 16.4.5 (App Router, Cache Components, `proxy.ts`), TypeScript
  strict, Tailwind v4 + shadcn/ui (base-nova), Drizzle 0.45 + mysql2 on MySQL 8.4, Vitest 5,
  Playwright 1.65, GitHub Actions CI.
- **Phase 2, setup page + auth:** `/setup` lists missing settings by feature; Better Auth 1.7
  (email/password with verification, magic link, Google, GitHub); SMTP email; a build made with
  no env works.
- **Phase 3, billing + credits:** append-only credits ledger; Polar (default, merchant of record)
  and Stripe behind one `BillingProvider`; signed, idempotent webhooks; `npm run billing:sync`;
  `/billing`. **Verified with real Polar sandbox payments** (pack +100, plan +800, portal works,
  redelivered webhook added nothing).

### Built, in review
- **Phase 4, AI tools + jobs:** [PR #3](https://github.com/IngotKit/ingotkit/pull/3), branch
  `phase-4-ai-tools`, CI green, Auto-fix on. Tools registry with chat (AI SDK 7, Anthropic default),
  image (Higgsfield Z-Image Turbo) and image-to-video (Higgsfield Wan 2.6); `job` table; jobs finish
  by webhook, open-page checks or cron; failed jobs refund. Tested with a fake provider.
  **Gate still open:** needs a real Anthropic key, a real Higgsfield key with a small top-up, a real
  Higgsfield webhook, and a price check of `creditCosts` against Higgsfield's prices.

### Not started
- Phase 5 (gallery + R2, admin, landing/pricing pages, full money-path e2e).
- Phase 6 (Hostinger hardening, deploy guide, add-a-tool command, listing).

### Waiting on people outside the repo
| Item | Waiting on | Last known |
| --- | --- | --- |
| Polar approval for AI image/video use case | Polar's human review | Requested 2026-11-08; Lemon Squeezy is the fallback |
| Pakistan trademark search (IPO TM-55) | Trademark agent | Requested; result pending |
| Partner listing, and whether a paid Pro add-on is allowed beside a listed project | Hostinger | On the waitlist; question open |

Check these before any work that depends on them, and log answers in `PROGRESS.md`.

---

## 3. Non-negotiables

These come from `CLAUDE.md` and from lessons already paid for. Breaking one is a bug, even if
tests pass.

### Hosting (Hostinger Web apps)
- **MySQL only.** Drizzle with mysql2. No Postgres, Redis, MongoDB, SQLite or Vercel KV.
- **No always-on process.** No in-process queues, `setInterval`, long-lived workers or "fire and
  forget" promises that outlive the request. Slow work = row in `job` + provider webhook +
  `/api/cron/*` fallback.
- **No local file persistence.** Uploads go straight to the provider or to S3-compatible storage
  (R2). Nothing is written to the app's disk.
- **Node 22 or 24**, `next start -p $PORT`, Node runtime (never Edge for routes that touch the DB).
- **Boots with nothing configured.** Missing env never crashes; the app shows `/setup`. Read env at
  request time. In Server Components, touch request data (`await headers()`, `await connection()`)
  **before** reading env or calling `getSession`, or `next build` bakes in the unconfigured state.
  (This bit us once: see D-08.)

### Money
- Every credit change goes through `src/lib/credits`. Balance = `SUM(amount)`. Never a balance
  column.
- Reserve before calling a provider; commit on success; refund on failure. One idempotency key per
  real-world event (`reserve:<jobId>`, `settle:<jobId>`, `polar:order:<id>`, `signup:<userId>`).
- Credits come from **signed webhooks only**, never from a "thank you" page or the client.
- Webhooks verify signatures on the raw body and are idempotent (`webhook_event` unique key).
- Each job settles **exactly once** (conditional `UPDATE ... WHERE status IN ('queued','running')`
  plus the ledger write in one transaction).

### Code
- Validate every input with Zod on the server. Never trust the client.
- Vendor SDKs only inside their adapter (`src/lib/billing/*.ts`, `src/lib/ai/media/*.ts`,
  `src/lib/ai/text/index.ts`). Nothing else imports a vendor.
- A new AI tool = a new folder in `src/tools/` + one line in `src/tools/registry.ts`. Keep this true.
- Prices, packs, credit costs, model ids: only in `src/config/site.config.ts` or a tool's
  `config.ts`.
- Secrets only in env. Every new variable: `src/lib/env.ts` + `.env.example` + `/setup` (automatic
  from `env.ts`) + docs.
- Small files, named exports; default exports only for Next.js pages and layouts.
- New dependency = one-line reason in the commit message.
- Core never imports Pro and never checks a license.

### Writing (all output: code, comments, docs, UI copy, commits, chat)
- **Never use the em dash.** Use a colon, comma, period or parentheses. No spaced en dash or
  double hyphen as a stand-in either. (Owner's global rule.)
- Plain words. UI errors say what happened and what to do next, never a stack trace or vendor
  jargon ("The generator is busy right now. Please try again in a minute.").
- Pronouns: they/them for anyone whose pronouns aren't stated.

### Process
- Don't start a phase until the previous gate is ticked. Don't tick a gate you haven't verified.
- Don't touch `docs/PLAN.md` or other planning files except to tick progress or when asked.
- Commit or push only when the owner asks (approving a phase build counts as asking for that
  phase's commit and PR).
- Don't commit real keys, even test ones. `.env.local` stays local.

---

## 4. Architecture map

### Folder guide
```
src/
  app/
    (auth)/                 sign-in, sign-up, verify, reset
    setup/                  first-run checklist (hidden on configured production sites)
    dashboard/              balance + tool cards
    billing/                packs, plan, portal, success page
    tools/[toolId]/         one page renders any tool from the registry
    api/auth/[...all]/      Better Auth
    api/webhooks/[provider] Polar / Stripe payments
    api/webhooks/higgsfield media job completion (re-checks the result itself)
    api/tools/[toolId]/     run a tool (chat streams; media returns a job)
    api/jobs/               list a user's jobs; checks unfinished ones (10 s throttle)
    api/cron/poll-jobs/     hPanel cron fallback (Bearer CRON_SECRET)
  config/site.config.ts     THE file buyers edit first
  db/schema/*.ts            auth, credits, billing, jobs (one file per domain)
  db/migrations/            generated by drizzle-kit, committed
  lib/env.ts                Zod env registry; never throws; drives /setup
  lib/routing.ts            pure redirect rules used by proxy.ts
  lib/auth/                 Better Auth server/client/session
  lib/credits/              the ledger (the only thing that changes credits)
  lib/billing/              BillingProvider + polar.ts + stripe.ts + webhooks.ts
  lib/ai/text/              AI SDK provider picker
  lib/ai/media/             MediaProvider + higgsfield.ts + fake.ts
  lib/jobs/                 start, settle once, refresh, poll; view.ts for the browser
  lib/webhooks/standard.ts  Standard Webhooks signature check
  tools/<id>/               config.ts, form.tsx, run.ts, index.ts per tool
  tools/registry.ts         the list of tools
  proxy.ts                  /setup and sign-in redirects (Next 16 replacement for middleware)
tests/unit | integration (real MySQL) | e2e (Playwright, production build)
```

### Extension points (keep these stable; Pro and buyers build on them)
| Interface | File | Implementations | Contract |
| --- | --- | --- | --- |
| `Tool` (chat or media) | `src/tools/types.ts` | chat, image, image-to-video | Chat: `run()` must start a chat job before streaming. Media: `prepare()` validates the form and returns `{ input, params }`; throws `ToolInputError` for user mistakes. |
| `MediaProvider` | `src/lib/ai/media/types.ts` | higgsfield, fake | `submit`, `getStatus`, `verifyWebhook` (returns only the request id; callers re-fetch status), `uploadInput`. Errors: `MediaProviderError` with a user-safe message. |
| `BillingProvider` | `src/lib/billing/types.ts` | polar, stripe | `createCheckout`, `createPortalUrl`, `parseWebhook` (returns a `VerifiedWebhook`), `syncProducts`. |
| Text model | `src/lib/ai/text/index.ts` | Anthropic, OpenAI | `getTextModel(models)` returns an AI SDK `LanguageModel`. |
| Env registry | `src/lib/env.ts` | n/a | Each var: feature, required, schema, help text. `/setup` renders from it. |

When changing one of these, treat it like a public API: update every implementation, the docs, and
note it in `CHANGELOG.md` as a breaking change if a buyer's own adapter would break.

### Data model (MySQL)
- Auth tables (generated by Better Auth CLI: `npm run auth:schema`; never hand-edit).
- `credit_ledger`: append-only; unique `idempotency_key`; `job_id` links holds and settlements.
- `webhook_event`: unique `(provider, event_id)`; outcome text for debugging.
- `billing_customer`: provider customer id per user (Stripe portal needs it).
- `job`: one row per generation; status `queued → running → succeeded | failed`; unique
  `provider_request_id`; `output` JSON; `output_expires_at`; `last_checked_at` (throttle).

### A media job, end to end
1. `POST /api/tools/image` → session check → early balance check → `prepare()` → `startMediaJob`.
2. `startMediaJob`: concurrency limit → `reserve` (locks the user row) → insert job → `submit` with
   `hf_webhook` (only when the public URL is https) → `running`. Submit failure → settle failed →
   refund at once.
3. Completion, whichever is first: Higgsfield webhook → `refreshJob`; the open page polling
   `/api/jobs` → `refreshJob` (max every 10 s per job); hPanel cron → `pollActiveJobs` (also fails
   anything older than `jobs.timeoutMinutes`).
4. `settleJob`: conditional update + `commit` or `refund` in one transaction. Late arrivals no-op.

### Configuration knobs a buyer touches
`site.config.ts`: name, copy, currency, `billing.provider`, `signupCredits`, `creditPacks`, `plans`,
`creditCosts`, `ai.textProvider`, `jobs.maxActivePerUser`, `jobs.timeoutMinutes`. Tool models live in
each tool's `config.ts`. Everything secret is env.

---

## 5. How a model works on Billet

### Start of every session
1. Read `CLAUDE.md`, `PROGRESS.md`, then the relevant phase of `docs/PLAN.md` and the relevant
   section of this playbook.
2. `git status`, current branch, open PRs (`gh pr list`). Don't build on a stale branch; if a phase
   PR is open, new phase work branches from it or waits for the merge (ask).
3. Check the shared notes folder if one is named in the task; sibling sessions leave hand-overs
   there (brand, site, other products).
4. Read `AGENTS.md`: Next.js 16 differs from training data. Read the bundled docs in
   `node_modules/next/dist/docs/` before using an API you're unsure of.

### Plan first, then build
- Phase work and anything over ~1 hour: propose a plan (what you'll build, what you won't, what the
  owner must do, open questions with a recommendation), wait for approval, then build.
- Small fixes, docs edits and investigations: just do them, then report.
- Recommend; don't survey. Give one recommended option and the reason, plus the realistic
  alternative if there is one.

### Verification ladder (climb as high as the change needs)
| Rung | Command | When |
| --- | --- | --- |
| Types and lint | `npm run typecheck && npm run lint` | Every change |
| Unit | `npm test` (unit project) | Logic, adapters (fake `fetch`), validation |
| Integration | `npm test` (integration project, real MySQL) | Anything touching the ledger, jobs, webhooks |
| E2E | `npm run e2e` (production build, both servers) | Pages, routes, flows; anything Cache Components could prerender wrongly |
| Real sandbox | Owner keys, tunnel, real provider | Phase gates; any change to a provider adapter |

Docker services must be up for integration and e2e: `docker compose -f docker/dev.yml up -d`.
Port 3000 on the owner's Mac is taken by another project; run manual tests on 3001 with
`APP_URL=http://localhost:3001`.

### Definition of done (from `CLAUDE.md`, plus what we learned)
1. Typecheck, lint, tests pass. E2E passes if pages or routes changed.
2. The money path still works (`npm run e2e` once Phase 5 adds it).
3. `.env.example`, `env.ts` help text, `/setup`, docs updated if config or behavior changed.
4. Nothing assumes Postgres, Redis, Vercel-only APIs or an always-on process.
5. `PROGRESS.md` (dated log entry saying what was verified and what wasn't) and `CHANGELOG.md`.
6. No em dashes in anything you wrote (search your changed files for the character U+2014).
7. `npm audit --omit=dev` shows nothing new (4 moderate drizzle-kit advisories are known and accepted).

### Vendor APIs drift: verify, don't remember
Billet depends on fast-moving APIs. Before writing adapter code, read the current docs or the
installed package's type definitions:
- Next.js 16: `node_modules/next/dist/docs/`.
- AI SDK 7: `node_modules/ai/dist/index.d.ts`, `@ai-sdk/*` model id unions.
- Polar: `@polar-sh/sdk` types; API version 2026-10 (webhooks: format Raw, API version 2026-10).
- Higgsfield: https://docs.higgsfield.ai (start at `/docs/llms.txt`). Plain HTTP, `hf_webhook`
  query param, Standard Webhooks signing, results expire after about 7 days.
- Claude models: load the `claude-api` skill; never guess model ids.
If docs and code disagree, trust the installed package's types, then say what you found.

### Commits, branches and PRs
- Branch per phase or feature: `phase-5-gallery-admin`, `feat/r2-storage`, `fix/...`, `docs/...`.
- Commit message: imperative subject, a short "why" body, a reason line for each new dependency, and
  the attribution trailer the session provides.
- PR body: what it adds, what was verified (with numbers), what was **not** verified. Squash-merge
  (repo setting: auto-merge is off; merge when the owner says so and CI is green on the head
  commit).
- After opening a PR, bind it and offer Auto-fix.

### When to split work
- Use a subagent for wide reading (vendor docs, a sweep of the codebase) whose result you need now.
- Propose a separate session for real work that lands on its own (another repo, a separate PR, the
  ingotkit.com site, brand assets). Billet's siblings live in other folders: `05-IngotKit-Site`
  (marketing site), `brand/` (design tokens and logos), `04-48h-Product` (Assay).

### Effort and model notes (Opus 5.5 and newer)
- Opus 5.5 always thinks; effort is the dial. Use high effort for architecture, money-path code,
  security review and phase plans; medium for routine features; low for mechanical edits and doc
  tidy-ups.
- Long tasks: state the plan as a task list, keep one step in progress, verify each step before the
  next. Write tests alongside the code, not at the end.
- Be explicit about what you could not verify. "Tested with the fake provider; not yet with real
  Higgsfield" is a good sentence.

### Stop and ask the owner when
- Money moves for real, an account or key is needed, something gets published (npm, GitHub release,
  listing, social post), a repo is created or renamed, or a third-party ToS is accepted.
- A non-negotiable would have to bend.
- A vendor's policy question decides the product (for example: payment provider AI rules).

---

## 6. Roadmap

### v1 (now to 2027-01-03)

**Phase 4 gate (this week).** Owner adds `ANTHROPIC_API_KEY`, Higgsfield keys + small top-up,
`HIGGSFIELD_WEBHOOK_SECRET`. Model then runs: a real chat message (charge 1, see streaming), real
image (charge 5), real video from that image (charge 25), one forced failure (refund), a real
webhook through a Cloudflare quick tunnel (`WEBHOOK_BASE_URL`), and the cron route by curl. Compare
Higgsfield prices to `creditCosts` and recommend new costs if margin is under ~50%. Decide the chat
default model (Opus 5.5 is the default now; Haiku 5.5 costs ~1/40 per token). Tick, merge PR #3.

**Phase 5: app shell, admin, marketing (~3 days).** Gate: `npm run e2e` passes signup → buy →
generate → gallery. See briefs F-01 to F-05.
- Gallery: list, view, download, delete; filter by tool; R2 copy when configured.
- Admin: users, balances, credit adjustments (ledger `adjustment` rows with a note and the admin's
  id), failed jobs, revenue summary from `webhook_event`/ledger. Admin access by an env allowlist.
- Landing and pricing pages for the buyer's product, driven by `site.config.ts`.
- Full money-path e2e with Polar signed test webhooks and the fake media provider.

**Phase 6: Hostinger hardening (~2 days).** Gate: someone else deploys a fresh fork on a Business
plan in under 15 minutes using only the README. See F-06 to F-08.
- Confirm build/start commands, `engines`, `$PORT`; a migration step that runs on deploy; hPanel
  cron set-up; proxy/IP headers for Better Auth rate limits (`trustedProxies`).
- `docs/deploy-hostinger.md` (numbered, 10 minutes), `docs/add-a-tool.md`,
  `.claude/commands/add-tool.md`.
- README rewrite as Billet with the Deploy button (after the listing is approved), demo GIF/video,
  recommended plan (Business), the honest referral-link line.

**Launch prep (2027-01-04 to 01-10).** Soft launch with 5 to 10 builders, fix what they hit, record
the 20-second hero clip, prepare posts. See [11](#11-launch-growth-and-community).

### v1.x (January to February 2027): make it loved
Driven by early-adopter issues first. Candidate list, roughly in value order:
1. Chat history saved per user (F-09).
2. More example tools: background remover, upscaler, text-to-speech, "product photo" (F-10).
3. MySQL-backed rate limiting for tool routes (F-11).
4. Media adapters: fal and Replicate behind `MediaProvider` (F-12).
5. Lemon Squeezy billing adapter (F-13), the Polar fallback.
6. Email: welcome, low-balance and job-finished emails via the SMTP adapter (F-14).
7. `npx create-billet` (or a GitHub template + setup script) that writes `.env.local` and runs
   migrations (F-15).
8. Observability: structured logs, an `/api/health` route, error reporting hook (F-16).
9. i18n-ready copy (all UI strings through one module) without shipping translations (F-17).
10. Docs site (static, from `docs/`) on ingotkit.com/billet or GitHub Pages (F-18).

### v2: Billet Pro (decide mid-February 2027; build only with steady free deploys)
From `docs/PRO-ROADMAP.md`. Lives in private repo `IngotKit/ingotkit-pro`, attaches only through
the registry and provider interfaces.
| Area | Pro features |
| --- | --- |
| Accounts | Teams, seats, roles, org billing |
| Billing | Usage metering, coupons, end-user API keys |
| AI tools | UGC ad maker, headshot generator, logo maker |
| Growth | Affiliate system, email sequences |
| Agencies | White-label, multi-client |
| Hosting | VPS bundle with workers/queues (`docker-compose.yml`) |
| Support | Priority support, private Discord |
Rule: if a solo builder needs it to take their first payment, it stays free.
Before Pro: CLA bot on the public repo, trademark answer, Hostinger's answer on paid add-ons, Polar
(or Lemon Squeezy) set up to grant private-repo access to buyers.

### Later ideas (park here; score before building)
Score = (reach × value) ÷ effort, each 1 to 5. Build only scores ≥ 4 unless the owner says so.
| Idea | Notes |
| --- | --- |
| Supabase Postgres option | Pro or community; breaks "MySQL only" only for the VPS bundle |
| Agent tool (Claude with tools, multi-step) | Needs job model for long runs; good Pro showcase |
| Batch generation (n images per job) | Ledger already supports reserve-then-partial-commit |
| Credits expiry / plan-only credits | Some buyers want it; keep carry-over the default |
| Public share links for outputs | Needs R2 and signed URLs |
| Webhooks out (buyer's app notifies their users' systems) | Pro |
| Mobile-friendly PWA shell | Cheap win if asked for |
| Template marketplace of tools | Only with a community |

---

## 7. Feature briefs

Each brief is ready to paste into a fresh session (after "Read CLAUDE.md, PROGRESS.md and
docs/PLAYBOOK.md section 7, brief F-xx"). All briefs inherit the non-negotiables and the
definition of done.

**F-01 Gallery (Phase 5).** `/gallery`: the user's succeeded jobs across tools, newest first,
paginated (cursor on `created_at,id`). Filter by tool. View, download (server route that streams
from the stored URL with `Content-Disposition`), delete (soft delete column `deleted_at`; no credit
change). Show "expires on" for provider URLs. Accept: e2e generates an image and sees it in the
gallery; delete hides it; another user can't see or delete it (integration test).

**F-02 R2 storage (Phase 5).** When the `storage` feature is ready, copy each finished output to R2
inside `settleJob`'s caller (not inside the transaction): stream from provider URL to R2 with a
size cap; store the R2 key and public URL; keep the provider URL as fallback. Use the AWS SDK v3 S3
client only inside `src/lib/storage/s3.ts`. Cron also back-fills outputs that failed to copy.
Accept: unit test with a fake S3; manual test with a real R2 bucket; nothing written to disk.

**F-03 Admin area (Phase 5).** `/admin`, allowed for emails in `ADMIN_EMAILS` (env, comma list).
Users table (email, created, balance, jobs count), user detail (ledger rows, jobs), credit
adjustment form (positive or negative, required note, idempotency key from a form nonce), failed
jobs list with error text, revenue (sum of granted purchase/subscription credits by month and
`webhook_event` counts). Accept: non-admin gets 404; adjustment shows in the ledger with the
admin's id in `reference`; e2e covers one adjustment.

**F-04 Landing and pricing pages (Phase 5).** Buyer-facing marketing for the app built on Billet,
not for Billet itself. Hero, features (from the tool registry), pricing (from packs and plans),
FAQ, footer; all copy from `site.config.ts`. Fast (static where possible under Cache Components),
accessible, dark mode. Accept: changing `site.config.ts` changes the pages with no other edits;
Lighthouse ≥ 95 for performance and accessibility.

**F-05 Money-path e2e (Phase 5 gate).** One Playwright test: sign up → verify email (Mailpit) →
buy a pack (signed Polar test webhook) → generate an image (fake provider) → see it in the gallery
→ balance is right at every step. Runs in CI.

**F-06 Deploy on Hostinger (Phase 6).** Walk the real flow on a Business plan: import from GitHub,
build command, start command (`npm run start`, which uses `$PORT`), env vars, MySQL database
creation, running migrations on deploy (a `postbuild` or `prestart` script that runs
`drizzle-kit migrate` guarded by an env flag, or a documented one-time command; pick the one
Hostinger supports and test it), cron entry, domain + SSL. Write `docs/deploy-hostinger.md` from
what actually worked, with screenshots described in words. Accept: a second person follows it in
under 15 minutes.

**F-07 Proxy and IP handling (Phase 6).** Confirm what headers Hostinger's proxy sends; configure
Better Auth `trustedProxies`/IP header so rate limits key on the real client IP. Add a unit test for
the chosen header logic.

**F-08 `add-tool` command (Phase 6).** `.claude/commands/add-tool.md`: given a description,
creates `src/tools/<id>/` from the closest existing tool, registers it, adds a unit test for its
`prepare()`/input validation, updates `docs/ai-tools.md`'s tool list. Accept: running it for
"background remover using Higgsfield model X" produces a working tool with tests passing.

**F-09 Saved chat history.** `conversation` and `message` tables; list of conversations in a
sidebar; resume; delete. Server stores what the model saw (bounded by `maxHistory`). Chat job
input links to the conversation. Accept: reload keeps history; another user can't read it.

**F-10 More example tools.** Each as its own PR via F-08. Candidates: background remover,
upscaler, text-to-speech, product photo. Check each model's price first; set credits so margin ≥
50%.

**F-11 Rate limiting on MySQL.** `rate_limit_bucket` table keyed by `(scope, key, window_start)`;
fixed-window counter with `INSERT ... ON DUPLICATE KEY UPDATE`. Apply to `/api/tools/*` and
`/api/jobs`. Limits in `site.config.ts`. Accept: integration test with concurrent requests.

**F-12 fal and Replicate adapters.** Implement `MediaProvider` for each, with webhook verification
per their docs (verify current docs first). Provider choice per tool in its config. Accept: unit
tests with fake fetch; one real generation each with owner keys.

**F-13 Lemon Squeezy billing adapter.** Implement `BillingProvider`; `billing:sync` support; signed
webhook; portal URL. Accept: unit tests; real test-mode purchase with owner's account.

**F-14 Transactional emails.** Welcome (after verify), low balance (once per drop below a
threshold), video ready (jobs over 1 minute). Templates beside the auth templates; opt-out
setting on the user. No email inside `settleJob`'s transaction.

**F-15 One-command setup.** A script (`npm run setup` or `npx create-billet`) that checks Node and
Docker, writes `.env.local` with a generated `BETTER_AUTH_SECRET` and `CRON_SECRET`, starts Docker
services, runs migrations, and prints the next step. Never asks for or stores real API keys in the
terminal history.

**F-16 Observability.** `/api/health` (DB reachable, migrations current, which features are ready;
no secrets). A tiny `log()` helper with JSON output and request ids. Optional error-reporting hook
(Sentry DSN env) behind an adapter.

**F-17 i18n-ready copy.** Move UI strings into `src/copy/en.ts`; components read from it. No
translations shipped; document how to add one.

**F-18 Docs site.** Static site generated from `docs/` (no runtime). Hosted on GitHub Pages or under
ingotkit.com. Search, code copy buttons, dark mode, Billet branding.

---

## 8. Improvement tracks

Work these continuously in small PRs. Each item is safe for a model to do without a phase.

### Quality
- Raise integration coverage on billing adapters' error paths (provider 5xx, malformed payloads).
- Contract tests: run the same suite against every `MediaProvider` and `BillingProvider`
  implementation (shared test factory).
- Flake watch: any e2e test that needed a retry in CI gets fixed, not retried.
- Type tightness: no `as` casts outside adapters and tests; remove any that creep in.

### Security (review before launch and before Pro)
- Run the `security-review` skill over the whole repo; fix findings.
- Webhooks: raw-body signature checks everywhere; timestamp tolerance; replay protection.
- Authorization: every route checks ownership (jobs, gallery, conversations). Add tests that try
  another user's ids.
- Uploads: type and size checks server-side; never trust `Content-Type` alone for R2 (sniff magic
  bytes).
- SSRF: never fetch a URL the user typed; only provider URLs from our own job rows.
- Secrets: `/setup` never shows secret values; production hides `/setup` once configured.
- Headers: CSP, `X-Frame-Options`, `Referrer-Policy` in `next.config.ts`; test the provider image
  domains still load.
- Dependency hygiene: weekly audit (see automations); pin majors.

### Performance and cost
- Keep pages static or partially prerendered where possible (Cache Components); measure TTFB on a
  real Hostinger plan in Phase 6.
- DB: indexes exist for every query in hot paths; check with `EXPLAIN` when adding queries.
- Chat cost: prompt caching for the system prompt once it's long; per-tool `maxOutputTokens`.
- Media cost: credit margins reviewed whenever Higgsfield changes prices.

### Accessibility
- Every form control labelled; errors announced (`role="status"`); focus visible; keyboard-only
  pass of every flow; color contrast AA in both themes; reduced-motion respected.

### Developer experience
- Fast feedback: `npm test` under 15 s locally.
- Clear errors when Docker isn't running (integration setup already explains `DATABASE_URL`).
- Keep `README` "Run it locally" to five commands.

---

## 9. Design

### Two different design jobs
1. **Billet's own brand** (README, docs site, demo, launch assets): IngotKit brand v1, with
   Billet's alloy.
2. **The app a buyer ships** (dashboard, tools, billing, landing): neutral, easy to re-theme, and
   not branded as Billet. Buyers must be able to make it theirs by editing `site.config.ts` and
   one theme file.

### IngotKit brand v1 (for Billet's own assets)
Source: `~/Desktop/Digital Products/brand/` (start at its README), design system artifact
https://claude.ai/artifact/AZkUUAioWzPDGesuKBMTeq.
- Wordmark: lowercase, Archivo (wdth 112, wght 760); the i-dots are molten ingot trapezoids.
- Type: Archivo + IBM Plex Mono.
- Color: graphite `#15161A`, paper `#F6F5F1`, **molten `#EE5F22` (Billet's alloy, shared with the
  parent)**. No gold anywhere.
- Sub-brand rule: the parent owns the letters, the product owns the tittle color.
- Tokens: `brand/tokens/tokens.css` (`--ik-*`), `tokens.json` (DTCG), `components.css` (`ik-*`).
  Prefixed so they never collide with shadcn's `--border` or Tailwind's `--font-sans`.

### The starter's default look (for buyers)
- shadcn/ui base-nova on Tailwind v4 tokens in `src/app/globals.css`. Keep components stock so
  buyers can pull shadcn updates.
- Recommended next step (small PR): move the starter's color and font choices into a single
  `src/app/theme.css` with clear comments ("change these 6 lines to rebrand"), and ship a tasteful
  neutral default with one accent. Optionally include a "molten" accent preset so the live demo looks
  like Billet while a fresh fork stays neutral.
- Dark mode on by system preference; every page checked in both.

### UI principles
- One primary action per screen. Credits cost shown on the button ("Generate (5 credits)").
- Always show the balance where credits are spent.
- Waiting states say what's happening and roughly how long ("Usually takes a few minutes").
- Failures say what happened and that credits were refunded.
- Empty states teach the next step.
- Mobile first; nothing breaks at 360 px wide.

### Copy voice
Plain, warm, specific. Short sentences. Numbers over adjectives. No hype words ("revolutionary",
"seamless"). No em dashes.

### Design work a model can do
- Theme file refactor (above), with screenshots in light and dark.
- Landing/pricing (F-04) using the frontend-design and ui-ux-pro-max skills; check against the
  brand system for Billet's own demo.
- README hero image and social card (1200×630) in the brand style.
- Accessibility pass with fixes.
Owner decides: logo use on GitHub, demo video style, anything posted publicly.

---

## 10. Automations

### Already running
- GitHub Actions CI on every push/PR: typecheck, lint, build with no env, unit + integration (MySQL
  service), Playwright (Mailpit service), traces uploaded on failure.
- Claude Code desktop Auto-fix on open PRs (wakes the session on CI failure, conflicts, review
  comments).
- Slash commands: `/next`, `/phase-1` to `/phase-6` (`.claude/commands/`).

### Add next (each is a small, safe PR)
| Automation | How | Why |
| --- | --- | --- |
| Dependency updates | Dependabot (npm weekly, actions monthly), grouped minor/patch | Next/AI SDK/Polar move fast |
| Weekly audit | Scheduled workflow: `npm audit --omit=dev`, open an issue if new advisories | Catch supply-chain issues |
| Em dash guard | CI step: fail if the em dash character (U+2014) appears in tracked text files (exclude `node_modules`, lockfile) | Owner's rule, enforced |
| Env drift check | Unit test: every key in `env.ts` appears in `.env.example` and vice versa | Keeps setup honest |
| Migration check | CI: `drizzle-kit generate` produces no new migration (schema and migrations in sync) | Prevents forgotten migrations |
| Link checker | Scheduled check of links in `README.md` and `docs/` | Vendor docs move |
| Release | Tag `v1.x.y` → GitHub Release with notes from `CHANGELOG.md` | Visible maintenance (listing requirement) |
| CLA bot | Before accepting outside PRs (needed for Pro) | Licensing |
| Issue templates | Bug (with `/setup` status and versions), feature request, "showcase" | Better reports |

### Claude-powered automations (owner approves each before turning on)
| Automation | Trigger | What it does | Guardrails |
| --- | --- | --- | --- |
| Vendor drift watch | Scheduled routine, weekly | Reads changelogs for Next.js, AI SDK, Better Auth, Drizzle, Polar, Higgsfield; opens an issue listing changes that affect Billet's adapters, with links | Read-only; no code changes |
| Issue triage | New issue | Labels, asks for missing info (setup status, versions), links docs | Never closes issues; no promises |
| PR review | PR opened | Runs `/code-review` at medium; posts findings as a comment | Advisory only |
| Release notes draft | Before a tag | Drafts notes from merged PRs and `CHANGELOG.md` | Owner publishes |
| Price watch | Monthly | Compares Higgsfield/Anthropic prices in docs vs `creditCosts`; opens an issue if margin < 50% | Read-only |
| Sandbox smoke test | Weekly, manual dispatch | Runs e2e against Polar sandbox with fake media | Uses test keys stored as Actions secrets only if the owner adds them |

### New slash commands worth adding
- `/add-tool <description>` (F-08).
- `/verify-gate` : runs the full ladder, lists what's verified vs not, proposes `PROGRESS.md` ticks.
- `/release <version>` : checks DoD, updates `CHANGELOG.md`, drafts the GitHub Release (no publish).
- `/vendor-check <package>` : reads the installed types and current docs and reports drift.

### Hooks (Claude Code settings)
- Pre-commit hook that rejects em dashes in staged text files.
- Optional: run `npm run typecheck` after edits to `src/**/*.ts` in long sessions.

---

## 11. Launch, growth and community

### Launch sequence (from the plan)
1. **Soft launch (2027-01-04 to 01-10):** 5 to 10 builders deploy it; collect friction; fix.
2. **Launch week (2027-01-11):** Show HN, Product Hunt, r/SideProject, r/nextjs, Indie Hackers, X.
3. **After:** weekly "built with Billet" showcase, a new example tool most weeks, SEO docs pages.

### Listing checklist (Hostinger partner + general)
MIT license · README with pitch, 20-second demo, feature list, Deploy button near the top,
recommended plan (Business) · visible maintenance (commits, `CHANGELOG.md`, answered issues) ·
a clean fork deploys with env vars only · one honest line that the button is a referral link.

### Assets to produce (models draft, owner approves and posts)
- README hero clip: fork → deploy → first paid generation (Higgsfield can render the stylized
  parts; the screen recording must be real).
- Three 9:16 launch clips; demo gallery media; Product Hunt image set; social card.
- Launch posts tailored per channel (HN: technical, no hype; PH: visual; Reddit: story + lessons).
- Docs pages that rank: "Deploy Next.js on Hostinger", "Stripe/Polar credits for AI apps",
  "Run AI jobs without Redis".

### Community
- GitHub Discussions on for Q&A and showcase; issues for bugs only.
- Response time goal: issues answered within 48 hours in the first month.
- CONTRIBUTING.md: how to run tests, the non-negotiables, PR checklist.

### Owner-only in this area
Posting anywhere, joining communities, recording voice/face, replying as the owner.

---

## 12. Risks

| Risk | Signs | Response |
| --- | --- | --- |
| Polar declines AI image/video use case | Review reply negative | Switch default to Lemon Squeezy (F-13), keep Polar for non-media buyers; update `docs/payments.md` |
| Higgsfield price or API change | Margin < 50%, adapter errors | Price watch automation; adjust `creditCosts`; alternate adapters (F-12) |
| Hostinger changes Web apps limits or partner terms | Docs change, deploy fails | Re-run F-06; keep `docs/HOSTINGER.md` dated; VPS bundle as fallback |
| Next.js / AI SDK breaking changes | Dependabot PR fails CI | Read bundled docs; fix in one PR per upgrade |
| Trademark conflict on "Billet" or "IngotKit" | Agent's report | Decide before launch; renaming is cheaper before stars |
| Cost overrun from abuse (free sign-up credits) | Many sign-ups, jobs without purchases | Email verification already required; lower `signupCredits`; rate limits (F-11) |
| Solo maintainer time (15 h/week) | Slipping gates | Cut v1.x scope first, never the non-negotiables |
| Security incident in a buyer's app | Report via issue/email | SECURITY.md with private contact; patch release; advisory |

---

## 13. Decision log

Add new decisions at the bottom with date, decision, reason. Don't rewrite old ones; supersede
them.

| ID | Date | Decision | Reason |
| --- | --- | --- | --- |
| D-01 | 2026-11-06 | Target Hostinger Web apps: MySQL only, no always-on process | The wedge; partner program revenue |
| D-02 | 2026-11-07 | Org/brand IngotKit (forgekit taken); ingotkit.com, npm `ingotkit` claimed | Availability |
| D-03 | 2026-11-07 | Node 24 via fnm (not 26) | Hostinger supports 22/24 |
| D-04 | 2026-11-08 | Polar is the default payment provider (merchant of record); Stripe kept behind the same interface | Stripe doesn't onboard Pakistan; Polar pays out in PKR |
| D-05 | 2026-11-08 | Monthly plan credits carry over | Simpler, buyer-friendly |
| D-06 | 2026-11-08 | Phase 5 money-path e2e uses Polar sandbox or signed test webhooks, not Stripe test mode | D-04 |
| D-07 | 2026-11-08 | Better Auth on MySQL with generated schema | Verified support; self-hosted, no per-user fees |
| D-08 | 2026-11-08 | Read request data before env in Server Components; e2e builds with no env | A no-env build had baked a redirect into `/dashboard` |
| D-09 | 2026-11-09 | `billing:sync` needs only the API key | Products must exist before the webhook |
| D-10 | 2026-11-09 | Higgsfield via plain fetch, not its SDK | SDK waits for results; doesn't fit idle-stopping hosts |
| D-11 | 2026-11-09 | Media webhooks only say "check this job"; the result is re-fetched from the provider | Forged or replayed webhooks can't fake outcomes; signing still recommended |
| D-12 | 2026-11-09 | Jobs also finish by open-page checks (10 s throttle) and cron | Works on http localhost and when webhooks fail |
| D-13 | 2026-11-09 | Chat default model `claude-opus-5-5` | Skill default; owner may switch to Haiku 5.5 for cost |
| D-14 | 2026-11-11 | Product name **Billet** for the starter (IngotKit is the parent) | Family naming on ingotkit.com. **Open:** rename repo/package/code identifiers to Billet? Recommendation: rename the GitHub repo to `IngotKit/billet` before the Hostinger listing (GitHub redirects old URLs), update README/docs copy to Billet, keep internal identifiers (`ingotkit_` lookup keys, metadata) unchanged because live Polar products depend on them. Owner decides. |

---

## 14. Owner-only work

Models prepare, explain and verify; the owner does these:
- Create or change accounts (Anthropic, Higgsfield, Polar, Lemon Squeezy, Cloudflare, Hostinger).
- Put keys into `.env.local` or hPanel (never paste them into chat).
- Top up balances, pay for plans, buy domains.
- Accept terms of service; answer vendor reviews (Polar).
- Rename or create repos; change GitHub org settings (for example "Allow auto-merge").
- Publish: npm, GitHub Releases, partner listing, Product Hunt, posts.
- Approve merges to `main` and each phase gate.
- Trademark filing.

---

## 15. Prompt templates

**Start a phase**
> Read CLAUDE.md, PROGRESS.md, docs/PLAN.md (Phase N) and docs/PLAYBOOK.md (sections 3 to 7).
> Check the previous gate is ticked. Propose a plan: what you'll build, what you won't, what I
> must do, and open questions with your recommendation. Wait for my approval.

**Add a tool**
> Add a tool: <what it does, which provider/model, credit cost>. Follow docs/PLAYBOOK.md F-08 and
> docs/ai-tools.md "Add a tool". Check the model's current input schema and price in the provider's
> docs first. Tests for its input validation. One PR.

**Add a provider adapter**
> Implement <provider> as a <MediaProvider|BillingProvider>. Read its current API docs and our
> interface in <file>. Webhooks: verify signatures on the raw body; never trust payload outcomes.
> Unit tests with a fake fetch. List what needs my keys to verify for real.

**Fix CI**
> CI failed on <PR>. Read the failing job's log, reproduce locally, fix the cause (not the test),
> run the full ladder, push. Tell me the cause in one sentence.

**Vendor drift check**
> Check <package or vendor> for changes since <date or version> that affect Billet. Read the
> installed types and the current docs. Report: what changed, which of our files it affects,
> recommended action. Don't change code.

**Release**
> Prepare release v<x.y.z>: run the definition of done, update CHANGELOG.md, draft release notes.
> Don't tag or publish.

**Review**
> Review <branch or PR> against docs/PLAYBOOK.md section 3. Report only real problems with file and
> line, most severe first.

---

## 16. Glossary

| Term | Meaning |
| --- | --- |
| Billet | This starter kit (product name) |
| IngotKit | Parent brand/company; GitHub org; current repo and package name |
| Gate | The check that closes a phase; ticked only after real verification |
| Ledger | `credit_ledger`; balance is the sum of a user's rows |
| Reserve / commit / refund | Hold credits for a job / keep them on success / return them on failure |
| Settle | Commit or refund; happens exactly once per job |
| Job | One AI generation, a row in `job` |
| Fake provider | `FAKE_MEDIA_PROVIDER=1`; free placeholder media for tests; never on a live site |
| hPanel | Hostinger's control panel (env vars, MySQL, cron) |
| Merchant of record (MoR) | A payment company that sells on your behalf and handles sales tax (Polar, Lemon Squeezy) |
| Quick tunnel | `cloudflared tunnel --url http://localhost:3001`: a temporary public https address for local webhook tests |

---

## 17. Keeping this playbook current

- Update section 2 at the end of each phase and whenever an external wait is resolved.
- Add decisions to section 13; never silently change old ones.
- When a brief in section 7 ships, mark it "(shipped YYYY-MM-DD, PR #n)" rather than deleting it.
- If you find this playbook wrong, fix it in the same PR as the work that proved it wrong.
- Review the whole file at each major version (v1, v1.x, Pro decision).
