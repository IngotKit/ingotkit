import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth/server";

function notConfigured(): Response {
  return Response.json(
    { error: "Authentication is not configured yet. Open /setup to see what is missing." },
    { status: 503 },
  );
}

export async function GET(request: Request): Promise<Response> {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).GET(request) : notConfigured();
}

export async function POST(request: Request): Promise<Response> {
  const auth = getAuth();
  return auth ? toNextJsHandler(auth).POST(request) : notConfigured();
}
