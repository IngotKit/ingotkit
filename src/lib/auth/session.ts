import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "./server";

/** The signed-in user's session, or null. Server components and route handlers only. */
export async function getSession() {
  // Read the request first. With Cache Components, `next build` prerenders pages; touching
  // request data here makes Next defer this to request time. Checking settings first would
  // let a build made without env bake "signed out" (and a redirect) into the page.
  const requestHeaders = await headers();
  const auth = getAuth();
  if (!auth) return null;
  return auth.api.getSession({ headers: requestHeaders });
}

/** Like getSession, but sends signed-out visitors to /sign-in. */
export async function requireSession(returnTo = "/dashboard") {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return session;
}
