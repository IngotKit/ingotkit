import { getEnv, isFeatureReady, readEnv } from "@/lib/env";

import { createSmtpSender } from "./smtp";
import { EmailNotConfiguredError, type EmailMessage, type EmailSender } from "./types";

export { EmailNotConfiguredError, type EmailMessage, type EmailSender } from "./types";

/** Development fallback when SMTP is not configured: print the email (and its links) to the terminal. */
const consoleSender: EmailSender = {
  name: "console",
  async send(message) {
    console.info(`\n[email] To: ${message.to}\n[email] Subject: ${message.subject}\n${message.text}\n`);
  },
};

/** The configured sender, or null when email is off (SMTP missing in production). */
export function getEmailSender(): EmailSender | null {
  if (isFeatureReady("email", readEnv())) {
    const env = getEnv();
    return createSmtpSender({
      host: env.SMTP_HOST!,
      port: Number(env.SMTP_PORT),
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.EMAIL_FROM!,
    });
  }
  return process.env.NODE_ENV === "production" ? null : consoleSender;
}

export function isEmailAvailable(): boolean {
  return getEmailSender() !== null;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const sender = getEmailSender();
  if (!sender) throw new EmailNotConfiguredError();
  await sender.send(message);
}
