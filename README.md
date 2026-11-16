# IngotKit

Open-source AI SaaS starter for flat-rate Hostinger hosting: auth, credits, payments and
AI image/video generation on Next.js + MySQL. **Work in progress, not ready to deploy yet.**

Building it? Start with `START-HERE.md`. The plan lives in `docs/PLAN.md`.

## Run it locally

Needs Node 22 or 24 and Docker.

```bash
npm install
docker compose -f docker/dev.yml up -d   # MySQL 8 + Mailpit (local inbox)
cp .env.example .env.local               # then set BETTER_AUTH_SECRET: openssl rand -base64 32
npm run db:migrate
npm run dev
```

- App: http://localhost:3000. Until the core settings are filled in, every page shows `/setup`,
  which lists what is missing and where to get it.
- Emails (sign-up confirmation, sign-in links, password resets) land in Mailpit:
  http://localhost:8025
- Google and GitHub sign-in buttons appear once their keys are in `.env.local`
  (callback URLs: `http://localhost:3000/api/auth/callback/google` and `.../github`).

## Payments

Credit packs and a monthly plan, paid through Polar (default) or Stripe. Setup steps, how the
credits ledger works, and provider notes: [`docs/payments.md`](docs/payments.md).

## AI tools

AI chat (Anthropic or OpenAI), an image generator and image-to-video (Higgsfield), each paid
for with credits. Long generations finish by webhook, by checks while the page is open, or by
an hPanel cron job; failed ones are refunded. Setup, cron and how to add your own tool:
[`docs/ai-tools.md`](docs/ai-tools.md).

## Checks

```bash
npm run typecheck && npm run lint && npm test   # unit + MySQL integration tests
npm run e2e   # production build + Playwright; needs the Docker services running
```
