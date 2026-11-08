// Reads emails from the local Mailpit inbox (docker/dev.yml, or the CI service).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:8025";

type MailpitSummary = { ID: string; Subject: string };

/** A unique address per test run, so tests never read each other's mail. */
export function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

/** Random documentation-range IP: gives each test its own rate-limit bucket. */
export function uniqueIp(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 254)}`;
}

/** Waits for the newest email to `to` whose subject contains `subject`, and returns the first link in it. */
export async function waitForEmailLink(to: string, subject: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const query = encodeURIComponent(`to:"${to}" subject:"${subject}"`);

  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
    if (res.ok) {
      const { messages } = (await res.json()) as { messages: MailpitSummary[] };
      if (messages.length > 0) {
        const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`);
        const { Text } = (await message.json()) as { Text: string };
        const link = Text.match(/https?:\/\/\S+/)?.[0];
        if (link) return link;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`No email to ${to} with subject containing "${subject}" within ${timeoutMs} ms`);
}
