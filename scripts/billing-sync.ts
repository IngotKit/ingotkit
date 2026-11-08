// `npm run billing:sync`: creates or updates the credit packs and plan in your payment
// provider (Polar or Stripe) so they match site.config.ts. Safe to run again any time.
// Optional argument: the provider name, to sync one that isn't the active one.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

async function main(): Promise<void> {
  const { getBillingProvider, getCatalog, getProviderByName, formatPrice } = await import("../src/lib/billing");
  const requested = process.argv[2];
  const provider = requested ? getProviderByName(requested) : getBillingProvider();
  if (!provider) {
    console.error(
      requested
        ? `"${requested}" is not configured. Check its settings in .env.local (see /setup).`
        : "No payment provider is configured. Add POLAR_ACCESS_TOKEN and POLAR_WEBHOOK_SECRET (or Stripe keys) to .env.local.",
    );
    process.exit(1);
  }

  const items = getCatalog();
  console.log(`Syncing ${items.length} products to ${provider.name}…`);
  const results = await provider.syncProducts(items);
  for (const result of results) {
    const item = items.find((i) => i.id === result.itemId)!;
    const price = `${formatPrice(item)}${item.interval ? "/month" : ""}`;
    console.log(`  ${result.status.padEnd(9)} ${item.id.padEnd(14)} ${price.padEnd(12)} ${item.credits} credits  (${result.externalId})`);
  }
  console.log("Done.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
