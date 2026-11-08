# Start here — IngotKit

This folder is a ready-to-go Claude Code project. Claude Code reads `CLAUDE.md`
automatically and tracks its own progress in `PROGRESS.md`.

## One-time setup (about an hour)
Follow `docs/SETUP-RUNBOOK.md` steps 1–6: accounts, Node 24, Docker, GitHub CLI,
Claude Code, the GitHub organization and repo, and repo protection.

## Open the project in Claude Code
First time only, install the slash commands (they ship in `setup/claude-commands/`
because remote tools can't write into `.claude/`):
```bash
cd ~/Desktop/"Digital Products"/01-ForgeKit-Hostinger
mkdir -p .claude/commands && cp setup/claude-commands/*.md .claude/commands/
claude
```

Then type:

```
/next
```

`/next` reads `PROGRESS.md`, finds the first unchecked item and starts it in plan mode.
You can also start a phase directly with `/phase-1` … `/phase-6`.

## Connecting it to GitHub
The app's code will live here. When you create the GitHub repo (runbook step 3), run
these from this folder instead of cloning:

```bash
git init -b main
gh repo create IngotKit/ingotkit --public --source . --remote origin \
  --description "Open-source AI SaaS starter for flat-rate Hostinger hosting"
git add . && git commit -m "Project brief and plan" && git push -u origin main
```

A public GitHub repo is required for Hostinger's open-source partner listing.

## What's in this folder
| Path | What it is |
| --- | --- |
| `CLAUDE.md` | Rules Claude Code follows every session |
| `PROGRESS.md` | Phase checklist; Claude Code ticks it as it works |
| `docs/PLAN.md` | Goal, stack, scope, build plan with phase prompts, launch |
| `docs/HOSTINGER.md` | Hosting constraints, Deploy button format, partner rules |
| `docs/SETUP-RUNBOOK.md` | Your one-time setup steps and the do-now checklist |
| `docs/PRO-ROADMAP.md` | What stays free vs. the paid Pro add-on later |
| `setup/claude-commands/` | `/next` and `/phase-1` … `/phase-6` (copy into `.claude/commands/` once) |

## Live planning docs (claude.ai)
- Plan & brief: https://claude.ai/artifact/UJU6TxTAmRjXDqwDs4N2Zw
- Launch Plans (all four projects): https://claude.ai/artifact/MJUETVkKad2ZTzwRQEWmZK
