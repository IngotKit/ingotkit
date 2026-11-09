# Payments and credits

IngotKit sells **credit packs** (one-time) and a **monthly plan** (credits every month). Users
spend credits on AI tools. Prices, pack sizes and credit costs live in `src/config/site.config.ts`.

## How credits work
- Every change is a row in the `credit_ledger` table; a balance is the sum of a user's rows.
  Nothing stores a balance that could drift.
- New accounts get `signupCredits` once.
- A paid order adds the pack's credits. Each plan renewal adds `monthlyCredits`. Unused credits
  carry over.
- AI jobs **reserve** credits before calling a provider, then **commit** (unused part comes
  back) or **refund** (job failed, everything comes back). Each step happens once per job.
- Credits come from the payment provider's **webhook**, never from the "thank you" page, and a
  repeated webhook can't add credits twice.
- Refunds and chargebacks don't remove credits automatically. Adjust them by hand (admin
  credit adjustments arrive in Phase 5).

## Choose a provider
| Provider | Use it when | Notes |
| --- | --- | --- |
| **Polar** (default) | You want a merchant of record (Polar handles sales tax/VAT) or Stripe doesn't accept your country | Pays out in many countries, including Pakistan (PKR). |
| **Stripe** | Your business is in a Stripe-supported country | You handle tax yourself (or use Stripe Tax). |

`billing.provider` in `site.config.ts` picks one; `"auto"` uses Polar if configured, else Stripe.

**AI image and video apps:** payment providers review these more closely. Polar lists "AI
content generation tools" as needing manual review, and its automated onboarding check may
flag image/video generation. Describe your product accurately and ask for a manual review.
Face swaps, deepfakes and adult content are prohibited by Polar, Lemon Squeezy and Paddle.
Check your provider's current acceptable use policy before launching.

## Set up Polar (test mode first)
1. Sign in at **sandbox.polar.sh** (test mode; card `4242 4242 4242 4242`, any future date).
2. **Settings → Developers → New token**: allow products, checkouts and customer sessions.
   Put it in `POLAR_ACCESS_TOKEN`. Keep `POLAR_SERVER=sandbox`.
3. Run `npm run billing:sync` to create the packs and plan in Polar from `site.config.ts`.
   It only needs the token, so you can run it before the webhook exists. Run it again
   whenever you change prices; unchanged products are left alone.
4. **Settings → Webhooks → Add Endpoint**: URL `<APP_URL>/api/webhooks/polar`, format **Raw**,
   API version **2026-10** (the version IngotKit's Polar adapter is written for), events: at
   least `order.paid` (ticking all is fine; others are logged and ignored). Put the secret
   in `POLAR_WEBHOOK_SECRET`.
5. Going live: repeat 2 to 4 at **polar.sh** with `POLAR_SERVER=production`.

If a delivery fails (your app was down, say), open the webhook in Polar, find it under
deliveries and redeliver it. Credits are granted once per order, so redelivering is safe.

### Testing webhooks on your own computer
Polar can't reach `localhost`, so expose your dev server with a temporary tunnel and use the
tunnel URL for the webhook endpoint. Keep `APP_URL` as your localhost address; only Polar
needs the tunnel. For example, with Cloudflare's free quick tunnel (no account needed):

```bash
cloudflared tunnel --url http://localhost:3000
```

It prints an `https://….trycloudflare.com` address. Quick-tunnel addresses change every time
you restart the tunnel, so update the webhook URL in Polar when that happens.

## Set up Stripe
1. **Developers → API keys**: secret key into `STRIPE_SECRET_KEY`.
2. **Developers → Webhooks**: endpoint `<APP_URL>/api/webhooks/stripe`, events
   `checkout.session.completed` and `invoice.paid`. Signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Turn on the **customer portal** in Stripe's billing settings.
4. Run `npm run billing:sync` (or `npm run billing:sync stripe`).
