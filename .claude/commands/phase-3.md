---
description: Start Phase 3 — Billing + credits ledger (~3 days)
---

Phase 3: Billing + credits ledger (~3 days)
Gate: a test purchase grants credits; replaying the same webhook grants nothing extra.

Brief:
Implement lib/credits as an append-only ledger with grant, reserve, commit and refund, idempotent by key. Then lib/billing with a BillingProvider interface and a Stripe implementation: credit packs, a monthly plan that refills credits, Customer Portal, and a signature-verified, idempotent webhook. Prices and packs come from site.config.ts. Add unit tests for the ledger, including concurrent reserves.

How to run it:
1. Read `CLAUDE.md`, `PROGRESS.md` and the Phase 3 section of `docs/PLAN.md`.
2. Check that the previous phase's gate is ticked in `PROGRESS.md`. If not, say so and stop.
3. Propose a plan and wait for approval before writing code.
4. Build in small steps; run the Definition of Done after each.
5. Tick verified items in `PROGRESS.md`, log the date, update `CHANGELOG.md`.
6. Verify the gate explicitly before ticking it.

Extra instructions from me (may be empty): $ARGUMENTS
