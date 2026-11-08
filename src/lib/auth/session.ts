import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "./server";

/** The signed-in user's session, or null. Server components and route handlers only. */
export async function getSession() {
  const auth = getAuth();
  if (!auth) return null;
  return auth.api.getSession({ headers: await headers() });
}

/** Like getSession, but sends signed-out visitors to /sign-in. */
export async function requireSession(returnTo = "/dashboard") {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return session;
}
