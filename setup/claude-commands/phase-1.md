---
description: Start Phase 1 — Scaffold (~1 day)
---

Phase 1: Scaffold (~1 day)
Gate: `npm run dev` shows a page; CI runs typecheck, lint and tests.

Brief:
Read CLAUDE.md. Scaffold the repo exactly as described: Next.js 16, TypeScript strict, Tailwind v4, shadcn/ui, Drizzle with mysql2, Vitest, Playwright, a docker/dev.yml with MySQL 8, and a GitHub Actions workflow running typecheck, lint and test. Create src/config/site.config.ts and src/lib/env.ts (Zod, reports missing keys, never throws on import). Stop when CI is green.

How to run it:
1. Read `CLAUDE.md`, `PROGRESS.md` and the Phase 1 section of `docs/PLAN.md`.
2. Check that the previous phase's gate is ticked in `PROGRESS.md`. If not, say so and stop.
3. Propose a plan and wait for approval before writing code.
4. Build in small steps; run the Definition of Done after each.
5. Tick verified items in `PROGRESS.md`, log the date, update `CHANGELOG.md`.
6. Verify the gate explicitly before ticking it.

Extra instructions from me (may be empty): $ARGUMENTS
