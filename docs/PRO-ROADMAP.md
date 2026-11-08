# Open core and Pro roadmap

Keep the free kit fully working under MIT; sell a separate Pro package later for people
already making money. Don't build Pro before the free kit has steady deploys (not before
mid-February 2027).

| Area | Free (MIT) | Pro (commercial license) |
| --- | --- | --- |
| Accounts | Auth, email verification, admin page | Teams, seats, roles, org billing |
| Billing | Stripe + merchant of record, credits, subscriptions | Usage metering, coupons, end-user API keys |
| AI tools | Chat, image, image-to-video examples | Premium tools: UGC ad maker, headshot generator, logo maker |
| Growth | Landing and pricing pages | Affiliate system, email sequences |
| Agencies | Single app | White-label, multi-client |
| Hosting | Web apps deploy | VPS bundle with workers/queues (`docker-compose.yml`) |
| Support | GitHub issues | Priority support, private Discord |

Rule of thumb: if a solo builder needs it to take their first payment, it stays free.

## Do now, during v1
- [ ] Pro lives in a separate private repo (`IngotKit/ingotkit-pro`), attaching only through
      the tool registry and provider interfaces (rule already in CLAUDE.md).
- [ ] CLA bot before accepting outside pull requests.
- [ ] Check the name, then consider registering it as a trademark.

## Pricing (to set later)
Pro (one product, 12 months of updates) · Agency (unlimited client projects, white-label) ·
Updates renewal. Sell via Polar (automatic private-repo access for buyers; needs a GitHub
organization) or Lemon Squeezy. Confirm payouts to Pakistan first.
