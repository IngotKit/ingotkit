---
description: Pick up the next unchecked item in PROGRESS.md and plan it
---

1. Read `CLAUDE.md`, `PROGRESS.md` and `docs/PLAN.md`.
2. Find the first phase in `PROGRESS.md` whose gate is not checked. If an owner-only item
   above it is unchecked (accounts, payments check, repo creation), tell me what I need to
   do first and stop.
3. Within that phase, take the first unchecked item. Use the phase prompt in
   `docs/PLAN.md` as the brief.
4. Propose a short plan (files to create or change, tests to add, how you'll verify) and
   wait for my approval before writing code.
5. After building: run the Definition of Done from `CLAUDE.md`, tick the items you
   verified in `PROGRESS.md`, add a dated line under "Log", add a `CHANGELOG.md` entry, and
   suggest a commit message.
6. If the phase gate can now be verified, verify it and say so explicitly. Don't tick a
   gate you haven't actually checked.

Extra instructions from me (may be empty): $ARGUMENTS
