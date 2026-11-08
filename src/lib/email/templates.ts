// Plain HTML + text emails. Product name comes from site.config.ts.
import { siteConfig } from "@/config/site.config";

import type { EmailMessage } from "./types";

type Template = Omit<EmailMessage, "to">;

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(opts: { heading: string; intro: string; cta: string; url: string; outro: string }): Template {
  const name = siteConfig.name;
  const url = escapeHtml(opts.url);
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f6f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#171717">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
    <p style="margin:0 0 24px;font-weight:600">${escapeHtml(name)}</p>
    <h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(opts.heading)}</h1>
    <p style="margin:0 0 24px;line-height:1.5">${escapeHtml(opts.intro)}</p>
    <a href="${url}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(opts.cta)}</a>
    <p style="margin:24px 0 0;font-size:13px;color:#525252;line-height:1.5">${escapeHtml(opts.outro)}</p>
    <p style="margin:16px 0 0;font-size:12px;color:#737373;word-break:break-all">${url}</p>
  </div>
</body></html>`;
  const text = `${opts.heading}\n\n${opts.intro}\n\n${opts.cta}: ${opts.url}\n\n${opts.outro}\n\n${name}`;
  return { subject: "", html, text };
}

export function verifyEmailTemplate(url: string): Template {
  return {
    ...layout({
      heading: "Confirm your email",
      intro: `Click the button below to confirm your email address and finish creating your ${siteConfig.name} account.`,
      cta: "Confirm email",
      url,
      outro: "If you didn't sign up, you can ignore this email.",
    }),
    subject: `Confirm your email for ${siteConfig.name}`,
  };
}

export function magicLinkTemplate(url: string): Template {
  return {
    ...layout({
      heading: "Your sign-in link",
      intro: "Click the button below to sign in. The link expires in 5 minutes and works once.",
      cta: "Sign in",
      url,
      outro: "If you didn't ask for this link, you can ignore this email.",
    }),
    subject: `Sign in to ${siteConfig.name}`,
  };
}

export function resetPasswordTemplate(url: string): Template {
  return {
    ...layout({
      heading: "Reset your password",
      intro: "Click the button below to choose a new password. The link expires in 1 hour.",
      cta: "Reset password",
      url,
      outro: "If you didn't ask to reset your password, you can ignore this email. Your password stays the same.",
    }),
    subject: `Reset your ${siteConfig.name} password`,
  };
}
