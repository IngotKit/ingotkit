# AI tools and jobs

IngotKit ships three tools: **AI chat**, **Image generator** and **Image to video**. Each costs
credits per use (`creditCosts` in `src/config/site.config.ts`). Signed-in users find them on the
dashboard, at `/tools/<id>`.

## Set up the providers

**Chat** needs one text AI key. Anthropic is used if both are set (`ai.textProvider` in
`site.config.ts` can force one).
- Anthropic: console.anthropic.com → Settings → API keys → `ANTHROPIC_API_KEY`.
- OpenAI: platform.openai.com → API keys → `OPENAI_API_KEY`.

The model is in `src/tools/chat/config.ts` (default `claude-opus-5-5`). Pick a cheaper model
there if your chat price is low: each message costs `creditCosts.chatMessage` credits whatever
the reply length, up to `maxOutputTokens`.

**Images and video** use Higgsfield (pay-as-you-go; top up a balance first).
1. console.higgsfield.ai → API keys → create one. Put the key ID in `HIGGSFIELD_API_KEY_ID` and
   the secret in `HIGGSFIELD_API_KEY_SECRET`.
2. Recommended: Settings → reveal the webhook signing secret → `HIGGSFIELD_WEBHOOK_SECRET`.
   Without it, webhooks arrive unsigned. That's still safe (the app re-checks every result
   with Higgsfield), but signed is better.
3. Check the price of each model in the console and set `creditCosts` so every generation
   earns more than it costs you. Models are in `src/tools/image/config.ts` (Z-Image Turbo) and
   `src/tools/image-to-video/config.ts` (Wan 2.6, 5 s, 720p).

## How a generation finishes
Nothing runs in the background (Hostinger stops idle apps). An image or video is a row in the
`job` table:

1. The user submits. Credits are **reserved**, the job is saved, and Higgsfield is asked to
   start it, with this app's webhook address.
2. The job finishes by whichever comes first:
   - **Webhook**: Higgsfield calls `/api/webhooks/higgsfield`.
   - **Checks while the page is open**: the job list asks the server every few seconds, and
     the server asks Higgsfield (at most every 10 s per job).
   - **Cron**: `/api/cron/poll-jobs` (below).
3. Success **commits** the credits. Failure, a safety-filter block, or no result after
   `jobs.timeoutMinutes` (default 60) **refunds** them. Each job settles exactly once, even
   if all three arrive together.

A user can run `jobs.maxActivePerUser` (default 3) generations at once.

**Result links expire.** Higgsfield deletes results after about 7 days, and the job list says
so. Copying results to your own storage (R2) is part of the gallery work in Phase 5.

## Cron (hPanel)
Set `CRON_SECRET` to a random string (`openssl rand -base64 24`), then in hPanel → Advanced →
Cron Jobs add a job every 5 minutes running:

```bash
curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/poll-jobs
```

It finishes jobs whose webhook was missed and refunds stuck ones.

## Testing locally
Higgsfield can only send webhooks to a public `https` address. On `http://localhost` the app
skips the webhook and jobs finish through the checks while the page is open, so local testing
works without a tunnel. To test webhooks too, start a tunnel (see `docs/payments.md`) and set
`WEBHOOK_BASE_URL` to its `https://` address.

Automated tests set `FAKE_MEDIA_PROVIDER=1`: a free stand-in that returns placeholder images,
and fails any prompt containing `[fail]`. `/setup` and the tool pages show a warning while it
is on. Never set it on a live site.

## Add a tool
Copy a folder in `src/tools/` (for example `image/`), change `config.ts` (id, name, credits,
model), `run.ts` (validate the form, build the provider request) and `form.tsx`, export it from
the folder's `index.ts`, and add it to `src/tools/registry.ts`. The dashboard, `/tools/<id>`,
the API route, credits and jobs need no changes.
