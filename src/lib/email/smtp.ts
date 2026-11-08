// The only file that imports nodemailer.
import nodemailer from "nodemailer";

import type { EmailMessage, EmailSender } from "./types";

export type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  password?: string;
  from: string;
};

export function createSmtpSender(config: SmtpConfig): EmailSender {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 465 is implicit TLS; other ports (587, Mailpit's 1025) upgrade with STARTTLS when offered.
    secure: config.port === 465,
    auth: config.user ? { user: config.user, pass: config.password ?? "" } : undefined,
  });

  return {
    name: "smtp",
    async send(message: EmailMessage) {
      await transport.sendMail({ from: config.from, ...message });
    },
  };
}
