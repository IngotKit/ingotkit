// Runs before every page request (Node.js runtime). Sends visitors to /setup while core
// settings are missing, and signed-out visitors away from protected pages.
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { readEnv } from "@/lib/env";
import { decideRoute } from "@/lib/routing";

export function proxy(request: NextRequest) {
  const decision = decideRoute({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    coreReady: readEnv().coreReady,
    hasSessionCookie: Boolean(getSessionCookie(request)),
    isProduction: process.env.NODE_ENV === "production",
  });

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: skip API routes, Next.js internals and files with an extension.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
