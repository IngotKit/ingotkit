// Used only by `npm run auth:schema` to regenerate src/db/schema/auth.ts from the Better Auth
// config. Builds the auth instance with every feature on so all tables are generated.
// Nothing connects to a database here.
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { createAuth } from "../src/lib/auth/server";

const pool = mysql.createPool({ uri: "mysql://user:pass@127.0.0.1:3306/schema-only" });

export const auth = createAuth({
  db: drizzle({ client: pool, mode: "default" }) as never,
  env: {
    APP_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "schema-generation-only-secret-000000",
    GOOGLE_CLIENT_ID: "x",
    GOOGLE_CLIENT_SECRET: "x",
    GITHUB_CLIENT_ID: "x",
    GITHUB_CLIENT_SECRET: "x",
  },
  emailEnabled: true,
  google: true,
  github: true,
});
