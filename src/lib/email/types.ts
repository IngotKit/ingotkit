export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Anything that can deliver an email. SMTP today; Resend or others can implement it later. */
export interface EmailSender {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email is not configured. Set SMTP_HOST, SMTP_PORT and EMAIL_FROM (see /setup).");
    this.name = "EmailNotConfiguredError";
  }
}
