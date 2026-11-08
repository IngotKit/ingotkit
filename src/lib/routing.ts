// Pure redirect rules used by src/proxy.ts. Kept free of Next.js imports so they are unit-tested.

export type RouteInput = {
  pathname: string;
  search: string;
  coreReady: boolean;
  /** A session cookie is present. Optimistic only: pages still verify the session. */
  hasSessionCookie: boolean;
  isProduction: boolean;
};

export type RouteDecision = { type: "next" } | { type: "redirect"; to: string };

/** Paths that need a signed-in user. */
export const PROTECTED_PREFIXES = ["/dashboard", "/billing"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function decideRoute(input: RouteInput): RouteDecision {
  const { pathname, search, coreReady, hasSessionCookie, isProduction } = input;

  // Missing core settings: everything goes to /setup.
  if (!coreReady) {
    return pathname === "/setup" ? { type: "next" } : { type: "redirect", to: "/setup" };
  }

  // Configured production sites don't expose their setup status.
  if (pathname === "/setup" && isProduction) {
    return { type: "redirect", to: "/" };
  }

  if (!hasSessionCookie && PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    const next = encodeURIComponent(`${pathname}${search}`);
    return { type: "redirect", to: `/sign-in?next=${next}` };
  }

  return { type: "next" };
}

/** Only allow same-site relative paths as post-sign-in destinations. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
