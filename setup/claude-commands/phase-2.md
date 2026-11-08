---
description: Start Phase 2 — Setup page + auth (~2 days)
---

Phase 2: Setup page + auth (~2 days)
Gate: a fresh clone with no env shows `/setup`; with env you can sign up, verify email, log in.

Brief:
Build /setup: it lists every required env var that is missing, grouped by feature, with where to get each one. Middleware redirects to /setup when core vars are missing. Then add Better Auth with Drizzle on MySQL: email/password with verification, magic link, Google and GitHub. Email goes through a Nodemailer SMTP adapter. Write the schema, migrations and an e2e test for signup.

How to run it:
1. Read `CLAUDE.md`, `PROGRESS.md` and the Phase 2 section of `docs/PLAN.md`.
2. Check that the previous phase's gate is ticked in `PROGRESS.md`. If not, say so and stop.
3. Propose a plan and wait for approval before writing code.
4. Build in small steps; run the Definition of Done after each.
5. Tick verified items in `PROGRESS.md`, log the date, update `CHANGELOG.md`.
6. Verify the gate explicitly before ticking it.

Extra instructions from me (may be empty): $ARGUMENTS
