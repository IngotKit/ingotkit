import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site.config";
import { escapeHtml, magicLinkTemplate, resetPasswordTemplate, verifyEmailTemplate } from "@/lib/email/templates";

describe("email templates", () => {
  const url = "http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=%2Fdashboard";

  it.each([
    ["verify", verifyEmailTemplate],
    ["magic link", magicLinkTemplate],
    ["reset", resetPasswordTemplate],
  ])("%s email has a subject, the link in text and escaped in HTML", (_name, template) => {
    const email = template(url);
    expect(email.subject).toContain(siteConfig.name);
    expect(email.text).toContain(url);
    expect(email.html).toContain(escapeHtml(url));
    expect(email.html).not.toContain("&callbackURL"); // raw & must be escaped in HTML
  });

  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
