"use client";

// Browser-side auth client. Talks to /api/auth on the same origin.
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});
