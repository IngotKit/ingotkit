# Setup runbook (owner's one-time steps)

Do steps 1–6 before Phase 1. Work through step 7 alongside the build. Step 8 is the daily loop.

## 1. Accounts
| Account | Used for | Needed by |
| --- | --- | --- |
| Claude Pro or Max (or Console with API billing) | Claude Code | Now |
| GitHub account + a free organization | Public kit repo, private Pro repo | Now |
| Hostinger partner program | Listing and referral code | Now (sign up); list after Phase 6 |
| Stripe (test mode) | Billing adapter | Phase 3 |
| Polar or Lemon Squeezy | Merchant-of-record adapter, later Pro sales | Phase 3 |
| Anthropic and/or OpenAI API key | Chat demo tool | Phase 4 |
| Higgsfield API key + small prepaid balance | Image and video tools | Phase 4 |
| Cloudflare (R2) | Optional media storage | Phase 5 |
| Hostinger Business plan + a domain | Real deploy test, live demo | Phase 6 |

If Stripe won't let you open an account from Pakistan, build the merchant-of-record
adapter first and test Stripe later with a collaborator's test keys.

## 2. Install the tools (macOS)
```bash
brew install git gh fnm
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc && source ~/.zshrc
fnm install 24 && fnm default 24      # .node-version in this folder pins 24
gh auth login
curl -fsSL https://claude.ai/install.sh | bash   # Claude Code native installer
claude doctor
```
Also install Docker Desktop (for the local MySQL database). No Homebrew? Install it from
brew.sh first.

## 3. GitHub organization and repos
1. github.com → **+ → New organization → Free**; name it after the kit if it's free.
2. From this folder (it already holds the plan), create the public repo and push:
   ```bash
   git init -b main
   gh repo create IngotKit/ingotkit --public --source . --remote origin \
     --description "Open-source AI SaaS starter for flat-rate Hostinger hosting"
   git add . && git commit -m "Project brief and plan" && git push -u origin main
   ```
   Then on GitHub: add an MIT license file (or ask Claude Code to add `LICENSE`).
3. Create the private Pro repo now and leave it empty:
   ```bash
   gh repo create IngotKit/ingotkit-pro --private --description "IngotKit Pro (commercial license)"
   ```
4. Repo settings: turn on Issues and Discussions; topics `nextjs`, `saas-starter`, `ai`,
   `mysql`, `hostinger`, `boilerplate`.

Why an organization: Polar's automatic repo-access feature for buyers is behind a feature
flag on personal accounts.

## 4. Start Claude Code
```bash
cd ~/Desktop/"Digital Products"/01-ForgeKit-Hostinger
mkdir -p .claude/commands && cp setup/claude-commands/*.md .claude/commands/   # first time only
claude
```
Type `/next`. Plan mode is toggled with **Shift+Tab**.

## 5. Connect Claude Code to GitHub
In Claude Code run `/install-github-app` (you're the org admin). Choose **Skip for now**
on GitHub Actions while you build alone; rerun later for `@claude` replies and PR reviews
(those use Actions minutes and API usage). Work in branches and PRs from day one
(`gh pr create --fill`).

## 6. Guard the repo
1. Settings → Rules → Rulesets → branch ruleset for `main`: require a PR, require status
   checks (CI, later the CLA check), block force pushes.
2. CLA before the first outside PR: CLA Assistant (cla-assistant.io, free) or CLA
   Assistant Lite (GitHub Action). Base the text on a widely used template; have a lawyer
   glance at it.
3. Secrets: `.env` is in `.gitignore`; turn on secret scanning + push protection.
4. Ask Claude Code: "Create CONTRIBUTING.md (mentions the CLA and the open-core boundary),
   CODE_OF_CONDUCT.md, SECURITY.md and issue templates for bug, feature and deploy problem."

## 7. Do-now checklist
**Before or during Phase 1**
- [ ] Name is free: GitHub org, `npm view <name>`, the .com/.dev domain, a web search
- [ ] IPO Pakistan trademark search (ipo.gov.pk)
- [ ] `CHANGELOG.md` kept from day one

**Before Phase 3**
- [ ] Which payment provider can onboard you and pay out in Pakistan
- [ ] Test-mode accounts for it

**During the build**
- [ ] At each gate: no Pro imports in core; registry/adapter interfaces stable
- [ ] Short screen capture at each gate (launch clips, Higgsfield source material)
- [ ] CLA and ruleset live before announcing anywhere

**After Phase 6**
- [ ] Connect the repo in the Hostinger partner dashboard; swap in the partner-code button
- [ ] Ask Hostinger whether paid add-ons beside a listed project are allowed
- [ ] Trademark filing via apply.ipo.gov.pk (software: classes 9 and 42; reported fees
      PKR 3,000/class to file, PKR 9,000 to register — confirm on the IPO site)

**When Pro launches (later)**
- [ ] Polar organization + GitHub Repository Access benefit for `ingotkit-pro` (read-only)

## 8. Daily loop
1. Branch for the task: `git switch -c phase-3-ledger`.
2. `claude` → `/next` (or the phase command) → review the plan before code is written.
3. Let it build; the Definition of Done runs typecheck, lint and tests.
4. Click through the result in the browser yourself.
5. `gh pr create --fill`, let CI pass, merge; CHANGELOG line.
6. `/clear` before an unrelated task.
