# IngotKit — Plan

Copied from the planning doc (https://claude.ai/artifact/UJU6TxTAmRjXDqwDs4N2Zw) on 2026-11-08.
This file is the source of truth for Claude Code; edit it here if the plan changes.

## Goal and positioning
Ship an open-source, MIT-licensed Next.js starter for AI SaaS that deploys to Hostinger
Web apps in one click and runs on MySQL. Most popular starters assume Vercel plus
Postgres/Supabase, which Hostinger Web apps plans don't offer — that's the wedge.

- **One-line pitch:** "Launch a paid AI app on flat-rate hosting this weekend: auth,
  Stripe credits and AI image/video generation, already wired up."
- **For:** indie hackers, vibe coders using Claude Code or Cursor, freelancers building
  AI tools for clients.
- **How it earns:** the README's Deploy on Hostinger button carries a partner code;
  20% of the plan each referred user buys. Later: IngotKit Pro (see PRO-ROADMAP.md).
- **90-day goals:** 1,000+ stars, partner listing approved, steady tracked deploys.

## Tech stack
| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), TypeScript strict | Current major; Hostinger auto-detects Next.js |
| Runtime | Node.js 22 or 24 LTS | Both supported on Web apps |
| Database | MySQL 8 + Drizzle ORM (`mysql2`) | Included in the plan |
| Auth | Better Auth (email/password, magic link, Google, GitHub) | Self-hosted, no per-user fees |
| Payments | Stripe + one merchant-of-record adapter (Polar or Lemon Squeezy) | MoR serves builders where Stripe won't onboard |
| Text AI | Vercel AI SDK (Anthropic, OpenAI) | One interface, streaming |
| Image/video AI | Media adapter; Higgsfield API default; fal/Replicate alternates | Higgsfield: 50+ models, one key, per-generation pricing |
| Background work | `jobs` table + provider webhooks + hPanel cron → `/api/cron/*` | No always-on process |
| Rate limiting | MySQL-backed counter | No Redis |
| Email | Nodemailer SMTP (Hostinger mailbox); Resend optional | No extra signup |
| Storage | S3-compatible (Cloudflare R2), optional | Provider URLs can expire |
| UI | Tailwind v4 + shadcn/ui | Familiar to buyers |
| Tests | Zod, Vitest, Playwright | Guards the money path |

## Feature scope
**v1**
1. First-run `/setup` page listing missing env vars with instructions.
2. Auth: email/password, magic link, Google, GitHub; verification; reset.
3. Billing: credit packs + monthly plan that refills credits; portal; webhook ledger.
4. Credits ledger: every grant/spend is a row; reserve before a job, refund on failure.
5. Three demo tools: AI chat (streaming), image generator, image-to-video.
6. Jobs: async generations, finished by webhook, cron polling fallback.
7. Gallery of each user's outputs.
8. Admin page: users, credit adjustments, failures, revenue.
9. Landing + pricing pages from `site.config.ts`.
10. Docs: README with Deploy on Hostinger button, 10-minute deploy guide, add-a-tool guide.
11. AI-ready repo: `CLAUDE.md` + an "add a new tool" command.

**Later (most become Pro — see PRO-ROADMAP.md):** teams/seats, end-user API keys,
Supabase Postgres option, affiliate system, i18n, `docker-compose.yml` for VPS deploys.

## Build plan
Each phase ends with a gate. Run phases in plan mode: read the plan, push back, approve.
Rough effort ~15 working days solo (a guess). Dates assume ~15 h/week from 2026-11-09.

### Phase 1 — Scaffold (~1 day)
Gate: `npm run dev` shows a page; CI runs typecheck, lint and tests.
> Read CLAUDE.md. Scaffold the repo exactly as described: Next.js 16, TypeScript strict,
> Tailwind v4, shadcn/ui, Drizzle with mysql2, Vitest, Playwright, a docker/dev.yml with
> MySQL 8, and a GitHub Actions workflow running typecheck, lint and test. Create
> src/config/site.config.ts and src/lib/env.ts (Zod, reports missing keys, never throws on
> import). Stop when CI is green.

### Phase 2 — Setup page + auth (~2 days)
Gate: a fresh clone with no env shows `/setup`; with env you can sign up, verify email, log in.
> Build /setup: it lists every required env var that is missing, grouped by feature, with
> where to get each one. Middleware redirects to /setup when core vars are missing. Then add
> Better Auth with Drizzle on MySQL: email/password with verification, magic link, Google
> and GitHub. Email goes through a Nodemailer SMTP adapter. Write the schema, migrations and
> an e2e test for signup.

### Phase 3 — Billing + credits ledger (~3 days)
Gate: a test purchase grants credits; replaying the same webhook grants nothing extra.
> Implement lib/credits as an append-only ledger with grant, reserve, commit and refund,
> idempotent by key. Then lib/billing with a BillingProvider interface and a Stripe
> implementation: credit packs, a monthly plan that refills credits, Customer Portal, and a
> signature-verified, idempotent webhook. Prices and packs come from site.config.ts. Add unit
> tests for the ledger, including concurrent reserves.

(If Stripe can't onboard the owner from Pakistan, implement the merchant-of-record adapter
first and keep Stripe behind the same interface for buyers who can use it.)

### Phase 4 — AI tools + jobs (~4 days)
Gate: chat, image and video work; a failed job refunds credits.
> Build the tools system from CLAUDE.md: tools/registry.ts and three tools (chat with
> streaming via the AI SDK, text-to-image, image-to-video). Media goes through a
> MediaProvider interface with a Higgsfield implementation. Async jobs: insert into jobs,
> reserve credits, call the provider with our webhook URL, complete in
> /api/webhooks/higgsfield, plus /api/cron/poll-jobs as fallback, secured by CRON_SECRET.
> No in-process background work.

Higgsfield API notes: official Python and Node/TypeScript SDKs; auth header
`Authorization: Key KEY_ID:KEY_SECRET`, server-side only; pay-as-you-go balance
(https://docs.higgsfield.ai/docs/help/faq). Unlimited web-plan generations don't apply to
API use. Marketing Studio *video* isn't available via API; Marketing Studio Image is.

### Phase 5 — App shell, admin, marketing (~3 days)
Gate: `npm run e2e` passes signup → buy → generate → gallery.
> Add the gallery (list, download, delete; optional R2 upload), the admin area (users,
> credit adjustments, failed jobs, revenue), and the landing and pricing pages driven by
> site.config.ts. Write the end-to-end Playwright test for the full money path using Polar
> sandbox (or signed test webhooks) and a mocked media provider.
> (Changed 2026-11-08: the owner can't open a Stripe account from Pakistan; Stripe stays
> supported and unit-tested.)

### Phase 6 — Hostinger hardening (~2 days)
Gate: someone else deploys a fresh fork on a Business plan in under 15 minutes using only the README.
> Prepare for Hostinger Web apps: confirm build and start commands, engines field, $PORT
> handling, a migration step that runs on deploy, and the hPanel cron setup. Write
> docs/deploy-hostinger.md as a numbered 10-minute guide and docs/add-a-tool.md. Add a
> .claude/commands/add-tool.md command that creates a new tool folder from a description.

## Launch and distribution
- Listing checklist: MIT license; README with pitch, 20-second demo video, feature list,
  Deploy button near the top, recommended plan (Business); visible maintenance (commits,
  CHANGELOG, issues answered); clean fork deploys with env vars only; one honest line that
  the button is a referral link.
- Higgsfield assets: README hero clip (fork → deploy → first paid generation), three 9:16
  launch clips, demo gallery media, Product Hunt set.
- Sequence: soft launch with 5–10 builders → public launch week (Show HN, Product Hunt,
  r/SideProject, r/nextjs, Indie Hackers, X) → weekly "built with IngotKit" showcase and
  new example tools → SEO docs pages.
- Weekly numbers: stars, forks, deploys and paying users (partner dashboard).
