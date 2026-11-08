---
description: Start Phase 4 — AI tools + jobs (~4 days)
---

Phase 4: AI tools + jobs (~4 days)
Gate: chat, image and video work; a failed job refunds credits.

Brief:
Build the tools system from CLAUDE.md: tools/registry.ts and three tools (chat with streaming via the AI SDK, text-to-image, image-to-video). Media goes through a MediaProvider interface with a Higgsfield implementation. Async jobs: insert into jobs, reserve credits, call the provider with our webhook URL, complete in /api/webhooks/higgsfield, plus /api/cron/poll-jobs as fallback, secured by CRON_SECRET. No in-process background work.

How to run it:
1. Read `CLAUDE.md`, `PROGRESS.md` and the Phase 4 section of `docs/PLAN.md`.
2. Check that the previous phase's gate is ticked in `PROGRESS.md`. If not, say so and stop.
3. Propose a plan and wait for approval before writing code.
4. Build in small steps; run the Definition of Done after each.
5. Tick verified items in `PROGRESS.md`, log the date, update `CHANGELOG.md`.
6. Verify the gate explicitly before ticking it.

Extra instructions from me (may be empty): $ARGUMENTS
